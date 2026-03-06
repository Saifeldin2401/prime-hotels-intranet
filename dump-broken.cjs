const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const enDir = path.join(localesDir, 'en');
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

let out = '';

for (const file of arFiles) {
    let arText = fs.readFileSync(path.join(arDir, file), 'utf8');
    arText = arText.replace(/^\uFEFF/, '');
    const arContent = JSON.parse(arText);
    const arPairs = getKeyValuePairs(arContent);

    let enContent = {};
    if (fs.existsSync(path.join(enDir, file))) {
        let enText = fs.readFileSync(path.join(enDir, file), 'utf8');
        enText = enText.replace(/^\uFEFF/, '');
        enContent = JSON.parse(enText);
    }

    function getNested(obj, keyPath) {
        return keyPath.split('.').reduce((o, k) => (o || {})[k], obj);
    }

    const untranslated = arPairs.filter(p => typeof p.value === 'string' && /\?{3,}/.test(p.value));

    if (untranslated.length > 0) {
        out += `\n--- ${file} ---\n`;
        untranslated.forEach(m => {
            const enVal = getNested(enContent, m.key);
            out += `KEY: ${m.key}\nEN : ${enVal}\nAR : ${m.value}\n\n`;
        });
    }
}

fs.writeFileSync('broken_arabic.txt', out);
console.log('Wrote to broken_arabic.txt');
