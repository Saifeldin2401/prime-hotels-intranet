import { supabase } from '@/lib/supabase'
import { AnalyticsEvents, type AnalyticsEvent, type UserSession } from '@/types/analytics'

class AnalyticsService {
    private static instance: AnalyticsService
    private buffer: AnalyticsEvent[] = []
    private batchSize = 10
    private flushInterval = 5000
    private flushTimer: NodeJS.Timeout | null = null
    private sessionId: string | null = null
    private userId: string | null = null
    private sessionPromise: Promise<void> | null = null

    private constructor() {
        this.setupFlushTimer()
        this.setupWindowListeners()
        this.sessionPromise = this.recoverSession()
    }

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService()
        }
        return AnalyticsService.instance
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
        const { data } = await supabase
            .from('user_sessions')
            .select('id')
            .eq('id', sessionId)
            .single()

        if (!data) {
            // Session in local storage but not in DB? Re-create.
            await this.startNewSession()
        }
    }

    private async startNewSession() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            this.userId = user?.id || null

            const { data, error } = await supabase
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
                .select()
                .single()

            if (error) throw error

            this.sessionId = data.id
            this.persistSession()
        } catch (e) {
            console.error('Failed to start analytics session', e)
            // If DB write fails, we CANNOT send events that require a foreign key.
            // We will NOT set a sessionId, so flush() will try to create one next time.
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
    public track(eventName: string, properties: Record<string, any> = {}, category = 'engagement') {
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

        if (this.buffer.length >= this.batchSize) {
            this.flush()
        }

        this.updateSessionActivity()
    }

    /**
     * Flush buffer to Supabase
     */
    private async flush() {
        if (this.buffer.length === 0) return

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

        const eventsToSend = this.buffer.map(e => ({
            ...e,
            session_id: this.sessionId,
            user_id: this.userId || e.user_id // Ensure latest user_id
        }))

        this.buffer = []

        try {
            const { error } = await supabase
                .from('analytics_events')
                .insert(eventsToSend)

            if (error) {
                console.error('Failed to flush analytics events', error)
                // Put back in buffer? Or just log error. 
                // For now, let's just log to avoid infinite loops if it's a data issue.
            }
        } catch (e) {
            console.error('Analytics flush error', e)
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
            this.flush()
        })

        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flush()
            }
        })
    }
}

export const analytics = AnalyticsService.getInstance()
