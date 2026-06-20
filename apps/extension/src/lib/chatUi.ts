import { applyStaticTranslations, getLocale, t, type MessageKey } from './i18n.js';
import {
  createChatSession,
  destroyWarmSession,
  promptStreamingChat,
} from './model.js';
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

const chatPanel = () => document.getElementById('chat-panel');
const modelStatus = () => document.getElementById('model-status');
const messagesEl = () => document.getElementById('messages');
const messagesEmpty = () => document.getElementById('messages-empty');
const chatInput = () => document.getElementById('chat-input') as HTMLTextAreaElement | null;
const sendBtn = () => document.getElementById('send-btn') as HTMLButtonElement | null;
const stopBtn = () => document.getElementById('stop-btn') as HTMLButtonElement | null;
const newChatBtn = () => document.getElementById('new-chat-btn') as HTMLButtonElement | null;
const writingIndicator = () => document.getElementById('writing-indicator');

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
  await createChatSession(getLocale());
  messages = [];
  renderMessages();
  chatInput()?.focus();
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

  promptAbort = new AbortController();

  try {
    await promptStreamingChat(
      trimmed,
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
}

export function refreshChatLabels(): void {
  applyChatStaticLabels();
  const indicator = writingIndicator();
  if (indicator && !indicator.hidden) indicator.textContent = t('writing');
}

export function onLocaleChangeForChat(_locale: Locale): void {
  refreshChatLabels();
}

export function teardownChat(): void {
  promptAbort?.abort();
  destroyWarmSession();
}
