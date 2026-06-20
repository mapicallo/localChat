import type { Locale } from './storage.js';

export type StoredMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type SavedConversation = {
  id: string;
  title: string;
  messages: StoredMessage[];
  locale: Locale;
  createdAt: number;
  updatedAt: number;
};

const CONVERSATIONS_KEY = 'lc_conversations';
const ACTIVE_ID_KEY = 'lc_active_conversation_id';
export const MAX_CONVERSATIONS = 40;
export const MAX_STORED_MESSAGES = 120;

export function newConversationId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listConversations(): Promise<SavedConversation[]> {
  try {
    const data = await chrome.storage.local.get(CONVERSATIONS_KEY);
    const raw = data[CONVERSATIONS_KEY];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c): c is SavedConversation => Boolean(c && typeof c.id === 'string'))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getActiveConversationId(): Promise<string | null> {
  try {
    const data = await chrome.storage.local.get(ACTIVE_ID_KEY);
    const id = data[ACTIVE_ID_KEY];
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

export async function getActiveConversation(): Promise<SavedConversation | null> {
  const id = await getActiveConversationId();
  if (!id) return null;
  const all = await listConversations();
  return all.find((c) => c.id === id) ?? null;
}

export async function getConversation(id: string): Promise<SavedConversation | null> {
  const all = await listConversations();
  return all.find((c) => c.id === id) ?? null;
}

export async function setActiveConversationId(id: string | null): Promise<void> {
  if (id) {
    await chrome.storage.local.set({ [ACTIVE_ID_KEY]: id });
  } else {
    await chrome.storage.local.remove(ACTIVE_ID_KEY);
  }
}

export async function upsertConversation(conversation: SavedConversation): Promise<void> {
  const all = await listConversations();
  const idx = all.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) all[idx] = conversation;
  else all.unshift(conversation);

  const trimmed = all
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CONVERSATIONS);

  await chrome.storage.local.set({ [CONVERSATIONS_KEY]: trimmed });
}

export async function deleteConversation(id: string): Promise<void> {
  const all = await listConversations();
  const next = all.filter((c) => c.id !== id);
  await chrome.storage.local.set({ [CONVERSATIONS_KEY]: next });
  const active = await getActiveConversationId();
  if (active === id) await setActiveConversationId(null);
}

export function messagesForStorage(
  messages: Array<{ role: string; content: string }>,
): StoredMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .filter((m) => m.content.trim())
    .slice(-MAX_STORED_MESSAGES)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

export function titleFromMessages(
  messages: Array<{ role: string; content: string }>,
  fallback: string,
): string {
  const first = messages.find((m) => m.role === 'user' && m.content.trim());
  if (!first) return fallback;
  const text = first.content.trim().replace(/\s+/g, ' ');
  return text.length > 52 ? `${text.slice(0, 49)}…` : text;
}

export function formatConversationWhen(ts: number, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === 'es' ? 'es' : 'en', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(ts);
  } catch {
    return new Date(ts).toLocaleString();
  }
}
