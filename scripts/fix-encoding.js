
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, '../src/i18n/locales');

function fixEncodingInDir(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            fixEncodingInDir(filePath);
        } else if (file.endsWith('.json')) {
            try {
                let contentBuffer = fs.readFileSync(filePath);

                // Check for UTF-16LE BOM (FF FE)
                if (contentBuffer.length >= 2 && contentBuffer[0] === 0xFF && contentBuffer[1] === 0xFE) {
                    console.log(`Converting UTF-16LE to UTF-8: ${file}`);
                    const contentStr = fs.readFileSync(filePath, 'utf16le');
                    fs.writeFileSync(filePath, contentStr, 'utf8');
                    return;
                }

                // Check for UTF-8 BOM (EF BB BF)
                if (contentBuffer.length >= 3 && contentBuffer[0] === 0xEF && contentBuffer[1] === 0xBB && contentBuffer[2] === 0xBF) {
                    console.log(`Removing UTF-8 BOM: ${file}`);
                    const contentStr = contentBuffer.slice(3).toString('utf8');
                    fs.writeFileSync(filePath, contentStr, 'utf8');
                    return;
                }

                // Force read/write as UTF-8 to standardize
                const str = fs.readFileSync(filePath, 'utf8');
                fs.writeFileSync(filePath, str, 'utf8');
            } catch (e) {
                console.error(`Error processing ${file}:`, e.message);
            }
        }
    });
}

console.log('Fixing encodings...');
fixEncodingInDir(localesDir);
console.log('Done.');
