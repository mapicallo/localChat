import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

/** LocalChat — AI4Context purple family + white chat bubble */
const PURPLE_A = { r: 102, g: 126, b: 234 };
const PURPLE_B = { r: 118, g: 75, b: 162 };
const BUBBLE = { r: 255, g: 255, b: 255, a: 255 };
const DOT = { r: 91, g: 60, b: 168, a: 255 };

function setRgba(data, w, x, y, c) {
  if (x < 0 || y < 0 || x >= w || y >= w) return;
  const i = (w * y + x) << 2;
  data[i] = c.r;
  data[i + 1] = c.g;
  data[i + 2] = c.b;
  data[i + 3] = c.a ?? 255;
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const rl = x0 + r;
  const rr = x1 - r;
  const rt = y0 + r;
  const rb = y1 - r;
  if (x >= rl && x <= rr) return true;
  if (y >= rt && y <= rb) return true;
  const cx = x < rl ? rl : rr;
  const cy = y < rt ? rt : rb;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inCircle(x, y, cx, cy, rad) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= rad * rad;
}

/** Speech bubble body + tail (bottom-left). */
function inChatBubble(x, y, W) {
  const pad = W * 0.1;
  const x0 = pad + W * 0.06;
  const y0 = pad;
  const x1 = W - pad - W * 0.04;
  const y1 = W - pad - W * 0.16;
  const r = W * 0.14;

  if (inRoundedRect(x, y, x0, y0, x1, y1, r)) return true;

  const tailW = W * 0.16;
  const tailH = W * 0.14;
  const tx0 = x0 + W * 0.04;
  const ty0 = y1 - W * 0.02;
  return x >= tx0 && x <= tx0 + tailW && y >= ty0 && y <= ty0 + tailH;
}

function renderIcon(W) {
  const png = new PNG({ width: W, height: W, colorType: 6, inputColorType: 6, bitDepth: 8 });

  const bgR = Math.max(2, Math.round(W * 0.16));
  const bgPad = Math.max(0, Math.round(W * 0.04));

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      if (!inRoundedRect(x, y, bgPad, bgPad, W - bgPad - 1, W - bgPad - 1, bgR)) continue;
      const t = (x + y) / (2 * (W - 1));
      setRgba(png.data, W, x, y, {
        r: lerp(PURPLE_A.r, PURPLE_B.r, t),
        g: lerp(PURPLE_A.g, PURPLE_B.g, t),
        b: lerp(PURPLE_A.b, PURPLE_B.b, t),
        a: 255,
      });
    }
  }

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      if (!inChatBubble(x, y, W)) continue;
      setRgba(png.data, W, x, y, BUBBLE);
    }
  }

  if (W >= 24) {
    const dotR = Math.max(1, Math.round(W * 0.045));
    const cy = Math.round(W * 0.36);
    const cx1 = Math.round(W * 0.38);
    const cx2 = Math.round(W * 0.56);
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        if (inCircle(x, y, cx1, cy, dotR) || inCircle(x, y, cx2, cy, dotR)) {
          setRgba(png.data, W, x, y, DOT);
        }
      }
    }
  }

  return PNG.sync.write(png);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), renderIcon(size));
}

console.log('[icons] LocalChat chat-bubble PNGs → public/icons');
