/** Unified attach context: page, selection, local file (document or image). */

export type ContextKind = 'page' | 'selection' | 'document' | 'image';

export interface ChatContext {
  kind: ContextKind;
  title: string;
  url?: string;
  text?: string;
  imageBlob?: Blob;
  mimeType?: string;
  truncated: boolean;
}

export type PromptInput =
  | string
  | Array<{
      role: 'user';
      content: Array<{ type: 'text'; value: string } | { type: 'image'; value: Blob }>;
    }>;

/** Build model input from user message + attached context. */
export function buildPromptWithContext(userText: string, ctx: ChatContext): PromptInput {
  if (ctx.kind === 'image' && ctx.imageBlob) {
    const truncNote = ctx.truncated ? ' [Image was resized to fit model limits.]' : '';
    return [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            value: `[Image attached by user — process locally only]
File: ${ctx.title}${truncNote}

User message:
${userText}`,
          },
          { type: 'image', value: ctx.imageBlob },
        ],
      },
    ];
  }

  const truncNote = ctx.truncated
    ? '\n[Note: attached text was truncated to fit model limits.]'
    : '';
  const text = ctx.text ?? '';

  if (ctx.kind === 'selection') {
    return `[Selected text from web page — user explicitly attached; process locally only]
Page title: ${ctx.title}
URL: ${ctx.url ?? ''}${truncNote}

--- Selected text start ---
${text}
--- Selected text end ---

User message:
${userText}`;
  }

  if (ctx.kind === 'document') {
    return `[Document attached by user — process locally only]
File: ${ctx.title}${truncNote}

--- Document text start ---
${text}
--- Document text end ---

User message:
${userText}`;
  }

  return `[Web page context — user explicitly attached this tab; process locally only]
Title: ${ctx.title}
URL: ${ctx.url ?? ''}${truncNote}

--- Page text start ---
${text}
--- Page text end ---

User message:
${userText}`;
}

export function formatContextChip(ctx: ChatContext, locale: 'en' | 'es'): string {
  if (ctx.kind === 'image') {
    const label = locale === 'es' ? 'Imagen' : 'Image';
    return `${label}: ${ctx.title}`;
  }

  if (ctx.kind === 'document') {
    const label = locale === 'es' ? 'Documento' : 'Document';
    const short = ctx.title.length > 44 ? `${ctx.title.slice(0, 41)}…` : ctx.title;
    return `${label}: ${short}`;
  }

  if (ctx.kind === 'selection') {
    const label = locale === 'es' ? 'Selección' : 'Selection';
    const preview = (ctx.text ?? '').length > 44 ? `${ctx.text!.slice(0, 41)}…` : (ctx.text ?? '');
    return `${label}: ${preview}`;
  }

  const label = locale === 'es' ? 'Contexto' : 'Context';
  const short = ctx.title.length > 48 ? `${ctx.title.slice(0, 45)}…` : ctx.title;
  return `${label}: ${short}`;
}

export function isPageActionRequest(text: string): boolean {
  const n = text.trim();
  return (
    /\b(summarize|summary|summarise|resume|resumir|resumen|explain|explica).{0,40}(this )?(page|tab|website|article|site|p[aá]gina|pesta[nñ]a|web|art[ií]culo|sitio)\b/i.test(
      n,
    ) ||
    /\b(read|lee|l[eé]e).{0,30}(this )?(page|tab|p[aá]gina|pesta[nñ]a)\b/i.test(n) ||
    /\b(qu[eé]|what) (does|dice).{0,20}(this )?(page|p[aá]gina)\b/i.test(n)
  );
}

export function isSelectionActionRequest(text: string): boolean {
  const n = text.trim();
  return (
    /\b(summarize|summary|summarise|resume|resumir|explain|explica|translate|traduce).{0,35}(this )?(selection|fragment|snippet|text|quote|pasaje|fragmento|texto|selecci[oó]n)\b/i.test(
      n,
    ) ||
    /\b(qu[eé]|what) (does|means?|significa|dice).{0,25}(this )?(selection|fragment|text|selecci[oó]n)\b/i.test(
      n,
    )
  );
}

export function isImageActionRequest(text: string): boolean {
  const n = text.trim();
  return (
    /\b(describe|explain|explica|what|qu[eé]|read|lee).{0,30}(this )?(image|photo|picture|imagen|foto)\b/i.test(
      n,
    ) ||
    /\b(image|photo|picture|imagen|foto).{0,25}(attached|adjunt)\b/i.test(n)
  );
}

export function isDocumentActionRequest(text: string): boolean {
  const n = text.trim();
  return (
    /\b(summarize|summary|summarise|resume|resumir|explain|explica).{0,35}(this )?(document|file|doc|pdf|documento|fichero|archivo)\b/i.test(
      n,
    ) ||
    /\b(qu[eé]|what).{0,25}(this )?(document|file|documento|fichero)\b/i.test(n)
  );
}
