import ExcelJS from 'exceljs'

type ExportRow = Record<string, string | number | boolean | null | undefined>

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function parseExcelRows(file: File): Promise<string[][]> {
    const workbook = new ExcelJS.Workbook()
    const buffer = await file.arrayBuffer()
    await workbook.xlsx.load(buffer)

    let bestSheet: ExcelJS.Worksheet | undefined
    let maxRows = -1

    for (const worksheet of workbook.worksheets) {
        const rowCount = worksheet.actualRowCount || worksheet.rowCount
        if (rowCount > maxRows) {
            maxRows = rowCount
            bestSheet = worksheet
        }
    }

    if (!bestSheet) return []

    const rows: string[][] = []
    bestSheet.eachRow({ includeEmpty: false }, (row) => {
        const rowValues: string[] = []
        for (let col = 1; col <= row.cellCount; col += 1) {
            rowValues.push((row.getCell(col).text || '').trim())
        }
        if (rowValues.some((cell) => cell !== '')) {
            rows.push(rowValues)
        }
    })

    return rows
}

export async function exportRowsToXlsx(
    rows: ExportRow[],
    filename: string,
    sheetName = 'Sheet1'
) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(sheetName)

    if (rows.length > 0) {
        const headers = Object.keys(rows[0])
        worksheet.columns = headers.map((header) => ({
            header,
            key: header,
            width: Math.max(16, header.length + 2)
        }))
        rows.forEach((row) => worksheet.addRow(row))
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: XLSX_MIME })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
}

