/** Session key — background remembers the page tab when opening the panel popup. */
export const TARGET_TAB_SESSION_KEY = 'lc_target_tab_id';

export function isInjectableWebUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  if (url.startsWith('https://chrome.google.com/webstore')) return false;
  if (url.startsWith('https://microsoftedge.microsoft.com/addons')) return false;
  return true;
}

/** Tab to read page/selection from — not the extension popup itself. */
export async function resolveTargetTabId(): Promise<number | undefined> {
  const stored = await chrome.storage.session.get(TARGET_TAB_SESSION_KEY);
  const remembered = stored[TARGET_TAB_SESSION_KEY];
  if (typeof remembered === 'number') {
    try {
      const tab = await chrome.tabs.get(remembered);
      if (tab.id != null && isInjectableWebUrl(tab.url)) return tab.id;
    } catch {
      /* closed */
    }
  }

  const wins = await chrome.windows.getAll({ populate: true });
  const focusedNormal = wins.find((w) => w.focused && w.type === 'normal');
  if (focusedNormal) {
    const tab = focusedNormal.tabs?.find((t) => t.active);
    if (tab?.id != null && isInjectableWebUrl(tab.url)) return tab.id;
  }

  for (const w of wins) {
    if (w.type !== 'normal') continue;
    const tab = w.tabs?.find((t) => t.active);
    if (tab?.id != null && isInjectableWebUrl(tab.url)) return tab.id;
  }

  return undefined;
}
