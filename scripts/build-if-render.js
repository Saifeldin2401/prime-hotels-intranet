import { execSync } from 'child_process';

if (process.env.RENDER) {
  console.log('Detected Render environment. Running build...');
  try {
    // Try using bun if available, otherwise npm
    const cmd = process.versions.bun ? 'bun run build' : 'npm run build';
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
} else {
  console.log('Not in Render environment. Skipping build.');
}
