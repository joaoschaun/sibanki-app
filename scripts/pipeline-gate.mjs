import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const steps = [
  { name: 'TypeScript Typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'Unit Tests (Vitest)', command: 'npm', args: ['run', 'test:unit'] },
  { name: 'React Smoke Tests (Playwright)', command: 'npm', args: ['run', 'test:react-smoke'] }
];

console.log('\x1b[35m=== SIBANKI PIPELINE GATE ===\x1b[0m\n');

for (const step of steps) {
  console.log(`\x1b[36mRunning step: ${step.name}...\x1b[0m`);
  const result = spawnSync(step.command, step.args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });

  if (result.status !== 0) {
    console.error(`\n\x1b[31m❌ Step failed: ${step.name} (exit code: ${result.status})\x1b[0m`);
    process.exit(result.status || 1);
  }
  console.log(`\x1b[32m✔ Step passed: ${step.name}\x1b[0m\n`);
}

console.log('\x1b[32m✔ All pipeline gate checks passed successfully!\x1b[0m');
process.exit(0);
