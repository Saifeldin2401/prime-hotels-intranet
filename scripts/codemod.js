import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
    skipAddingFilesFromTsConfig: true
});

const targetDirs = [
    path.join(process.cwd(), 'src', 'components'),
    path.join(process.cwd(), 'src', 'pages'),
];

targetDirs.forEach(dir => {
    project.addSourceFilesAtPaths(`${dir}/**/*.tsx`);
});

let modifiedFilesCount = 0;
let modifiedStringsCount = 0;
const extractedStrings = {};

function toCamelCaseKey(str) {
    let key = str
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
        .substring(0, 40);

    if (!key) return null;

    // Handle collisions
    if (extractedStrings[key] && extractedStrings[key] !== str) {
        let i = 1;
        while (extractedStrings[`${key}_${i}`] && extractedStrings[`${key}_${i}`] !== str) {
            i++;
        }
        key = `${key}_${i}`;
    }
    return key;
}

for (const sourceFile of project.getSourceFiles()) {
    if (sourceFile.getFilePath().includes('/components/ui/')) continue;
    if (sourceFile.getFilePath().includes('/components/icons/')) continue;

    let hasModifications = false;
    let nodesToReplace = [];
    let attrsToReplace = [];

    const jsxTextNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
    for (const node of jsxTextNodes) {
        const text = node.getLiteralText().replace(/\s+/g, ' ').trim();
        if (text.length > 2 && /[a-zA-Z]/.test(text) && !text.includes('eslint-')) {
            nodesToReplace.push({ node, text });
        }
    }

    const jsxAttributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
    const targetAttrs = ['placeholder', 'title', 'label', 'description'];
    for (const attr of jsxAttributes) {
        if (targetAttrs.includes(attr.getNameNode().getText())) {
            const init = attr.getInitializer();
            if (init && init.getKind() === SyntaxKind.StringLiteral) {
                const text = init.getLiteralText().replace(/\s+/g, ' ').trim();
                if (text.length > 2 && /[a-zA-Z]/.test(text)) {
                    attrsToReplace.push({ attr, init, text });
                }
            }
        }
    }

    if (nodesToReplace.length === 0 && attrsToReplace.length === 0) continue;

    const imports = sourceFile.getImportDeclarations();
    const i18nImport = imports.find(i => i.getModuleSpecifierValue() === 'react-i18next');
    let hasUseTranslation = false;
    let hookName = 't_ext';

    if (!i18nImport) {
        sourceFile.addImportDeclaration({
            namedImports: ['useTranslation'],
            moduleSpecifier: 'react-i18next'
        });
    }

    const componentFuncs = [
        ...sourceFile.getFunctions(),
        ...(sourceFile.getVariableDeclarations()?.filter(v => v.getInitializerIfKind(SyntaxKind.ArrowFunction)) || [])
    ];

    for (const comp of componentFuncs) {
        try {
            const body = comp.getBody ? comp.getBody() : (comp.getInitializer && typeof comp.getInitializer === 'function' ? comp.getInitializer().getBody() : null);
            if (body && body.getKind() === SyntaxKind.Block) {
                const bodyText = body.getText();
                if ((bodyText.includes('return <') || bodyText.includes('return (<'))) {
                    if (!bodyText.includes('t_ext')) {
                        body.insertStatements(0, `const { t: ${hookName} } = useTranslation('extracted');`);
                    }
                    hasModifications = true;
                }
            }
        } catch (e) { }
    }

    if (!hasModifications && nodesToReplace.length > 0) continue;

    for (const { node, text } of nodesToReplace) {
        const keyName = toCamelCaseKey(text);
        if (keyName) {
            extractedStrings[keyName] = text;
            try {
                node.replaceWithText(`{${hookName}('${keyName}', '${text.replace(/[\\']/g, '\\$&')}')}`);
                modifiedStringsCount++;
            } catch (e) { }
        }
    }

    for (const { attr, init, text } of attrsToReplace) {
        const keyName = toCamelCaseKey(text);
        if (keyName) {
            extractedStrings[keyName] = text;
            try {
                attr.setInitializer(`{${hookName}('${keyName}', '${text.replace(/[\\']/g, '\\$&')}')}`);
                modifiedStringsCount++;
            } catch (e) { }
        }
    }

    if (hasModifications) {
        modifiedFilesCount++;
        console.log(`Modified: ${sourceFile.getBaseName()}`);
    }
}

project.saveSync();

const localesDir = path.join(process.cwd(), 'src', 'i18n', 'locales');
fs.writeFileSync(path.join(localesDir, 'en', 'extracted.json'), JSON.stringify(extractedStrings, null, 4));
fs.writeFileSync(path.join(localesDir, 'ar', 'extracted.json'), JSON.stringify(extractedStrings, null, 4));

console.log(`Codemod applied to ${modifiedFilesCount} files. Extracted ${modifiedStringsCount} strings.`);
