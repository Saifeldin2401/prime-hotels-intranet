import fs from 'fs';
import path from 'path';

const localesDir = path.join(process.cwd(), 'src', 'i18n', 'locales');
const enDir = path.join(localesDir, 'en');
const arDir = path.join(localesDir, 'ar');

function getKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(getKeys(obj[key], `${prefix}${key}.`));
        } else {
            keys.push(`${prefix}${key}`);
        }
    }
    return keys;
}

function checkMissing() {
    const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
    let totalMissing = 0;

    for (const file of files) {
        const enPath = path.join(enDir, file);
        const arPath = path.join(arDir, file);

        const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        const enKeys = getKeys(enData);

        if (!fs.existsSync(arPath)) {
            console.log(`Missing file: ar/${file} (${enKeys.length} keys missing)`);
            totalMissing += enKeys.length;
            continue;
        }

        const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));
        const arKeys = new Set(getKeys(arData));

        const missingKeys = enKeys.filter(k => !arKeys.has(k));

        if (missingKeys.length > 0) {
            console.log(`\nFile: ${file}`);
            console.log(`Missing ${missingKeys.length} keys in Arabic translation:`);
            missingKeys.forEach(k => console.log(`  - ${k}`));
            totalMissing += missingKeys.length;
        }
    }

    console.log(`\nTotal missing translation keys: ${totalMissing}`);
}

checkMissing();
