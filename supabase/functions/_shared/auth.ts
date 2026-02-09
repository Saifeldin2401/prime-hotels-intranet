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
