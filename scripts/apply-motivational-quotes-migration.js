console.error('Deprecated script: direct SQL execution via exec_sql is disabled for security.');
console.error('Use `npm run db:migrate` or `npm run db:push` (Supabase CLI/MCP-managed flow).');
process.exit(1);
