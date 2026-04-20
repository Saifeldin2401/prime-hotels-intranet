import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}))

import { scanFile } from './useVirusScan'

describe('scanFile', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    Object.defineProperty(Blob.prototype, 'arrayBuffer', {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
    })
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
      },
    })
  })

  it('blocks executable extensions before calling the remote scanner', async () => {
    const file = new File(['test'], 'payload.exe', { type: 'application/octet-stream' })

    const result = await scanFile(file)

    expect(result.safe).toBe(false)
    expect(result.status).toBe('infected')
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('returns the remote scan verdict when the scanner succeeds', async () => {
    invokeMock.mockResolvedValue({
      data: {
        safe: true,
        status: 'clean',
        risk_score: 0,
        reasons: [],
        message: 'Clean',
        scan_id: 'scan-1',
      },
      error: null,
    })

    const file = new File(['safe'], 'report.csv', { type: 'text/csv' })
    const result = await scanFile(file)

    expect(result.safe).toBe(true)
    expect(result.status).toBe('clean')
    expect(result.scanId).toBe('scan-1')
  })

  it('fails closed when the remote scanner is unavailable', async () => {
    invokeMock.mockRejectedValue(new Error('scanner offline'))

    const file = new File(['safe'], 'report.csv', { type: 'text/csv' })
    const result = await scanFile(file)

    expect(result.safe).toBe(false)
    expect(result.status).toBe('error')
    expect(result.message).toContain('security scanner is unavailable')
  })
})
