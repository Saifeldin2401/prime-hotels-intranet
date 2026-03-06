const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const enDir = path.join(localesDir, 'en');
const arDir = path.join(localesDir, 'ar');

function getKeys(obj, prefix = '') {
    let keys = [];
    for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
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
    const enContent = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8'));

    let arContent = {};
    try {
        arContent = JSON.parse(fs.readFileSync(path.join(arDir, file), 'utf8'));
    } catch (e) {
        console.log(`Missing file: ar/${file}`);
        continue;
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

    const enKeysSet = new Set(enKeys);
    const extra = arKeys.filter(k => !enKeysSet.has(k));
    if (extra.length > 0) {
        console.log(`\nFile: ${file} (Extra ${extra.length} keys in Arabic)`);
        extra.slice(0, 5).forEach(m => console.log(`  - ${m}`));
        if (extra.length > 5) console.log(`  - ... and ${extra.length - 5} more`);
    }
}

console.log(`\nTotal missing keys: ${missingCount}`);
