import { useState } from 'react'

export interface ScanResult {
    safe: boolean
    message?: string
}

// Standalone function for use in non-component contexts (e.g. mutation functions)
export async function scanFile(file: File): Promise<ScanResult> {
    // Simulate network delay for scanning
    await new Promise(resolve => setTimeout(resolve, 1500))

    try {
        // 1. Check for EICAR test string or mock malicious names
        if (file.name.toLowerCase().includes('virus') || file.name.toLowerCase().includes('malware') || file.name.toLowerCase().includes('eicar')) {
            return {
                safe: false,
                message: 'Security threat detected: Malicious signature found.'
            }
        }

        // 2. Check for double extensions (e.g. image.jpg.exe)
        if (/\.[a-zA-Z0-9]+\.(exe|bat|cmd|sh|php|pl)$/i.test(file.name)) {
            return {
                safe: false,
                message: 'Security threat detected: Suspicious file extension.'
            }
        }

        // 3. Executable check
        if (file.name.endsWith('.exe') || file.name.endsWith('.dll') || file.name.endsWith('.jar')) {
            return {
                safe: false,
                message: 'Security policy: Executable files are not allowed.'
            }
        }

        return { safe: true }

    } catch (error) {
        console.error('Virus scan error:', error)
        return { safe: false, message: 'Scan failed to complete. Please try again.' }
    }
}

// Hook for UI state management
export function useVirusScan() {
    const [isScanning, setIsScanning] = useState(false)

    const scan = async (file: File): Promise<ScanResult> => {
        setIsScanning(true)
        const result = await scanFile(file)
        setIsScanning(false)
        return result
    }

    return {
        scan,
        isScanning
    }
}
