/**
 * Build extension artifact → apps/extension/dist/
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: extRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('node', ['scripts/write-placeholder-icons.mjs']);
run('npx', ['vite', 'build']);

console.log('\n[build-extension] done: apps/extension/dist/');
