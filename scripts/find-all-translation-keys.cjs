const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

// Extract all translation keys from TypeScript/TSX files
function extractKeysFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const keys = new Set();
    
    // Match t('namespace:key') or t("namespace:key") patterns
    const patterns = [
        /t\(['"]([a-z_]+:[a-z_\.]+)['"]/g,
        /t\(['"]([a-z_]+\.[a-z_\.]+)['"]/g,
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            keys.add(match[1]);
        }
    }
    
    return Array.from(keys);
}

// Get all translation keys from a JSON file
function getTranslationKeys(filePath) {
    if (!fs.existsSync(filePath)) return new Set();
    
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
    const keys = new Set();
    
    function traverse(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                traverse(value, fullKey);
            } else {
                keys.add(fullKey);
            }
        }
    }
    
    traverse(content);
    return keys;
}

// Recursively get all TSX/TS files
function getAllTsFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
            getAllTsFiles(fullPath, files);
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
            files.push(fullPath);
        }
    }
    
    return files;
}

console.log('Scanning for translation keys...\n');

// Get all TSX/TS files
const tsFiles = getAllTsFiles(srcDir);
console.log(`Found ${tsFiles.length} TypeScript files`);

// Extract all keys from code
const allCodeKeys = new Set();
for (const file of tsFiles) {
    const keys = extractKeysFromFile(file);
    for (const key of keys) {
        allCodeKeys.add(key);
    }
}

console.log(`Found ${allCodeKeys.size} unique translation keys in code\n`);

// Get all translation files
const enDir = path.join(localesDir, 'en');
const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));

const allTranslationKeys = new Set();
const namespaceKeys = {};

for (const file of enFiles) {
    const namespace = file.replace('.json', '');
    const filePath = path.join(enDir, file);
    const keys = getTranslationKeys(filePath);
    
    namespaceKeys[namespace] = keys;
    
    for (const key of keys) {
        allTranslationKeys.add(`${namespace}:${key}`);
    }
}

console.log(`Found ${allTranslationKeys.size} translation keys in files\n`);

// Find missing keys
const missingKeys = [];
const codeKeyArray = Array.from(allCodeKeys);

for (const codeKey of codeKeyArray) {
    // Check if key exists in translations
    const parts = codeKey.split(':');
    if (parts.length !== 2) continue;
    
    const [namespace, keyPath] = parts;
    
    if (!namespaceKeys[namespace]) {
        missingKeys.push({ key: codeKey, reason: `Namespace '${namespace}' not found` });
        continue;
    }
    
    if (!namespaceKeys[namespace].has(keyPath)) {
        missingKeys.push({ key: codeKey, reason: `Key '${keyPath}' not found in '${namespace}'` });
    }
}

// Group by namespace
const grouped = {};
for (const { key, reason } of missingKeys) {
    const namespace = key.split(':')[0];
    if (!grouped[namespace]) grouped[namespace] = [];
    grouped[namespace].push({ key, reason });
}

console.log('='.repeat(70));
console.log('MISSING TRANSLATION KEYS');
console.log('='.repeat(70));

let totalMissing = 0;
for (const [namespace, keys] of Object.entries(grouped).sort()) {
    console.log(`\n${namespace}.json: ${keys.length} missing keys`);
    keys.slice(0, 10).forEach(k => console.log(`  - ${k.key}`));
    if (keys.length > 10) console.log(`  ... and ${keys.length - 10} more`);
    totalMissing += keys.length;
}

console.log('\n' + '='.repeat(70));
console.log(`Total missing: ${totalMissing} keys`);
console.log('='.repeat(70));

// Save full report
fs.writeFileSync(
    path.join(__dirname, '..', 'tmp', 'missing-translation-keys.json'),
    JSON.stringify(grouped, null, 2),
    'utf8'
);

console.log('\nFull report saved to: tmp/missing-translation-keys.json');
