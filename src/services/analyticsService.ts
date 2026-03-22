import { supabase } from '@/lib/supabase'
import { type AnalyticsEvent } from '@/types/analytics'

class AnalyticsService {
    private static instance: AnalyticsService
    private buffer: AnalyticsEvent[] = []
    private batchSize = 10
    private maxBufferSize = 500
    private flushInterval = 5000
    private flushTimer: NodeJS.Timeout | null = null
    private sessionId: string | null = null
    private userId: string | null = null
    private sessionPromise: Promise<void> | null = null
    private flushInProgress = false

    private constructor() {
        this.setupFlushTimer()
        this.setupWindowListeners()
        this.setupAuthStateListener()
        this.sessionPromise = this.recoverSession()
    }

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService()
        }
        return AnalyticsService.instance
    }

    private isAuthError(error: unknown) {
        if (!error || typeof error !== 'object') return false
        const candidate = error as { code?: string | number; status?: number }
        const code = String(candidate.code ?? '')
        const status = Number(candidate.status ?? 0)
        return (
            status === 401 ||
            code === '401' ||
            code === '403' ||
            code === '42501' ||
            code === 'PGRST301' ||
            code === 'PGRST302'
        )
    }

    /**
     * Initialize session. Called on app mount.
     */
    private async recoverSession() {
        try {
            const storedSession = localStorage.getItem('prime_analytics_session')
            if (storedSession) {
                const session = JSON.parse(storedSession)
                // Check if session is expired (30 mins inactivity)
                const lastActive = new Date(session.lastActive).getTime()
                const now = new Date().getTime()
                if (now - lastActive < 30 * 60 * 1000) {
                    this.sessionId = session.id
                    // Extend session
                    this.updateSessionActivity()
                    // Verify it exists in DB (async, don't block)
                    this.verifySessionInDb(session.id)
                    return
                }
            }
            // Create new session if none exists or expired
            await this.startNewSession()
        } catch (e) {
            console.error('Failed to recover session', e)
        }
    }

    private async verifySessionInDb(sessionId: string) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const { data, error } = await supabase
            .from('user_sessions')
            .select('id')
            .eq('id', sessionId)
            .limit(1)

        const existingSession = Array.isArray(data) ? data[0] : null

        if (error || !existingSession) {
            // Session in local storage but not in DB or error retrieving? Re-create.
            await this.startNewSession()
        }
    }

    private async startNewSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user

            if (!user) {
                // Cannot start a DB session without an authenticated user due to current RLS policies.
                // We will keep the userId as null and not set a sessionId yet.
                this.userId = null
                this.sessionId = null
                return
            }

            this.userId = user.id

            const { data: insertedRows, error } = await supabase
                .from('user_sessions')
                .insert({
                    user_id: this.userId,
                    user_agent: navigator.userAgent,
                    device_info: {
                        platform: navigator.platform,
                        language: navigator.language,
                        screen: {
                            width: window.screen.width,
                            height: window.screen.height
                        }
                    }
                })
                .select('id')
                .limit(1)

            if (error) {
                // If it's a 401 or 403, it's expected if the session just expired
                if (this.isAuthError(error)) {
                    console.debug('Analytics session creation skipped: Unauthorized')
                    return
                }
                throw error
            }

            const insertedSession = Array.isArray(insertedRows) ? insertedRows[0] : null

            if (!insertedSession?.id) {
                // Avoid throwing 406-style "no rows" noise when the insert returns no row.
                // We can recover on the next analytics event.
                this.sessionId = null
                return
            }

            this.sessionId = insertedSession.id
            this.persistSession()
        } catch (e) {
            console.error('Failed to start analytics session', e)
            this.sessionId = null
        }
    }

    private persistSession() {
        if (!this.sessionId) return
        localStorage.setItem('prime_analytics_session', JSON.stringify({
            id: this.sessionId,
            lastActive: new Date().toISOString()
        }))
    }

    private updateSessionActivity() {
        if (this.sessionId) {
            this.persistSession()
        }
    }

    private setupAuthStateListener() {
        supabase.auth.onAuthStateChange((event, session) => {
            const newUser = session?.user?.id || null

            // If user changed or logged out
            if (newUser !== this.userId) {
                console.debug('[Analytics] Auth state changed:', event, newUser)
                this.userId = newUser

                // If we have a session, update it. If not, start one.
                if (newUser) {
                    void this.identify(newUser).catch((error) => {
                        console.warn('[Analytics] Failed to identify user after auth change:', error)
                    })
                } else {
                    // Logged out: end current session
                    this.sessionId = null
                    localStorage.removeItem('prime_analytics_session')
                }
            }
        })
    }

    /**
     * Identify user (e.g. after login)
     */
    public async identify(userId: string) {
        this.userId = userId

        // Wait for any pending session init
        if (this.sessionPromise) {
            await this.sessionPromise
        }

        if (this.sessionId) {
            await supabase
                .from('user_sessions')
                .update({ user_id: userId })
                .eq('id', this.sessionId)
        } else {
            await this.startNewSession()
        }
    }

    /**
     * Track an event
     */
    public track(eventName: string, properties = {}, category = 'engagement') {
        // Don't buffer events when there's no authenticated user - they can never be flushed
        if (!this.userId && !this.sessionId) return

        const event: AnalyticsEvent = {
            event_name: eventName,
            category,
            properties,
            user_id: this.userId,
            session_id: null as any, // Late binding in flush
            timestamp: new Date().toISOString(),
            metadata: {
                url: window.location.pathname
            }
        }

        this.buffer.push(event)
        if (this.buffer.length > this.maxBufferSize) {
            this.buffer = this.buffer.slice(this.buffer.length - this.maxBufferSize)
        }

        if (this.buffer.length >= this.batchSize) {
            this.flush()
        }

        this.updateSessionActivity()
    }

    /**
     * Flush buffer to Supabase
     */
    private async flush() {
        if (this.buffer.length === 0 || this.flushInProgress || (!this.userId && !this.sessionId)) return
        this.flushInProgress = true

        try {
            // Make sure session is ready
            if (this.sessionPromise) {
                await this.sessionPromise
            }

            // If still no session (e.g. DB error), try one more time
            if (!this.sessionId) {
                await this.startNewSession()
                if (!this.sessionId) {
                    // Still failing? Keep events in buffer and retry later.
                    console.warn('Cannot flush analytics: No valid session ID')
                    return
                }
            }

            const currentBuffer = [...this.buffer]
            const eventsToSend = currentBuffer.map(e => ({
                ...e,
                session_id: this.sessionId,
                user_id: this.userId || e.user_id
            }))

            const { error } = await supabase
                .from('analytics_events')
                .insert(eventsToSend)

            if (error) {
                console.error('Failed to flush analytics events', error)

                // Handle 401/403: session expired or unauthorized
                if (this.isAuthError(error)) {
                    console.warn('[Analytics] Unauthorized flush. Clearing stale session.')
                    this.sessionId = null
                    this.userId = null
                    this.buffer = []
                    localStorage.removeItem('prime_analytics_session')
                    // Session will be re-created on next track()
                }
                return
            }

            // Success: remove only the events we just sent
            if (this.buffer.length >= currentBuffer.length) {
                this.buffer = this.buffer.slice(currentBuffer.length)
            } else {
                this.buffer = []
            }
        } catch (e) {
            console.error('Analytics flush error', e)
        } finally {
            this.flushInProgress = false
        }
    }

    private setupFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flush()
        }, this.flushInterval)
    }

    private setupWindowListeners() {
        // Flush on close
        window.addEventListener('beforeunload', () => {
            if (this.buffer.length > 0 && this.sessionId) {
                const events = this.buffer.map(e => ({
                    ...e,
                    session_id: this.sessionId,
                    user_id: this.userId || e.user_id
                }))

                // Use beacon if available for reliable send on unload
                if (navigator.sendBeacon) {
                    new Blob([JSON.stringify(events)], { type: 'application/json' })
                    // Supabase doesn't support raw JSON beacon easily without edge function, 
                    // but we can try calling the edge function if we had one.
                    // Accessing REST API via beacon is tricky with headers.
                    // Fallback to sync fetch or just standard async flush (best effort).
                    this.flush()
                } else {
                    this.flush()
                }
            }
        })

        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flush()
            } else if (document.visibilityState === 'visible' && !this.sessionId) {
                // Recreate analytics session after tab resume if auth session is still valid.
                this.startNewSession()
            }
        })
    }
}

export const analytics = AnalyticsService.getInstance()
