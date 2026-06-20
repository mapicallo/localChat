/**
 * ZIP for Chrome Web Store / Edge Add-ons.
 */
import archiver from 'archiver';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const manifestPath = path.join(dist, 'manifest.json');

if (!fs.existsSync(dist)) {
  console.error('Missing dist/. Run npm run build first.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version ?? '0.0.0';
const outZip = path.resolve(root, `LocalChat-v${version}.zip`);

const output = fs.createWriteStream(outZip);
const archive = archiver('zip', { zlib: { level: 9 } });

await new Promise((resolve, reject) => {
  output.on('close', resolve);
  output.on('error', reject);
  archive.pipe(output);
  archive.directory(dist, false);
  void archive.finalize();
});

console.log(`[pack] wrote ${outZip} (${(archive.pointer() / (1024 * 1024)).toFixed(2)} MiB)`);
