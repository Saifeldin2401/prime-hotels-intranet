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
function getNested(obj, keyPath) {
    return keyPath.split('.').reduce((o, k) => (o || {})[k], obj);
}
let enValues = {};
for (const file of fs.readdirSync(arDir)) {
    if (!file.endsWith('.json')) continue;
    let arText = fs.readFileSync(path.join(arDir, file), 'utf8').replace(/^\uFEFF/, '');
    const arContent = JSON.parse(arText);
    let enContent = {};
    if (fs.existsSync(path.join(enDir, file))) {
        enContent = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8').replace(/^\uFEFF/, ''));
    }
    const untranslated = getKeyValuePairs(arContent).filter(p => typeof p.value === 'string' && /\?{3,}/.test(p.value));
    untranslated.forEach(m => {
        let enVal = getNested(enContent, m.key);
        if (enVal) enValues[enVal] = "";
    });
}
fs.writeFileSync('english_to_translate.json', JSON.stringify(enValues, null, 2));
console.log('Saved to english_to_translate.json');
