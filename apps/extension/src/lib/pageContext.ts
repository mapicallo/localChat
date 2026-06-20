/** Max characters sent to the on-device model from a single page capture. */
export const MAX_PAGE_CHARS = 40_000;

/** Max characters from a text selection attach. */
export const MAX_SELECTION_CHARS = 20_000;

export type ContextKind = 'page' | 'selection';

export interface PageContext {
  kind: ContextKind;
  title: string;
  url: string;
  text: string;
  truncated: boolean;
}

export type PageExtractFailure =
  | 'no_tab'
  | 'restricted'
  | 'empty'
  | 'no_selection'
  | 'script_failed';

export type PageExtractResult =
  | { ok: true; context: PageContext }
  | { ok: false; error: PageExtractFailure };

const RESTRICTED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'extension://',
  'devtools://',
  'about:',
  'view-source:',
];

const RESTRICTED_HOSTS = ['chrome.google.com'];

function isRestrictedUrl(url: string): boolean {
  if (!url) return true;
  if (RESTRICTED_PREFIXES.some((p) => url.startsWith(p))) return true;
  try {
    const host = new URL(url).hostname;
    if (RESTRICTED_HOSTS.includes(host) && url.includes('/webstore')) return true;
  } catch {
    return true;
  }
  return false;
}

import { resolveTargetTabId } from './tabContext.js';

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabId = await resolveTargetTabId();
  if (tabId == null) return null;
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return null;
  }
}

/** Runs inside the active tab — keep self-contained (no imports). */
function extractReadableTextInPage(maxChars: number): {
  title: string;
  url: string;
  text: string;
  truncated: boolean;
} {
  const title = document.title?.trim() || '';
  const url = location.href || '';
  const root =
    document.querySelector('main') ||
    document.querySelector('article') ||
    document.querySelector('[role="main"]') ||
    document.body;

  let text = (root?.innerText ?? '').replace(/\s+/g, ' ').trim();
  let truncated = false;
  if (text.length > maxChars) {
    text = text.slice(0, maxChars);
    truncated = true;
  }
  return { title, url, text, truncated };
}

/** Runs inside the active tab — selection only. */
function extractSelectionInPage(maxChars: number): {
  title: string;
  url: string;
  text: string;
  truncated: boolean;
} {
  const title = document.title?.trim() || '';
  const url = location.href || '';
  let text = (window.getSelection()?.toString() ?? '').replace(/\s+/g, ' ').trim();
  let truncated = false;
  if (text.length > maxChars) {
    text = text.slice(0, maxChars);
    truncated = true;
  }
  return { title, url, text, truncated };
}

export async function extractActiveTabText(): Promise<PageExtractResult> {
  const tab = await getActiveTab();
  if (!tab?.id) return { ok: false, error: 'no_tab' };

  const url = tab.url ?? '';
  if (isRestrictedUrl(url)) return { ok: false, error: 'restricted' };

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractReadableTextInPage,
      args: [MAX_PAGE_CHARS],
    });

    const payload = result?.result;
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'script_failed' };
    }

    const { title, text, truncated } = payload as PageContext;
    const pageUrl = (payload as PageContext).url || url;
    const pageTitle = title || tab.title || pageUrl;

    if (!text.trim()) return { ok: false, error: 'empty' };

    return {
      ok: true,
      context: {
        kind: 'page',
        title: pageTitle,
        url: pageUrl,
        text,
        truncated: Boolean(truncated),
      },
    };
  } catch {
    return { ok: false, error: 'script_failed' };
  }
}

export async function extractActiveTabSelection(): Promise<PageExtractResult> {
  const tab = await getActiveTab();
  if (!tab?.id) return { ok: false, error: 'no_tab' };

  const url = tab.url ?? '';
  if (isRestrictedUrl(url)) return { ok: false, error: 'restricted' };

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractSelectionInPage,
      args: [MAX_SELECTION_CHARS],
    });

    const payload = result?.result;
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'script_failed' };
    }

    const { text, truncated } = payload as PageContext;
    const pageUrl = (payload as PageContext).url || url;
    const pageTitle = tab.title || pageUrl;

    if (!text.trim()) return { ok: false, error: 'no_selection' };

    return {
      ok: true,
      context: {
        kind: 'selection',
        title: pageTitle,
        url: pageUrl,
        text,
        truncated: Boolean(truncated),
      },
    };
  } catch {
    return { ok: false, error: 'script_failed' };
  }
}

/** Wrap user message with approved page or selection text for the local model. */
export function buildPromptWithPageContext(userText: string, ctx: PageContext): string {
  const truncNote = ctx.truncated
    ? '\n[Note: attached text was truncated to fit model limits.]'
    : '';

  if (ctx.kind === 'selection') {
    return `[Selected text from web page — user explicitly attached; process locally only]
Page title: ${ctx.title}
URL: ${ctx.url}${truncNote}

--- Selected text start ---
${ctx.text}
--- Selected text end ---

User message:
${userText}`;
  }

  return `[Web page context — user explicitly attached this tab; process locally only]
Title: ${ctx.title}
URL: ${ctx.url}${truncNote}

--- Page text start ---
${ctx.text}
--- Page text end ---

User message:
${userText}`;
}

/** User wants page-based action but has not attached context yet. */
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

/** User asks about a text fragment without attaching selection. */
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

export function formatContextChip(ctx: PageContext, locale: 'en' | 'es'): string {
  if (ctx.kind === 'selection') {
    const label = locale === 'es' ? 'Selección' : 'Selection';
    const preview = ctx.text.length > 44 ? `${ctx.text.slice(0, 41)}…` : ctx.text;
    return `${label}: ${preview}`;
  }

  const label = locale === 'es' ? 'Contexto' : 'Context';
  const short = ctx.title.length > 48 ? `${ctx.title.slice(0, 45)}…` : ctx.title;
  return `${label}: ${short}`;
}
