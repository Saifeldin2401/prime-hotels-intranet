
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, '../src/i18n/locales');
const enDir = path.join(localesDir, 'en');
const arDir = path.join(localesDir, 'ar');

if (!fs.existsSync(enDir)) {
    console.error(`EN directory not found: ${enDir}`);
    process.exit(1);
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));

let totalMissing = 0;

console.log('--- Checking Translations ---');

enFiles.forEach(file => {
    const enPath = path.join(enDir, file);
    const arPath = path.join(arDir, file);

    const enContent = safeReadJson(enPath);
    let arContent = {};

    if (fs.existsSync(arPath)) {
        arContent = safeReadJson(arPath);
    } else {
        console.log(`[MISSING FILE] ${file} does not exist in Arabic.`);
    }

    if (!enContent) return; // Skip if EN file failed to parse

    const missingKeys = getMissingKeys(enContent, arContent);

    if (missingKeys.length > 0) {
        console.log(`\n[${file}] Missing ${missingKeys.length} keys:`);
        missingKeys.forEach(key => console.log(`  - ${key}`));
        totalMissing += missingKeys.length;
    }
});

console.log(`\nTotal missing keys: ${totalMissing}`);

function getMissingKeys(obj1, obj2, prefix = '') {
    let missing = [];
    for (const key in obj1) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (!obj2 || !obj2.hasOwnProperty(key)) {
            missing.push(fullKey);
        } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
            missing = missing.concat(getMissingKeys(obj1[key], obj2[key], fullKey));
        }
    }
    return missing;
}

function safeReadJson(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        // Remove BOM if present
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }
        // Remove potentially malformed chars at start if any (brute force for the error we saw)
        if (content.startsWith('')) {
            // This looks like UTF-16 LE BOM or similar garbage. 
            // But fs.readFileSync with utf8 should interpret it. 
            // If it's saved as UTF-16, reading as UTF-8 produces garbage.
            // Let's try to just find the first '{'
            const firstBrace = content.indexOf('{');
            if (firstBrace >= 0) {
                content = content.substring(firstBrace);
            }
        }

        return JSON.parse(content);
    } catch (e) {
        console.error(`Error parsing ${path.basename(filePath)}:`, e.message);
        return null;
    }
}
