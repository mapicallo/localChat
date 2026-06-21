import type { ChatContext } from './chatContext.js';
import type { MessageKey } from './i18n.js';

export const MAX_DOCUMENT_CHARS = 40_000;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2048;

export type FileParseFailure =
  | 'too_large'
  | 'unsupported'
  | 'empty'
  | 'pdf_failed'
  | 'read_failed'
  | 'image_failed';

export type FileParseResult =
  | { ok: true; context: ChatContext }
  | { ok: false; error: FileParseFailure };

const TEXT_EXT = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.json',
  '.log',
  '.xml',
  '.html',
  '.htm',
  '.yml',
  '.yaml',
]);

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function truncateText(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max), truncated: true };
}

async function readTextFile(file: File): Promise<string> {
  return file.text();
}

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: buffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const parts: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) parts.push(pageText);
  }

  return parts.join('\n\n');
}

async function resizeImageBlob(file: File): Promise<{ blob: Blob; truncated: boolean }> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  let truncated = false;

  const maxDim = MAX_IMAGE_DIMENSION;
  if (width > maxDim || height > maxDim) {
    truncated = true;
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob'))),
      file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      0.92,
    );
  });

  return { blob, truncated };
}

export async function parseDocumentFile(file: File): Promise<FileParseResult> {
  if (file.size > MAX_IMAGE_BYTES * 2) return { ok: false, error: 'too_large' };

  const ext = extOf(file.name);
  let raw = '';

  try {
    if (ext === '.pdf' || file.type === 'application/pdf') {
      raw = await extractPdfText(file);
    } else if (TEXT_EXT.has(ext) || file.type.startsWith('text/')) {
      raw = await readTextFile(file);
    } else {
      return { ok: false, error: 'unsupported' };
    }
  } catch {
    return { ok: false, error: ext === '.pdf' || file.type === 'application/pdf' ? 'pdf_failed' : 'read_failed' };
  }

  raw = raw.replace(/\s+/g, ' ').trim();
  if (!raw) return { ok: false, error: 'empty' };

  const { text, truncated } = truncateText(raw, MAX_DOCUMENT_CHARS);

  return {
    ok: true,
    context: {
      kind: 'document',
      title: file.name,
      text,
      truncated,
    },
  };
}

export async function parseImageFile(file: File): Promise<FileParseResult> {
  if (!IMAGE_MIME.has(file.type) && !file.type.startsWith('image/')) {
    return { ok: false, error: 'unsupported' };
  }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'too_large' };

  try {
    const { blob, truncated } = await resizeImageBlob(file);
    return {
      ok: true,
      context: {
        kind: 'image',
        title: file.name,
        imageBlob: blob,
        mimeType: blob.type,
        truncated,
      },
    };
  } catch {
    return { ok: false, error: 'image_failed' };
  }
}

export function fileErrorMessage(error: FileParseFailure, t: (key: MessageKey) => string): string {
  switch (error) {
    case 'too_large':
      return t('errorFileTooLarge');
    case 'unsupported':
      return t('errorFileUnsupported');
    case 'empty':
      return t('errorFileEmpty');
    case 'pdf_failed':
      return t('errorPdfFailed');
    case 'image_failed':
      return t('errorImageFailed');
    default:
      return t('errorFileRead');
  }
}
