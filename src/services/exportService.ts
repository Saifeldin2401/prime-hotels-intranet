import { supabase } from '@/lib/supabase'

function escapeCSVValue(value: unknown): string {
  const str = value === null || value === undefined
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value)
  // Quote if the value contains a comma, quote, or newline; double up embedded quotes.
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export const exportService = {
  /**
   * Converts an array of objects into a clean CSV string.
   * Prepends a UTF-8 BOM so Excel renders Arabic/accented text correctly.
   */
  convertToCSV(data: Record<string, any>[], headers?: { key: string; label: string }[]): string {
    if (!data.length) return ''

    const keys = headers ? headers.map((h) => h.key) : Object.keys(data[0])
    const labels = headers ? headers.map((h) => h.label) : keys

    const headerRow = labels.map((l) => escapeCSVValue(l)).join(',')
    const rows = data.map((row) => keys.map((k) => escapeCSVValue(row[k])).join(','))

    return '﻿' + [headerRow, ...rows].join('\r\n')
  },

  /**
   * Triggers a browser download of a generated file
   */
  downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  /**
   * Exports full organization archive for compliance and tenant offboarding
   */
  async exportOrganizationArchive(organizationId: string): Promise<any> {
    const { data, error } = await (supabase.rpc as any)('export_organization_archive', {
      p_org_id: organizationId
    })

    if (error) throw error
    return data
  }
}
