const INVALID_LINK_CODE_PATTERNS = [
  'otp',
  'token',
  'expired',
  'invalid',
  'flow_state',
  'access_denied',
]

const INVALID_LINK_MESSAGE_PATTERNS = [
  /token/i,
  /otp/i,
  /expired/i,
  /one-time/i,
  /invalid/i,
  /email link/i,
  /recovery link/i,
  /flow state/i,
  /session.*missing/i,
]

const SERVICE_UNAVAILABLE_MESSAGE_PATTERNS = [
  /timeout/i,
  /timed out/i,
  /network/i,
  /offline/i,
  /failed to fetch/i,
  /load failed/i,
  /service unavailable/i,
  /upstream/i,
  /gateway/i,
  /temporarily unavailable/i,
]

export const AUTH_LINK_TIMEOUT_MS = 10_000
export const AUTH_SERVICE_UNAVAILABLE_MESSAGE =
  'The authentication service is temporarily unavailable. Please try again.'

export type AuthLinkErrorKind = 'invalid_link' | 'service_unavailable' | 'unknown'

export interface ClassifiedAuthLinkError {
  kind: AuthLinkErrorKind
  message: string
  status: number | null
  code: string | null
}

export function getAuthLinkErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown }).message
    if (typeof maybeMessage === 'string') return maybeMessage
  }
  return ''
}

export function withAuthLinkTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = AUTH_LINK_TIMEOUT_MS
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timeout`))
    }, timeoutMs)

    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

export function classifyAuthLinkError(error: unknown): ClassifiedAuthLinkError {
  const rawMessage = getAuthLinkErrorMessage(error).trim()
  const message = rawMessage || 'Unknown authentication error'
  const status =
    error && typeof error === 'object'
      ? Number((error as { status?: number | string }).status ?? 0) || null
      : null
  const rawCode =
    error && typeof error === 'object'
      ? (error as { code?: string | number }).code
      : null
  const code = rawCode == null ? null : String(rawCode).toLowerCase()
  const loweredMessage = message.toLowerCase()

  if (status !== null && (status === 0 || status >= 500)) {
    return { kind: 'service_unavailable', message, status, code }
  }

  if (SERVICE_UNAVAILABLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
    return { kind: 'service_unavailable', message, status, code }
  }

  if (code && INVALID_LINK_CODE_PATTERNS.some((pattern) => code.includes(pattern))) {
    return { kind: 'invalid_link', message, status, code }
  }

  if (INVALID_LINK_MESSAGE_PATTERNS.some((pattern) => pattern.test(loweredMessage))) {
    return { kind: 'invalid_link', message, status, code }
  }

  return { kind: 'unknown', message, status, code }
}

export function isServiceUnavailableAuthLinkError(error: unknown): boolean {
  return classifyAuthLinkError(error).kind === 'service_unavailable'
}
