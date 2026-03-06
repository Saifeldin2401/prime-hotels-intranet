const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const arDir = path.join(localesDir, 'ar');

function getKeyValuePairs(obj, prefix = '') {
    let pairs = [];
    for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            pairs = pairs.concat(getKeyValuePairs(obj[k], `${prefix}${k}.`));
        } else {
            pairs.push({ key: `${prefix}${k}`, value: obj[k] });
        }
    }
    return pairs;
}

const arFiles = fs.readdirSync(arDir).filter(f => f.endsWith('.json'));

let brokenCount = 0;

for (const file of arFiles) {
    let arText = fs.readFileSync(path.join(arDir, file), 'utf8');
    arText = arText.replace(/^\uFEFF/, '');
    const arContent = JSON.parse(arText);

    const arPairs = getKeyValuePairs(arContent);

    const untranslated = arPairs.filter(p => typeof p.value === 'string' && /\?{3,}/.test(p.value));

    if (untranslated.length > 0) {
        console.log(`\nFile: ${file} (Contains ${untranslated.length} broken strings)`);
        untranslated.forEach(m => console.log(`  - ${m.key}: "${m.value}"`));
        brokenCount += untranslated.length;
    }
}

console.log(`\nTotal broken strings: ${brokenCount}`);
