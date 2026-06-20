/**
 * LocalChat MV3 background — floating panel popup (AI4Context family pattern).
 */
import { TARGET_TAB_SESSION_KEY, isInjectableWebUrl } from './lib/tabContext.js';

const PANEL_PAGE = 'panel.html';
const SESSION_PANEL_KEY = 'lc_panel_window_id';

function sessionLike(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

function rememberTab(tab: chrome.tabs.Tab | undefined): void {
  if (tab?.id == null || !isInjectableWebUrl(tab.url)) return;
  void sessionLike().set({ [TARGET_TAB_SESSION_KEY]: tab.id });
}

async function captureActiveTabFromLastFocusedBrowserWindow(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    rememberTab(tab);
  } catch {
    /* ignore */
  }
}

async function clearStoredPanelWindowId(): Promise<void> {
  try {
    await sessionLike().remove(SESSION_PANEL_KEY);
  } catch {
    /* ignore */
  }
}

async function tryFocusStoredPanel(): Promise<boolean> {
  try {
    const data = await sessionLike().get(SESSION_PANEL_KEY);
    const wid = data[SESSION_PANEL_KEY] as number | undefined;
    if (typeof wid !== 'number') return false;

    const w = await chrome.windows.get(wid, { populate: true });
    const tabUrl = w.tabs?.[0]?.url ?? '';
    const ours = chrome.runtime.getURL(PANEL_PAGE);
    if (!tabUrl || tabUrl.split(/[?#]/)[0] !== ours.split(/[?#]/)[0]) {
      await sessionLike().remove(SESSION_PANEL_KEY);
      return false;
    }

    await chrome.windows.update(wid, { focused: true });
    return true;
  } catch {
    try {
      await sessionLike().remove(SESSION_PANEL_KEY);
    } catch {
      /* ignore */
    }
    return false;
  }
}

async function findExistingPanelWindow(): Promise<number | undefined> {
  const url = chrome.runtime.getURL(PANEL_PAGE);
  const windows = await chrome.windows.getAll({ populate: true });
  for (const win of windows) {
    for (const tab of win.tabs ?? []) {
      if (tab.url === url && win.id != null) return win.id;
    }
  }
  return undefined;
}

async function openLocalChatPanel(): Promise<void> {
  await captureActiveTabFromLastFocusedBrowserWindow();

  if (await tryFocusStoredPanel()) return;

  const existing = await findExistingPanelWindow();
  if (existing != null) {
    await chrome.windows.update(existing, { focused: true });
    await sessionLike().set({ [SESSION_PANEL_KEY]: existing });
    return;
  }

  const panelUrl = chrome.runtime.getURL(PANEL_PAGE);
  const remember = async (windowId: number | undefined) => {
    if (windowId !== undefined) {
      await sessionLike().set({ [SESSION_PANEL_KEY]: windowId });
    }
  };

  const attempts: chrome.windows.CreateData[] = [
    { url: panelUrl, type: 'popup', width: 440, height: 720, focused: true },
    { url: panelUrl, type: 'normal', width: 460, height: 740, focused: true },
  ];

  for (const createData of attempts) {
    try {
      const created = await chrome.windows.create(createData);
      await remember(created.id);
      return;
    } catch (e) {
      console.warn('[LocalChat] window create failed', createData.type, e);
    }
  }

  try {
    await chrome.tabs.create({ url: panelUrl, active: true });
  } catch (e) {
    console.error('[LocalChat] could not open panel', e);
  }
}

chrome.action.onClicked.addListener(() => {
  void openLocalChatPanel();
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    const data = await sessionLike().get(SESSION_PANEL_KEY);
    if (data[SESSION_PANEL_KEY] === windowId) {
      await sessionLike().remove(SESSION_PANEL_KEY);
    }
  } catch {
    /* ignore */
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  void (async () => {
    try {
      const w = await chrome.windows.get(windowId, { populate: true });
      if (w.type !== 'normal') return;
      const tab = w.tabs?.find((t) => t.active);
      rememberTab(tab);
    } catch {
      /* ignore */
    }
  })();
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  void (async () => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      rememberTab(tab);
    } catch {
      /* ignore */
    }
  })();
});

chrome.runtime.onInstalled.addListener(() => {
  void clearStoredPanelWindowId();
});

chrome.runtime.onStartup.addListener(() => {
  void clearStoredPanelWindowId();
});
