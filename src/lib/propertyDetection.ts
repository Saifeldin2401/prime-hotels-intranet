/**
 * Property Detection Engine V2 (Multi-Signal)
 * 
 * Provides robust identification of hotels using multiple signals:
 * 1. Filename analysis
 * 2. Header/Row content scanning
 * 3. Normalized string matching with fuzzy support
 */

export interface PropertyDetectionResult {
    propertyId: string | null;
    confidence: number; // 0-100
    matchType: 'exact' | 'normalized_exact' | 'fuzzy' | 'filename' | 'context' | 'none';
    matchedName?: string;
}

export interface PropertyMatchSource {
    id: string;
    name: string;
    code?: string; // Optional short code like "ALH" for Al Hamra
}

// Common words to strip for normalization
const NOISE_WORDS = [
    'hotel', 'hotels', 'resort', 'resorts', 'by', 'remal', 'the',
    'jeddah', 'riyadh', 'dammam', 'makkah', 'madinah', 'khobar',
    'daily', 'report', 'sales', 'flash', 'pms', 'occupancy', 'revenue',
    'data', 'export', 'xlsx', 'csv', 'xls'
];

/**
 * Normalizes a string for comparison
 * Example: "REMAL Al Hamra Hotel Jeddah" -> "alhamra"
 */
function normalizeName(name: string): string {
    if (!name) return '';
    let result = name.toLowerCase();
    NOISE_WORDS.forEach(word => {
        result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    return result.replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Extracts potential property names from a filename
 * Example: "Al_Hamra_Daily_Report.xlsx" -> ["al", "hamra", "daily", "report"]
 */
function tokenizeFilename(filename: string): string[] {
    return filename
        .replace(/\.[^/.]+$/, '') // Remove extension
        .split(/[_\-\s]+/)
        .map(t => t.toLowerCase())
        .filter(t => t.length > 1 && !NOISE_WORDS.includes(t));
}

/**
 * Matches a source string against a list of properties
 */
export function detectPropertyByName(
    sourceName: string,
    properties: PropertyMatchSource[]
): PropertyDetectionResult {
    if (!sourceName || properties.length === 0) {
        return { propertyId: null, confidence: 0, matchType: 'none' };
    }

    const source = sourceName.trim();
    const normalizedSource = normalizeName(source);

    // 1. Exact Match
    const exactMatch = properties.find(p => p.name.toLowerCase() === source.toLowerCase());
    if (exactMatch) {
        return { propertyId: exactMatch.id, confidence: 100, matchType: 'exact', matchedName: exactMatch.name };
    }

    // 2. Normalized Exact Match
    const normalizedMatch = properties.find(p => normalizeName(p.name) === normalizedSource);
    if (normalizedMatch) {
        return { propertyId: normalizedMatch.id, confidence: 95, matchType: 'normalized_exact', matchedName: normalizedMatch.name };
    }

    // 3. Fuzzy/Inclusion Match
    let bestMatch: PropertyMatchSource | null = null;
    let highestConfidence = 0;

    for (const property of properties) {
        const pNormalized = normalizeName(property.name);

        // If normalized source contains the normalized property name (or vice versa)
        if (pNormalized.length > 2 && normalizedSource.length > 2) {
            if (normalizedSource.includes(pNormalized)) {
                const confidence = 90;
                if (confidence > highestConfidence) { highestConfidence = confidence; bestMatch = property; }
            } else if (pNormalized.includes(normalizedSource)) {
                const confidence = 85;
                if (confidence > highestConfidence) { highestConfidence = confidence; bestMatch = property; }
            }
        }

        // Check for code match (e.g., "ALH" for Al Hamra)
        if (property.code && source.toLowerCase().includes(property.code.toLowerCase())) {
            const confidence = 92;
            if (confidence > highestConfidence) { highestConfidence = confidence; bestMatch = property; }
        }
    }

    if (bestMatch && highestConfidence > 0) {
        return { propertyId: bestMatch.id, confidence: highestConfidence, matchType: 'fuzzy', matchedName: bestMatch.name };
    }

    return { propertyId: null, confidence: 0, matchType: 'none' };
}

/**
 * Multi-signal contextual detection
 * Scans filename, header rows, and first data rows to find the dominant property.
 */
export function detectPropertyFromContext(
    filename: string,
    headerRows: string[][],
    properties: PropertyMatchSource[]
): PropertyDetectionResult {
    if (properties.length === 0) {
        return { propertyId: null, confidence: 0, matchType: 'none' };
    }

    // 1. Filename Analysis
    const filenameTokens = tokenizeFilename(filename);
    for (const property of properties) {
        const propNormalized = normalizeName(property.name);
        const propTokens = propNormalized.split(/(?=[A-Z])/).map(t => t.toLowerCase());

        // Check if filename contains key property words
        const matchingTokens = filenameTokens.filter(t => propNormalized.includes(t) || propTokens.includes(t));
        if (matchingTokens.length >= 2 || (matchingTokens.length === 1 && matchingTokens[0].length > 4)) {
            return { propertyId: property.id, confidence: 92, matchType: 'filename', matchedName: property.name };
        }
    }

    // 2. Header/Row Content Scan (Deep Scan first 15 rows)
    const scanRows = headerRows.slice(0, 15);
    for (const row of scanRows) {
        const rowText = row.join(' ');
        const detection = detectPropertyByName(rowText, properties);
        if (detection.confidence >= 90) {
            return { ...detection, matchType: 'context' };
        }
    }

    // 3. Lower-confidence header scan
    for (const row of scanRows) {
        const rowText = row.join(' ');
        const detection = detectPropertyByName(rowText, properties);
        if (detection.confidence >= 75) {
            return { ...detection, matchType: 'context' };
        }
    }

    return { propertyId: null, confidence: 0, matchType: 'none' };
}
