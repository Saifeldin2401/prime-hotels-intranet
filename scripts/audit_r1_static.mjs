import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        walk(res, fileList);
      }
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      fileList.push(res);
    }
  }
  return fileList;
}

const files = walk(SRC);
console.log(`Auditing ${files.length} TypeScript source files in src/...`);

const findings = {
  anyExplicit: [],
  anyCast: [],
  unknownCast: [],
  nonNullAssertion: [],
  directSupabaseInUI: [],
  conditionalHooks: [],
  duplicateFiles: [],
};

// Check for duplicate files like use-toast.ts / use-toast.tsx
const fileMap = new Map();
for (const file of files) {
  const base = file.replace(/\.tsx?$/, '');
  if (fileMap.has(base)) {
    findings.duplicateFiles.push({
      base,
      file1: path.relative(ROOT, fileMap.get(base)),
      file2: path.relative(ROOT, file),
    });
  } else {
    fileMap.set(base, file);
  }
}

// Inspect every file
for (const file of files) {
  const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  const isTest = /(\btest\b|\.test\.|\.spec\.|\bmock)/i.test(relPath);
  const isUIComponent = relPath.startsWith('src/components/') || relPath.startsWith('src/pages/');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // Check "as any"
    if (/\bas\s+any\b/.test(line)) {
      findings.anyCast.push({ file: relPath, line: lineNum, text: trimmed, isTest });
    }

    // Check "as unknown as"
    if (/\bas\s+unknown\s+as\b/.test(line)) {
      findings.unknownCast.push({ file: relPath, line: lineNum, text: trimmed, isTest });
    }

    // Check explicit ": any" or "<any>" or "any[]"
    if (/:\s*any\b/.test(line) || /<any>/.test(line) || /\bany\[\]/.test(line) || /Record<[^,>]+,\s*any>/.test(line)) {
      findings.anyExplicit.push({ file: relPath, line: lineNum, text: trimmed, isTest });
    }

    // Check non-null assertion on method or property call "!."
    if (/\w+!\./.test(line)) {
      findings.nonNullAssertion.push({ file: relPath, line: lineNum, text: trimmed, isTest });
    }

    // Direct supabase client in UI
    if (isUIComponent && !isTest) {
      if (/(import\s+.*supabase.*from\s+['"].*\/supabase(\/client)?['"])/.test(line)) {
        // Exclude hooks or services
        findings.directSupabaseInUI.push({ file: relPath, line: lineNum, text: trimmed });
      }
    }
  });

  // Check for conditional hooks or hooks after return in UI components
  if (isUIComponent && !isTest) {
    let hasReturn = false;
    let braceDepth = 0;
    const hookRegex = /\b(use[A-Z]\w*)\s*\(/;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

      // naive return check in component top-level
      if (/^\s*if\s*\(.*(use[A-Z]\w*)\(/.test(line)) {
        findings.conditionalHooks.push({
          file: relPath,
          line: lineNum,
          text: trimmed,
          type: 'hook-in-conditional'
        });
      }
    });
  }
}

console.log(JSON.stringify({
  totalFiles: files.length,
  duplicatesCount: findings.duplicateFiles.length,
  anyCastCount: findings.anyCast.length,
  anyCastNonTest: findings.anyCast.filter(f => !f.isTest).length,
  anyExplicitCount: findings.anyExplicit.length,
  anyExplicitNonTest: findings.anyExplicit.filter(f => !f.isTest).length,
  unknownCastCount: findings.unknownCast.length,
  unknownCastNonTest: findings.unknownCast.filter(f => !f.isTest).length,
  nonNullCount: findings.nonNullAssertion.length,
  nonNullNonTest: findings.nonNullAssertion.filter(f => !f.isTest).length,
  directSupabaseInUICount: findings.directSupabaseInUI.length,
  conditionalHooksCount: findings.conditionalHooks.length,
  duplicateFiles: findings.duplicateFiles,
}, null, 2));

// Write full detailed json report to file for auditing
fs.writeFileSync(path.join(ROOT, '.agents/worker_r1_codebase/static_analysis.json'), JSON.stringify(findings, null, 2));
console.log('Saved static_analysis.json');
