/**
 * LocalChat MV3 background — open side panel on toolbar click.
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[LocalChat] sidePanel behavior', err));
