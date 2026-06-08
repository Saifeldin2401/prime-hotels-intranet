import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
    skipAddingFilesFromTsConfig: true
});

// For safety, let's just do the admin components first
const targetDir = path.join(process.cwd(), 'src', 'components', 'admin');
project.addSourceFilesAtPaths(`${targetDir}/**/*.tsx`);

let modifiedCount = 0;

function toCamelCaseKey(str) {
    return str
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()
        .substring(0, 40);
}

for (const sourceFile of project.getSourceFiles()) {
    let hasModifications = false;
    let hasUseTranslationHook = false;

    // Find all JSX text nodes that have actual text (letters)
    const jsxTextNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);

    for (const node of jsxTextNodes) {
        const text = node.getLiteralText().trim();
        // Only target strings that have actual words, ignore pure punctuation, spaces, or very short fragments
        if (text.length > 2 && /[a-zA-Z]/.test(text) && !text.includes('eslint-')) {
            // Convert text into a translation key format: admin_component.some_text
            const keyName = toCamelCaseKey(text);
            if (keyName) {
                node.replaceWithText(`{t('admin.${keyName}', '${text.replace(/[\\']/g, '\\$&')}')}`);
                hasModifications = true;
            }
        }
    }

    // Also catch JSXExpression elements that represent string literals like label="Dashboard" -> label={t('...')}
    // For safety, we will only do JsxText for now to prevent breaking attribute syntax.

    if (hasModifications) {
        // Inject the import if missing
        const imports = sourceFile.getImportDeclarations();
        const hasImport = imports.some(i => i.getModuleSpecifierValue() === 'react-i18next');
        if (!hasImport) {
            sourceFile.addImportDeclaration({
                namedImports: ['useTranslation'],
                moduleSpecifier: 'react-i18next'
            });
        }

        // Attempt to inject `const { t } = useTranslation('admin');` into the default exported function/const
        const componentFuncs = [...sourceFile.getFunctions(), ...sourceFile.getVariableDeclarations()?.filter(v => v.getInitializerIfKind(SyntaxKind.ArrowFunction)) || []];

        for (const comp of componentFuncs) {
            // Very basic check: does it return JSX? Usually top-level components returning JSX.
            try {
                const body = comp.getBody ? comp.getBody() : (comp.getInitializer && typeof comp.getInitializer === 'function' ? comp.getInitializer().getBody() : null);
                if (body && body.getKind() === SyntaxKind.Block) {
                    const bodyText = body.getText();
                    if (bodyText.includes('return') && (bodyText.includes('<') && bodyText.includes('/>') || bodyText.includes('</'))) {
                        if (!bodyText.includes('useTranslation(')) {
                            body.insertStatements(0, `const { t } = useTranslation(['admin', 'common']);`);
                            hasUseTranslationHook = true;
                        }
                    }
                }
            } catch (e) {
                // ignore complex arrow functions without bodies
            }
        }

        modifiedCount++;
        console.log(`Modified: ${sourceFile.getBaseName()}`);
    }
}

project.saveSync();
console.log(`Codemod applied to ${modifiedCount} files.`);
