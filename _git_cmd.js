const{execSync}=require('child_process');
const args = process.argv.slice(2).join(' ');
try {
  const out = execSync('git ' + args, {cwd: process.cwd(), encoding: 'utf8', stdio: ['pipe','pipe','pipe']});
  process.stdout.write(out);
} catch(e) {
  process.stdout.write(e.stdout || '');
  process.stderr.write(e.stderr || e.message);
  process.exit(1);
}
