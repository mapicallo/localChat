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
  buildPromptWithContext,
  extractActiveTabSelection,
  extractActiveTabText,
  formatContextChip,
  isDocumentActionRequest,
  isImageActionRequest,
  isPageActionRequest,
  isSelectionActionRequest,
  type ChatContext,
} from './pageContext.js';
import {
  fileErrorMessage,
  parseDocumentFile,
  parseImageFile,
} from './fileContext.js';
import {
  deleteConversation,
  formatConversationWhen,
  getActiveConversation,
  listConversations,
  messagesForStorage,
  newConversationId,
  setActiveConversationId,
  titleFromMessages,
  upsertConversation,
  type SavedConversation,
} from './chatHistory.js';

export type ChatRole = 'user' | 'assistant' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

import type { Locale } from './storage.js';

let messages: ChatMessage[] = [];
let streaming = false;
let promptAbort: AbortController | null = null;
let attachedContext: ChatContext | null = null;
let contextThumbUrl: string | null = null;
let currentConversationId: string | null = null;
let conversationCreatedAt = Date.now();

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
const historyPanel = () => document.getElementById('history-panel');
const historyList = () => document.getElementById('history-list');
const historyEmpty = () => document.getElementById('history-empty');

function closeHistoryPanel(): void {
  historyPanel()?.setAttribute('hidden', '');
}

function openHistoryPanel(): void {
  historyPanel()?.removeAttribute('hidden');
  void renderHistoryPanel();
}

async function renderHistoryPanel(): Promise<void> {
  const list = historyList();
  const empty = historyEmpty();
  if (!list) return;

  const items = await listConversations();
  list.innerHTML = '';

  if (empty) empty.hidden = items.length > 0;

  for (const conv of items) {
    const li = document.createElement('li');
    li.className = 'lc-history-item';
    if (conv.id === currentConversationId) li.classList.add('lc-history-item--active');

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'lc-history-open';
    openBtn.dataset.id = conv.id;

    const title = document.createElement('span');
    title.className = 'lc-history-item-title';
    title.textContent = conv.title;

    const meta = document.createElement('span');
    meta.className = 'lc-history-item-meta';
    meta.textContent = formatConversationWhen(conv.updatedAt, getLocale());

    openBtn.append(title, meta);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'lc-history-delete';
    delBtn.dataset.id = conv.id;
    delBtn.textContent = t('deleteChat');
    delBtn.title = t('deleteChat');

    li.append(openBtn, delBtn);
    list.appendChild(li);
  }
}

async function persistCurrentConversation(): Promise<void> {
  const stored = messagesForStorage(messages);
  if (stored.length === 0) return;

  if (!currentConversationId) {
    currentConversationId = newConversationId();
    conversationCreatedAt = Date.now();
  }

  const conv: SavedConversation = {
    id: currentConversationId,
    title: titleFromMessages(messages, t('untitledChat')),
    messages: stored,
    locale: getLocale(),
    createdAt: conversationCreatedAt,
    updatedAt: Date.now(),
  };

  await upsertConversation(conv);
  await setActiveConversationId(currentConversationId);
  void renderHistoryPanel();
}

async function beginFreshChat(): Promise<void> {
  currentConversationId = newConversationId();
  conversationCreatedAt = Date.now();
  messages = [];
  clearAttachedContext();
  await createChatSession(getLocale());
  renderMessages();
  await setActiveConversationId(currentConversationId);
}

async function loadSavedConversation(
  saved: SavedConversation,
  options?: { skipLoading?: boolean },
): Promise<void> {
  if (!options?.skipLoading) showChatLoading('switch');

  currentConversationId = saved.id;
  conversationCreatedAt = saved.createdAt;
  messages = saved.messages.map((m) => ({
    id: msgId(),
    role: m.role,
    content: m.content,
  }));
  clearAttachedContext();
  try {
    await createChatSession(saved.locale, saved.messages);
    renderMessages();
    await setActiveConversationId(saved.id);
    closeHistoryPanel();
  } finally {
    if (!options?.skipLoading) hideChatLoading();
  }
}

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
  updateReadyStripLabel();
}

type ChatLoadingMode = 'prepare' | 'restore' | 'switch';

function showChatLoading(mode: ChatLoadingMode): void {
  const overlay = document.getElementById('chat-loading');
  const title = document.getElementById('chat-loading-title');
  const detail = document.getElementById('chat-loading-detail');
  const progress = overlay?.querySelector<HTMLElement>('.lc-progress-indeterminate');

  showChatPanel();

  if (title) title.textContent = t('stateReady');
  if (detail) {
    detail.textContent =
      mode === 'restore' ? t('stateRestoringDetail') : t('statePreparingDetail');
  }
  if (progress) progress.setAttribute('aria-label', t('statePreparingDetail'));

  overlay?.removeAttribute('hidden');
  chatPanel()?.classList.add('lc-chat--loading');
  chatInput()?.toggleAttribute('disabled', true);
  sendBtn()?.toggleAttribute('disabled', true);
  newChatBtn()?.toggleAttribute('disabled', true);
  document.getElementById('history-btn')?.toggleAttribute('disabled', true);
}

function hideChatLoading(): void {
  document.getElementById('chat-loading')?.setAttribute('hidden', '');
  chatPanel()?.classList.remove('lc-chat--loading');
  chatInput()?.toggleAttribute('disabled', false);
  sendBtn()?.toggleAttribute('disabled', false);
  newChatBtn()?.toggleAttribute('disabled', false);
  document.getElementById('history-btn')?.toggleAttribute('disabled', false);
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
  if (attachBtn) {
    attachBtn.textContent = t('useThisPage');
    attachBtn.title = t('useThisPageHint');
  }
  const selBtn = document.getElementById('attach-selection-btn');
  if (selBtn) {
    selBtn.textContent = t('useSelection');
    selBtn.title = t('useSelectionHint');
  }
  const attachDocBtn = document.getElementById('attach-document-btn');
  if (attachDocBtn) {
    attachDocBtn.textContent = t('attachDocument');
    attachDocBtn.title = t('attachDocumentHint');
  }
  const attachImgBtn = document.getElementById('attach-image-btn');
  if (attachImgBtn) {
    attachImgBtn.textContent = t('attachImage');
    attachImgBtn.title = t('attachImageHint');
  }
  const attachHint = document.getElementById('attach-hint');
  if (attachHint) attachHint.textContent = t('attachToolsHint');
  const resizeHandle = document.getElementById('chat-resize-handle');
  if (resizeHandle) resizeHandle.setAttribute('aria-label', t('resizeHandleLabel'));
  const clearCtx = document.getElementById('context-clear');
  if (clearCtx) clearCtx.textContent = t('removeContext');
  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) historyBtn.textContent = t('history');
  updateContextBar();
}

function revokeContextThumb(): void {
  if (contextThumbUrl) {
    URL.revokeObjectURL(contextThumbUrl);
    contextThumbUrl = null;
  }
}

function updateContextBar(): void {
  const bar = contextBar();
  const chip = contextChip();
  const thumb = document.getElementById('context-thumb') as HTMLImageElement | null;
  if (!bar || !chip) return;

  revokeContextThumb();

  if (attachedContext) {
    bar.hidden = false;
    chip.textContent = formatContextChip(attachedContext, getLocale());
    if (thumb) {
      if (attachedContext.kind === 'image' && attachedContext.imageBlob) {
        contextThumbUrl = URL.createObjectURL(attachedContext.imageBlob);
        thumb.src = contextThumbUrl;
        thumb.hidden = false;
      } else {
        thumb.hidden = true;
        thumb.removeAttribute('src');
      }
    }
  } else {
    bar.hidden = true;
    chip.textContent = '';
    if (thumb) {
      thumb.hidden = true;
      thumb.removeAttribute('src');
    }
  }
}

function clearAttachedContext(): void {
  attachedContext = null;
  updateContextBar();
}

function pageExtractErrorMessage(error: string): string {
  switch (error) {
    case 'restricted':
      return t('errorPageRestricted');
    case 'empty':
      return t('errorPageEmpty');
    case 'no_selection':
      return t('errorNoSelection');
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

  attachedContext = result.context;
  updateContextBar();
  messages.push({ id: msgId(), role: 'assistant', content: t('pageAttachedHint') });
  renderMessages();
  void persistCurrentConversation();
  chatInput()?.focus();
}

async function attachActiveSelection(): Promise<void> {
  if (streaming) return;

  const result = await extractActiveTabSelection();
  if (!result.ok) {
    messages.push({
      id: msgId(),
      role: 'error',
      content: pageExtractErrorMessage(result.error),
    });
    renderMessages();
    return;
  }

  attachedContext = result.context;
  updateContextBar();
  messages.push({ id: msgId(), role: 'assistant', content: t('selectionAttachedHint') });
  renderMessages();
  void persistCurrentConversation();
  chatInput()?.focus();
}

async function attachDocumentFromFile(file: File): Promise<void> {
  if (streaming) return;

  const result = await parseDocumentFile(file);
  if (!result.ok) {
    messages.push({
      id: msgId(),
      role: 'error',
      content: fileErrorMessage(result.error, t),
    });
    renderMessages();
    return;
  }

  attachedContext = result.context;
  updateContextBar();
  messages.push({ id: msgId(), role: 'assistant', content: t('documentAttachedHint') });
  renderMessages();
  void persistCurrentConversation();
  chatInput()?.focus();
}

async function attachImageFromFile(file: File): Promise<void> {
  if (streaming) return;

  const result = await parseImageFile(file);
  if (!result.ok) {
    messages.push({
      id: msgId(),
      role: 'error',
      content: fileErrorMessage(result.error, t),
    });
    renderMessages();
    return;
  }

  attachedContext = result.context;
  updateContextBar();
  messages.push({ id: msgId(), role: 'assistant', content: t('imageAttachedHint') });
  renderMessages();
  void persistCurrentConversation();
  chatInput()?.focus();
}

export async function initChatSession(): Promise<void> {
  const active = await getActiveConversation();
  const restoring = Boolean(active?.messages.length);
  showChatLoading(restoring ? 'restore' : 'prepare');

  try {
    if (restoring && active) {
      await loadSavedConversation(active, { skipLoading: true });
    } else {
      await beginFreshChat();
    }
    void renderHistoryPanel();
  } finally {
    hideChatLoading();
    chatInput()?.focus();
  }
}

export async function startNewChat(): Promise<void> {
  if (streaming) return;
  promptAbort?.abort();
  await persistCurrentConversation();
  await beginFreshChat();
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

  if (isPageActionRequest(trimmed) && (!attachedContext || attachedContext.kind !== 'page')) {
    await replyWithText(assistantId, t('attachPageFirst'));
    setWriting(false);
    void persistCurrentConversation();
    chatInput()?.focus();
    return;
  }

  if (
    isSelectionActionRequest(trimmed) &&
    (!attachedContext || attachedContext.kind !== 'selection')
  ) {
    await replyWithText(assistantId, t('attachSelectionFirst'));
    setWriting(false);
    void persistCurrentConversation();
    chatInput()?.focus();
    return;
  }

  if (isImageActionRequest(trimmed) && (!attachedContext || attachedContext.kind !== 'image')) {
    await replyWithText(assistantId, t('attachImageFirst'));
    setWriting(false);
    void persistCurrentConversation();
    chatInput()?.focus();
    return;
  }

  if (
    isDocumentActionRequest(trimmed) &&
    (!attachedContext || attachedContext.kind !== 'document')
  ) {
    await replyWithText(assistantId, t('attachDocumentFirst'));
    setWriting(false);
    void persistCurrentConversation();
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
      void persistCurrentConversation();
      chatInput()?.focus();
    }
    return;
  }

  promptAbort = new AbortController();
  const modelPrompt = attachedContext
    ? buildPromptWithContext(trimmed, attachedContext)
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
    void persistCurrentConversation();
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

  document.getElementById('history-btn')?.addEventListener('click', () => {
    const panel = historyPanel();
    if (!panel) return;
    if (panel.hasAttribute('hidden')) openHistoryPanel();
    else closeHistoryPanel();
  });

  document.getElementById('history-close')?.addEventListener('click', () => {
    closeHistoryPanel();
  });

  historyList()?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const openEl = target.closest<HTMLElement>('.lc-history-open');
    if (openEl?.dataset.id) {
      if (streaming) return;
      void (async () => {
        const conv = (await listConversations()).find((c) => c.id === openEl.dataset.id);
        if (!conv) return;
        promptAbort?.abort();
        await loadSavedConversation(conv);
        chatInput()?.focus();
      })();
      return;
    }

    const delEl = target.closest<HTMLElement>('.lc-history-delete');
    if (delEl?.dataset.id) {
      if (!window.confirm(t('deleteChatConfirm'))) return;
      void (async () => {
        const id = delEl.dataset.id!;
        await deleteConversation(id);
        if (currentConversationId === id) {
          currentConversationId = null;
          await setActiveConversationId(null);
        }
        await renderHistoryPanel();
      })();
    }
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

  document.getElementById('attach-selection-btn')?.addEventListener('click', () => {
    void attachActiveSelection();
  });

  document.getElementById('attach-document-btn')?.addEventListener('click', () => {
    document.getElementById('document-file-input')?.click();
  });

  document.getElementById('attach-image-btn')?.addEventListener('click', () => {
    document.getElementById('image-file-input')?.click();
  });

  document.getElementById('document-file-input')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void attachDocumentFromFile(file);
  });

  document.getElementById('image-file-input')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void attachImageFromFile(file);
  });

  document.getElementById('context-clear')?.addEventListener('click', () => {
    clearAttachedContext();
    chatInput()?.focus();
  });
}

export function refreshChatLabels(): void {
  applyChatStaticLabels();
  const indicator = writingIndicator();
  if (indicator && !indicator.hidden) indicator.textContent = t('writing');
  void renderHistoryPanel();
}

export function updateReadyStripLabel(): void {
  const label = document.getElementById('ready-strip-label');
  if (label) label.textContent = t('stateReady');
}

export async function onLocaleChangeForChat(locale: Locale): Promise<void> {
  refreshChatLabels();
  if (!streaming && messages.length === 0) {
    await createChatSession(locale);
  }
}

export function teardownChat(): void {
  promptAbort?.abort();
  clearAttachedContext();
  revokeContextThumb();
  destroyWarmSession();
}
