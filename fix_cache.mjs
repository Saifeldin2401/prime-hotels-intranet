import fs from 'fs';

const files = [
    'useDocuments.ts',
    'useTasks.ts',
    'useQuickCreate.ts',
    'useQuickActions.ts',
    'useBulkOperations.ts'
];

files.forEach(f => {
    const path = 'src/hooks/' + f;
    if (!fs.existsSync(path)) return;

    let content = fs.readFileSync(path, 'utf8');

    if (f === 'useDocuments.ts') {
        content = content.replace(/queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['documents'\]\s*\}\)/g, "queryClient.invalidateQueries({ queryKey: ['documents'] })\n      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })");
    } else {
        content = content.replace(/queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['tasks'\]\s*\}\)/g, "queryClient.invalidateQueries({ queryKey: ['tasks'] })\n      queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] })");
    }

    fs.writeFileSync(path, content, 'utf8');
});

console.log('Fixes applied successfully');
