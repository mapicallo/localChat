import { getLocale, t, type MessageKey } from './i18n.js';
import {
  buildCapabilityReply,
  capabilityChipLabel,
  detectCapabilityIntent,
} from './capabilities.js';
import {
  createChatSession,
  destroyWarmSession,
  promptStreamingChat,
} from './model.js';
import {
  buildPromptWithPageContext,
  extractActiveTabText,
  formatContextChip,
  isPageActionRequest,
  type PageContext,
} from './pageContext.js';
import type { Locale } from './storage.js';

export type ChatRole = 'user' | 'assistant' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

let messages: ChatMessage[] = [];
let streaming = false;
let promptAbort: AbortController | null = null;
let attachedPage: PageContext | null = null;

const chatPanel = () => document.getElementById('chat-panel');
const modelStatus = () => document.getElementById('model-status');
const messagesEl = () => document.getElementById('messages');
const messagesEmpty = () => document.getElementById('messages-empty');
const chatInput = () => document.getElementById('chat-input') as HTMLTextAreaElement | null;
const sendBtn = () => document.getElementById('send-btn') as HTMLButtonElement | null;
const stopBtn = () => document.getElementById('stop-btn') as HTMLButtonElement | null;
const newChatBtn = () => document.getElementById('new-chat-btn') as HTMLButtonElement | null;
const writingIndicator = () => document.getElementById('writing-indicator');
const contextBar = () => document.getElementById('context-bar');
const contextChip = () => document.getElementById('context-chip');

function msgId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function scrollMessagesToBottom(): void {
  const el = messagesEl();
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

function renderMessages(): void {
  const el = messagesEl();
  const empty = messagesEmpty();
  if (!el) return;

  if (empty) empty.hidden = messages.length > 0;

  el.innerHTML = '';
  for (const m of messages) {
    const bubble = document.createElement('div');
    bubble.className = `lc-msg lc-msg--${m.role}`;
    bubble.setAttribute('role', 'article');
    bubble.textContent = m.content;
    el.appendChild(bubble);
  }

  scrollMessagesToBottom();
}

function setComposerEnabled(enabled: boolean): void {
  chatInput()?.toggleAttribute('disabled', !enabled);
  sendBtn()?.toggleAttribute('disabled', !enabled);
  stopBtn()?.toggleAttribute('hidden', enabled);
}

function setWriting(active: boolean): void {
  streaming = active;
  const indicator = writingIndicator();
  if (indicator) {
    indicator.hidden = !active;
    indicator.textContent = t('writing');
  }
  setComposerEnabled(!active);
}

export function showChatPanel(): void {
  modelStatus()?.setAttribute('hidden', '');
  const panel = chatPanel();
  if (panel) {
    panel.hidden = false;
  }
  applyChatStaticLabels();
  chatInput()?.focus();
}

function applyChatStaticLabels(): void {
  const newBtn = newChatBtn();
  if (newBtn) newBtn.textContent = t('newChat');
  const send = sendBtn();
  if (send) send.textContent = t('send');
  const stop = stopBtn();
  if (stop) stop.textContent = t('stop');
  const hint = document.getElementById('composer-hint');
  if (hint) hint.textContent = t('composerHint');
  const capChip = document.getElementById('cap-chip');
  if (capChip) capChip.textContent = capabilityChipLabel(getLocale());
  const attachBtn = document.getElementById('attach-page-btn');
  if (attachBtn) attachBtn.textContent = t('useThisPage');
  updateContextBar();
}

function updateContextBar(): void {
  const bar = contextBar();
  const chip = contextChip();
  if (!bar || !chip) return;

  if (attachedPage) {
    bar.hidden = false;
    chip.textContent = formatContextChip(attachedPage.title, getLocale());
  } else {
    bar.hidden = true;
    chip.textContent = '';
  }
}

function clearAttachedPage(): void {
  attachedPage = null;
  updateContextBar();
}

function pageExtractErrorMessage(error: string): string {
  switch (error) {
    case 'restricted':
      return t('errorPageRestricted');
    case 'empty':
      return t('errorPageEmpty');
    case 'no_tab':
      return t('errorPageNoTab');
    default:
      return t('errorPageScript');
  }
}

async function attachActivePage(): Promise<void> {
  if (streaming) return;

  if (!window.confirm(t('attachPageConfirm'))) return;

  const result = await extractActiveTabText();
  if (!result.ok) {
    messages.push({
      id: msgId(),
      role: 'error',
      content: pageExtractErrorMessage(result.error),
    });
    renderMessages();
    return;
  }

  attachedPage = result.context;
  updateContextBar();
  messages.push({ id: msgId(), role: 'assistant', content: t('pageAttachedHint') });
  renderMessages();
  chatInput()?.focus();
}

export async function initChatSession(): Promise<void> {
  await createChatSession(getLocale());
  messages = [];
  renderMessages();
  showChatPanel();
}

export async function startNewChat(): Promise<void> {
  if (streaming) return;
  promptAbort?.abort();
  clearAttachedPage();
  await createChatSession(getLocale());
  messages = [];
  renderMessages();
  chatInput()?.focus();
}

async function replyWithText(assistantId: string, text: string): Promise<void> {
  const idx = messages.findIndex((m) => m.id === assistantId);
  if (idx >= 0) {
    messages[idx] = { ...messages[idx], content: text };
  }
  renderMessages();
}

async function sendMessage(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || streaming) return;

  messages.push({ id: msgId(), role: 'user', content: trimmed });
  renderMessages();

  const assistantId = msgId();
  messages.push({ id: assistantId, role: 'assistant', content: '' });
  renderMessages();

  chatInput()!.value = '';
  setWriting(true);

  if (isPageActionRequest(trimmed) && !attachedPage) {
    await replyWithText(assistantId, t('attachPageFirst'));
    setWriting(false);
    chatInput()?.focus();
    return;
  }

  const capIntent = detectCapabilityIntent(trimmed);
  if (capIntent) {
    try {
      const reply = await buildCapabilityReply(capIntent, getLocale());
      await replyWithText(assistantId, reply);
    } catch (err) {
      console.error('[LocalChat] capability reply', err);
      await replyWithText(assistantId, t('errorGeneric'));
    } finally {
      setWriting(false);
      chatInput()?.focus();
    }
    return;
  }

  promptAbort = new AbortController();
  const modelPrompt = attachedPage
    ? buildPromptWithPageContext(trimmed, attachedPage)
    : trimmed;

  try {
    await promptStreamingChat(
      modelPrompt,
      (accumulated) => {
        const idx = messages.findIndex((m) => m.id === assistantId);
        if (idx >= 0) {
          messages[idx] = { ...messages[idx], content: accumulated };
          renderMessages();
        }
      },
      promptAbort.signal,
    );
  } catch (err) {
    if (promptAbort.signal.aborted) {
      const idx = messages.findIndex((m) => m.id === assistantId);
      if (idx >= 0 && !messages[idx].content) {
        messages.splice(idx, 1);
      }
    } else {
      const name = err instanceof Error ? err.name : '';
      const key: MessageKey =
        name === 'QuotaExceededError' ? 'errorQuota' : 'errorGeneric';
      const idx = messages.findIndex((m) => m.id === assistantId);
      const errMsg = t(key);
      if (idx >= 0) {
        messages[idx] = { id: assistantId, role: 'error', content: errMsg };
      } else {
        messages.push({ id: msgId(), role: 'error', content: errMsg });
      }
      console.error('[LocalChat] prompt', err);
    }
    renderMessages();
  } finally {
    promptAbort = null;
    setWriting(false);
    chatInput()?.focus();
  }
}

export function bindChatEvents(): void {
  sendBtn()?.addEventListener('click', () => {
    void sendMessage(chatInput()?.value ?? '');
  });

  stopBtn()?.addEventListener('click', () => {
    promptAbort?.abort();
  });

  newChatBtn()?.addEventListener('click', () => {
    void startNewChat();
  });

  chatInput()?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(chatInput()?.value ?? '');
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (chatPanel()?.hidden) return;
    chatInput()?.focus();
  });

  document.getElementById('cap-chip')?.addEventListener('click', () => {
    void sendMessage(capabilityChipLabel(getLocale()));
  });

  document.getElementById('attach-page-btn')?.addEventListener('click', () => {
    void attachActivePage();
  });

  document.getElementById('context-clear')?.addEventListener('click', () => {
    clearAttachedPage();
    chatInput()?.focus();
  });
}

export function refreshChatLabels(): void {
  applyChatStaticLabels();
  const indicator = writingIndicator();
  if (indicator && !indicator.hidden) indicator.textContent = t('writing');
}

export async function onLocaleChangeForChat(locale: Locale): Promise<void> {
  refreshChatLabels();
  if (!streaming && messages.length === 0) {
    await createChatSession(locale);
  }
}

export function teardownChat(): void {
  promptAbort?.abort();
  clearAttachedPage();
  destroyWarmSession();
}
