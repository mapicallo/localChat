/**
 * Draggable top edge of the messages area — persists min height in chrome.storage.local.
 */
const STORAGE_KEY = 'lc_messages_min_height';
const MIN_H = 120;
const MAX_RATIO = 0.72;

function clampMessagesHeight(px: number): number {
  const max = Math.floor(window.innerHeight * MAX_RATIO);
  return Math.max(MIN_H, Math.min(max, px));
}

async function loadSavedHeight(): Promise<number | null> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const v = data[STORAGE_KEY];
    return typeof v === 'number' && v >= MIN_H ? v : null;
  } catch {
    return null;
  }
}

function applyMessagesHeight(el: HTMLElement, px: number): void {
  const h = clampMessagesHeight(px);
  el.style.flex = `1 1 ${h}px`;
  el.style.minHeight = `${h}px`;
}

export async function initChatMessagesResize(): Promise<void> {
  const handle = document.getElementById('chat-resize-handle');
  const messagesWrap = document.getElementById('messages-wrap');
  if (!handle || !messagesWrap) return;

  const saved = await loadSavedHeight();
  if (saved != null) applyMessagesHeight(messagesWrap, saved);

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('lc-resize-handle--active');

    const startY = e.clientY;
    const startH = messagesWrap.getBoundingClientRect().height;

    const onMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY;
      applyMessagesHeight(messagesWrap, startH + delta);
    };

    const onUp = (ev: PointerEvent) => {
      handle.releasePointerCapture(ev.pointerId);
      handle.classList.remove('lc-resize-handle--active');
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      const h = clampMessagesHeight(messagesWrap.getBoundingClientRect().height);
      void chrome.storage.local.set({ [STORAGE_KEY]: h });
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  });
}
