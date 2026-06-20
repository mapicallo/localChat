/**
 * Prompt API / Gemini Nano — availability, session lifecycle, streaming prompts.
 */
import { MODEL_LANG_OPTIONS } from './modelOptions.js';
import { getSystemPrompt } from './systemPrompt.js';
import type { Locale } from './storage.js';

export type ModelUiState =
  | 'checking'
  | 'unavailable'
  | 'no-api'
  | 'downloadable'
  | 'downloading'
  | 'ready';

export type AvailabilityKind = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export type DownloadProgressHandler = (loadedRatio: number) => void;

export type LocalChatSession = {
  prompt?: (input: string, options?: { signal?: AbortSignal }) => Promise<string>;
  promptStreaming: (
    input: string,
    options?: { signal?: AbortSignal },
  ) => ReadableStream<string> & AsyncIterable<string>;
  destroy?: () => void;
};

type CreateOptions = {
  monitor?: (m: {
    addEventListener: (type: 'downloadprogress', fn: (e: { loaded: number }) => void) => void;
  }) => void;
  signal?: AbortSignal;
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  systemPrompt?: string;
};

type LanguageModelGlobal = {
  availability?: (options?: typeof MODEL_LANG_OPTIONS) => Promise<string>;
  create?: (options?: CreateOptions) => Promise<LocalChatSession>;
};

let warmSession: LocalChatSession | null = null;
let warmAbort: AbortController | null = null;

function languageModelGlobal(): LanguageModelGlobal | undefined {
  return (globalThis as unknown as { LanguageModel?: LanguageModelGlobal }).LanguageModel;
}

function aiLanguageModelFactory():
  | {
      capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
      create: (options?: CreateOptions) => Promise<LocalChatSession>;
    }
  | undefined {
  const ai = (globalThis as unknown as { ai?: { languageModel?: unknown } }).ai;
  return ai?.languageModel as ReturnType<typeof aiLanguageModelFactory>;
}

function mapLanguageModelStatus(status: string): AvailabilityKind {
  if (status === 'available' || status === 'readily') return 'available';
  if (status === 'downloadable' || status === 'after-download') return 'downloadable';
  if (status === 'downloading') return 'downloading';
  return 'unavailable';
}

function buildMonitor(onProgress?: DownloadProgressHandler) {
  return (m: {
    addEventListener: (type: 'downloadprogress', fn: (e: { loaded: number }) => void) => void;
  }) => {
    m.addEventListener('downloadprogress', (e) => {
      const ratio = typeof e.loaded === 'number' ? Math.min(1, Math.max(0, e.loaded)) : 0;
      onProgress?.(ratio);
    });
  };
}

async function createSession(
  options: CreateOptions,
): Promise<LocalChatSession> {
  const LM = languageModelGlobal();
  if (LM?.create) return LM.create(options);

  const factory = aiLanguageModelFactory();
  if (factory?.create) return factory.create(options);

  throw new Error('NO_LANGUAGE_MODEL_API');
}

export function hasLanguageModelApi(): boolean {
  return Boolean(languageModelGlobal()?.availability ?? aiLanguageModelFactory()?.capabilities);
}

export async function queryAvailability(): Promise<AvailabilityKind> {
  const LM = languageModelGlobal();
  if (LM?.availability) {
    const status = await LM.availability(MODEL_LANG_OPTIONS);
    return mapLanguageModelStatus(status);
  }

  const factory = aiLanguageModelFactory();
  if (factory?.capabilities) {
    const caps = await factory.capabilities();
    return mapLanguageModelStatus(caps.available);
  }

  return 'unavailable';
}

/** Download / load model (no system prompt yet). */
export async function warmUpModel(onProgress?: DownloadProgressHandler): Promise<void> {
  if (warmSession) return;

  warmAbort?.abort();
  warmAbort = new AbortController();

  warmSession = await createSession({
    monitor: buildMonitor(onProgress),
    signal: warmAbort.signal,
  });
}

/** Chat session with system prompt for the selected UI locale. */
export async function createChatSession(locale: Locale): Promise<LocalChatSession> {
  destroyWarmSession();

  warmAbort = new AbortController();
  const systemText = getSystemPrompt(locale);

  const LM = languageModelGlobal();
  if (LM?.create) {
    warmSession = await createSession({
      signal: warmAbort.signal,
      initialPrompts: [{ role: 'system', content: systemText }],
    });
    return warmSession;
  }

  warmSession = await createSession({
    signal: warmAbort.signal,
    systemPrompt: systemText,
  });
  return warmSession;
}

export function getWarmSession(): LocalChatSession | null {
  return warmSession;
}

export function destroyWarmSession(): void {
  warmAbort?.abort();
  warmAbort = null;
  try {
    warmSession?.destroy?.();
  } catch {
    /* ignore */
  }
  warmSession = null;
}

export async function promptStreamingChat(
  text: string,
  onUpdate: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const session = warmSession;
  if (!session?.promptStreaming) throw new Error('NO_SESSION');

  const stream = session.promptStreaming(text.trim(), { signal });
  let full = '';

  for await (const chunk of stream) {
    full += chunk;
    onUpdate(full);
  }

  return full;
}
