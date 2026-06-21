import type { ChatContext } from './chatContext.js';
import { resolveTargetTabId } from './tabContext.js';

export type { ChatContext };
export {
  buildPromptWithContext,
  formatContextChip,
  isDocumentActionRequest,
  isImageActionRequest,
  isPageActionRequest,
  isSelectionActionRequest,
} from './chatContext.js';

/** Max characters sent to the on-device model from a single page capture. */
export const MAX_PAGE_CHARS = 40_000;

/** Max characters from a text selection attach. */
export const MAX_SELECTION_CHARS = 20_000;

export type PageExtractFailure =
  | 'no_tab'
  | 'restricted'
  | 'empty'
  | 'no_selection'
  | 'script_failed';

export type PageExtractResult =
  | { ok: true; context: ChatContext }
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

    const { title, text, truncated } = payload as ChatContext;
    const pageUrl = (payload as ChatContext).url || url;
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

    const { text, truncated } = payload as ChatContext;
    const pageUrl = (payload as ChatContext).url || url;
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
