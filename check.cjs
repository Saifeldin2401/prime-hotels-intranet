const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const enDir = path.join(localesDir, 'en');
const arDir = path.join(localesDir, 'ar');

function getKeys(obj, prefix = '') {
    let keys = [];
    for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            keys = keys.concat(getKeys(obj[k], `${prefix}${k}.`));
        } else {
            keys.push(`${prefix}${k}`);
        }
    }
    return keys;
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));

let missingCount = 0;

for (const file of enFiles) {
    let enText = fs.readFileSync(path.join(enDir, file), 'utf8');
    enText = enText.replace(/^\uFEFF/, '');
    const enContent = JSON.parse(enText);

    let arContent = {};
    if (fs.existsSync(path.join(arDir, file))) {
        let arText = fs.readFileSync(path.join(arDir, file), 'utf8');
        arText = arText.replace(/^\uFEFF/, '');
        arContent = JSON.parse(arText);
    }

    const enKeys = getKeys(enContent);
    const arKeys = getKeys(arContent);

    const arKeysSet = new Set(arKeys);
    const missing = enKeys.filter(k => !arKeysSet.has(k));

    if (missing.length > 0) {
        console.log(`\nFile: ${file} (Missing ${missing.length} keys in Arabic)`);
        missing.slice(0, 5).forEach(m => console.log(`  - ${m}`));
        if (missing.length > 5) console.log(`  - ... and ${missing.length - 5} more`);
        missingCount += missing.length;
    }
}

console.log(`\nTotal missing keys: ${missingCount}`);
