import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

/** LocalChat — blue chat bubble accent */
const BRAND = { r: 37, g: 99, b: 235 };
const BUBBLE = { r: 239, g: 246, b: 255 };

function setRgba(data, w, x, y, c) {
  if (x < 0 || y < 0 || x >= w || y >= w) return;
  const i = (w * y + x) << 2;
  data[i] = c.r;
  data[i + 1] = c.g;
  data[i + 2] = c.b;
  data[i + 3] = c.a ?? 255;
}

function fillRect(data, W, x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setRgba(data, W, x, y, color);
  }
}

function renderIcon(W) {
  const png = new PNG({ width: W, height: W, colorType: 6, inputColorType: 6, bitDepth: 8 });
  const pad = Math.max(2, Math.round(W * 0.1));
  fillRect(png.data, W, pad, pad, W - pad - 1, W - pad - 1, BRAND);
  const inset = pad + Math.max(1, Math.round(W * 0.18));
  fillRect(png.data, W, inset, inset, W - inset - 1, W - inset - 1, BUBBLE);
  const tail = Math.max(1, Math.round(W * 0.12));
  fillRect(png.data, W, pad + 1, W - pad - tail, pad + tail, W - pad - 1, BRAND);
  return PNG.sync.write(png);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), renderIcon(size));
}

console.log('[icons] LocalChat PNGs → public/icons');
