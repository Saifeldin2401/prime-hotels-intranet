import { describe, expect, it } from 'vitest'
import { escapeSearchQuery } from './utils'

describe('escapeSearchQuery', () => {
  it('should return the same string if no special characters are present', () => {
    const input = 'hello world'
    expect(escapeSearchQuery(input)).toBe('hello world')
  })

  it('should escape % characters', () => {
    const input = '100%'
    expect(escapeSearchQuery(input)).toBe('100\\%')
  })

  it('should escape _ characters', () => {
    const input = 'user_name'
    expect(escapeSearchQuery(input)).toBe('user\\_name')
  })

  it('should escape \\ characters', () => {
    const input = 'C:\\Windows'
    expect(escapeSearchQuery(input)).toBe('C:\\\\Windows')
  })

  it('should escape all special characters in a mixed string', () => {
    const input = '100%_safe\\guaranteed'
    // Expected: 100\% \_safe \\guaranteed
    expect(escapeSearchQuery(input)).toBe('100\\%\\_safe\\\\guaranteed')
  })

  it('should handle empty strings', () => {
    const input = ''
    expect(escapeSearchQuery(input)).toBe('')
  })

  it('should handle strings with only special characters', () => {
    const input = '%_\\'
    expect(escapeSearchQuery(input)).toBe('\\%\\_\\\\')
  })
})
