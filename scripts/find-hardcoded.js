import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function findHardcoded() {
    let count = 0;
    const output = [];
    walkDir(path.join(process.cwd(), 'src'), function (filePath) {
        if (!filePath.endsWith('.tsx')) return;

        const content = fs.readFileSync(filePath, 'utf8');
        const regex = />s*([^<{]+[A-Za-z][^<]*)s*<\//g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const text = match[1].trim();
            if (text.length > 2 && /[a-zA-Z]/.test(text) && !text.includes('eslint') && !text.includes('prettier')) {
                output.push(`Found in ${filePath.split('\\src\\')[1] || filePath}:\n  "${text}"`);
                count++;
            }
        }
    });
    output.push(`Total potential hardcoded strings: ${count}`);
    fs.writeFileSync('hardcoded-report.txt', output.join('\n'));
}

findHardcoded();
