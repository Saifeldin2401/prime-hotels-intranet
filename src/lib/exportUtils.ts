export function exportToCSV(data: any[], filename: string) {
    if (!data || !data.length) {
        console.warn('No data to export');
        return;
    }

    // Get headers from first object keys
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(fieldName => {
                // Handle values that might need escaping (strings with commas/quotes)
                let value = row[fieldName];

                if (value === null || value === undefined) {
                    return '';
                }

                // Convert to string and escape quotes
                const stringValue = String(value).replace(/"/g, '""');

                // Wrap in quotes if contains comma, quote, or newline
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue}"`;
                }

                return stringValue;
            }).join(',')
        )
    ].join('\n');

    // Create downloadable blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create link and trigger download
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
