const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const enDir = path.join(localesDir, 'en');
const arDir = path.join(localesDir, 'ar');

const translations = JSON.parse(fs.readFileSync('arabic_translations.json', 'utf8'));

function getNested(obj, keyPath) {
    return keyPath.split('.').reduce((o, k) => (o || {})[k], obj);
}

function processObj(arObj, enObj, prefix = '') {
    for (const k in arObj) {
        if (typeof arObj[k] === 'object' && arObj[k] !== null && !Array.isArray(arObj[k])) {
            processObj(arObj[k], enObj, `${prefix}${k}.`);
        } else if (typeof arObj[k] === 'string' && /\?{3,}/.test(arObj[k])) {
            const enVal = getNested(enObj, `${prefix}${k}`);
            if (enVal && translations[enVal]) {
                arObj[k] = translations[enVal];
            } else {
                console.log(`Missing translation for: ${enVal}`);
            }
        }
    }
}

const arFiles = fs.readdirSync(arDir).filter(f => f.endsWith('.json'));

for (const file of arFiles) {
    let arText = fs.readFileSync(path.join(arDir, file), 'utf8').replace(/^\uFEFF/, '');
    const arContent = JSON.parse(arText);
    let enContent = {};
    if (fs.existsSync(path.join(enDir, file))) {
        enContent = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8').replace(/^\uFEFF/, ''));
    }

    const originalStr = JSON.stringify(arContent);
    processObj(arContent, enContent);
    const newStr = JSON.stringify(arContent);

    if (originalStr !== newStr) {
        fs.writeFileSync(path.join(arDir, file), JSON.stringify(arContent, null, 4));
        console.log(`Updated ${file}`);
    }
}
