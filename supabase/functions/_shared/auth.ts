/**
 * Timing-safe authorization check for internal cron/service-role calls.
 * Prevents timing attacks on service role key comparison.
 */
export function isAuthorizedServiceRole(authHeader: string | null, serviceRoleKey: string): boolean {
  const expected = `Bearer ${serviceRoleKey}`
  const actual = authHeader ?? ''

  if (actual.length !== expected.length) {
    return false
  }

  const encoder = new TextEncoder()
  const a = encoder.encode(actual)
  const b = encoder.encode(expected)

  // Use constant-time comparison
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }

  return result === 0
}

/**
 * Accept either service role key or a shared internal secret.
 * The shared secret should be provided via AI_CRON_SECRET env var.
 */
export function isAuthorizedInternal(authHeader: string | null, serviceRoleKey: string, internalSecret?: string | null): boolean {
  const actual = authHeader ?? ''
  const candidates = [serviceRoleKey, internalSecret].filter(Boolean) as string[]
  if (candidates.length === 0) return false

  for (const candidate of candidates) {
    const expected = `Bearer ${candidate}`
    if (actual.length !== expected.length) {
      continue
    }

    const encoder = new TextEncoder()
    const a = encoder.encode(actual)
    const b = encoder.encode(expected)

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i]
    }

    if (result === 0) return true
  }

  return false
}

type JwtPayload = {
  role?: string
}

const decodeBase64Url = (value: string) =>
  atob(value.replace(/-/g, '+').replace(/_/g, '/'))

export function getServiceRoleToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : authHeader.trim()
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as JwtPayload
    if (payload?.role === 'service_role') {
      return token
    }
  } catch {
    return null
  }
  return null
}
