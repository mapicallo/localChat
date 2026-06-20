/** Max characters sent to the on-device model from a single page capture. */
export const MAX_PAGE_CHARS = 40_000;

export interface PageContext {
  title: string;
  url: string;
  text: string;
  truncated: boolean;
}

export type PageExtractFailure =
  | 'no_tab'
  | 'restricted'
  | 'empty'
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

export async function extractActiveTabText(): Promise<PageExtractResult> {
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    return { ok: false, error: 'no_tab' };
  }

  const tab = tabs[0];
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

/** Wrap user message with approved page text for the local model. */
export function buildPromptWithPageContext(userText: string, ctx: PageContext): string {
  const truncNote = ctx.truncated
    ? '\n[Note: page text was truncated to fit model limits.]'
    : '';

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

export function formatContextChip(title: string, locale: 'en' | 'es'): string {
  const label = locale === 'es' ? 'Contexto' : 'Context';
  const short = title.length > 48 ? `${title.slice(0, 45)}…` : title;
  return `${label}: ${short}`;
}
