import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export interface ScanResult {
    safe: boolean
    status?: 'clean' | 'suspicious' | 'infected' | 'error'
    riskScore?: number
    scanId?: string | null
    reasons?: string[]
    message?: string
    hashSha256?: string
}

export interface ScanOptions {
    bucket?: string
    storagePath?: string
    context?: string
}

const SAMPLE_BYTES = 256 * 1024
const SERVER_SCAN_TIMEOUT_MS = 12000

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    let timeoutId: number | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    })

    try {
        return await Promise.race([promise, timeoutPromise]) as T
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId)
        }
    }
}

const BLOCKED_EXTENSIONS = new Set([
    'exe',
    'dll',
    'bat',
    'cmd',
    'msi',
    'ps1',
    'vbs',
    'js',
    'jar',
    'scr',
    'com',
    'sh',
    'php',
    'pl'
])

async function fileToBase64(file: File, maxBytes = SAMPLE_BYTES): Promise<string> {
    const slice = file.slice(0, maxBytes)
    const buffer = await slice.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}

async function hashFileSha256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(digest))
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function runLocalHeuristics(file: File): ScanResult {
    const lowerName = file.name.toLowerCase()
    const extension = lowerName.split('.').pop() || ''

    if (lowerName.includes('virus') || lowerName.includes('malware') || lowerName.includes('eicar')) {
        return {
            safe: false,
            status: 'infected',
            riskScore: 100,
            reasons: ['Malicious naming pattern detected.'],
            message: 'Security threat detected: Malicious signature found.'
        }
    }

    if (/\.[a-z0-9]+\.(exe|bat|cmd|sh|php|pl)$/i.test(lowerName)) {
        return {
            safe: false,
            status: 'infected',
            riskScore: 95,
            reasons: ['Suspicious double extension detected.'],
            message: 'Security threat detected: Suspicious file extension.'
        }
    }

    if (BLOCKED_EXTENSIONS.has(extension)) {
        return {
            safe: false,
            status: 'infected',
            riskScore: 100,
            reasons: [`Blocked executable extension: .${extension}`],
            message: 'Security policy: Executable files are not allowed.'
        }
    }

    return {
        safe: true,
        status: 'clean',
        riskScore: 0,
        reasons: [],
    }
}

async function runServerScan(file: File, options?: ScanOptions): Promise<ScanResult | null> {
    try {
        const [sampleBase64, fileHash] = await Promise.all([
            fileToBase64(file),
            hashFileSha256(file),
        ])

        const invokePromise = supabase.functions.invoke('scan-file', {
            body: {
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                file_hash_sha256: fileHash,
                sample_base64: sampleBase64,
                storage_bucket: options?.bucket || null,
                storage_path: options?.storagePath || null,
                context: options?.context || null,
            }
        })

        const { data, error } = await withTimeout(
            invokePromise,
            SERVER_SCAN_TIMEOUT_MS,
            `scan-file timed out after ${Math.floor(SERVER_SCAN_TIMEOUT_MS / 1000)}s`
        )

        if (error || !data) {
            return null
        }

        return {
            safe: Boolean(data.safe),
            status: data.status || (data.safe ? 'clean' : 'suspicious'),
            riskScore: typeof data.risk_score === 'number' ? data.risk_score : undefined,
            scanId: data.scan_id || null,
            reasons: Array.isArray(data.reasons) ? data.reasons : [],
            message: data.message || undefined,
            hashSha256: fileHash
        }
    } catch (_error) {
        return null
    }
}

// Standalone function for use in non-component contexts (e.g. mutation functions)
export async function scanFile(file: File, options?: ScanOptions): Promise<ScanResult> {
    try {
        const localResult = runLocalHeuristics(file)
        if (!localResult.safe) {
            return localResult
        }

        const serverResult = await runServerScan(file, options)
        if (serverResult) {
            return serverResult
        }

        return {
            ...localResult,
            message: 'File passed local security checks.'
        }

    } catch (error) {
        console.error('Virus scan error:', error)
        return { safe: false, status: 'error', riskScore: 100, message: 'Scan failed to complete. Please try again.' }
    }
}

// Hook for UI state management
export function useVirusScan() {
    const [isScanning, setIsScanning] = useState(false)

    const scan = async (file: File, options?: ScanOptions): Promise<ScanResult> => {
        setIsScanning(true)
        const result = await scanFile(file, options)
        setIsScanning(false)
        return result
    }

    return {
        scan,
        isScanning
    }
}
