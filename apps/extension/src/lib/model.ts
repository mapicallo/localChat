/**
 * Prompt API / Gemini Nano — availability check and warm-up session.
 * Supports LanguageModel (Chrome 138+) and self.ai.languageModel (typed explainer).
 */
import { MODEL_LANG_OPTIONS } from './modelOptions.js';

export type ModelUiState =
  | 'checking'
  | 'unavailable'
  | 'no-api'
  | 'downloadable'
  | 'downloading'
  | 'ready';

export type AvailabilityKind = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export type DownloadProgressHandler = (loadedRatio: number) => void;

type LanguageModelGlobal = {
  availability?: (options?: typeof MODEL_LANG_OPTIONS) => Promise<string>;
  create?: (options?: {
    monitor?: (m: {
      addEventListener: (type: 'downloadprogress', fn: (e: { loaded: number }) => void) => void;
    }) => void;
    signal?: AbortSignal;
  }) => Promise<unknown>;
};

let warmSession: unknown | null = null;
let warmAbort: AbortController | null = null;

function languageModelGlobal(): LanguageModelGlobal | undefined {
  return (globalThis as unknown as { LanguageModel?: LanguageModelGlobal }).LanguageModel;
}

function aiLanguageModelFactory():
  | {
      capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
      create: (options?: {
        monitor?: (m: {
          addEventListener: (type: 'downloadprogress', fn: (e: { loaded: number }) => void) => void;
        }) => void;
        signal?: AbortSignal;
      }) => Promise<unknown>;
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

/** Returns whether any built-in language model API exists in this context. */
export function hasLanguageModelApi(): boolean {
  return Boolean(languageModelGlobal()?.availability ?? aiLanguageModelFactory()?.capabilities);
}

/** Query model availability without downloading. */
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

/**
 * Create / download the on-device model. Resolves when the session is ready for prompts.
 */
export async function warmUpModel(onProgress?: DownloadProgressHandler): Promise<void> {
  if (warmSession) return;

  warmAbort?.abort();
  warmAbort = new AbortController();

  const monitor = (m: {
    addEventListener: (type: 'downloadprogress', fn: (e: { loaded: number }) => void) => void;
  }) => {
    m.addEventListener('downloadprogress', (e) => {
      const ratio = typeof e.loaded === 'number' ? Math.min(1, Math.max(0, e.loaded)) : 0;
      onProgress?.(ratio);
    });
  };

  const createOpts = { monitor, signal: warmAbort.signal };

  const LM = languageModelGlobal();
  if (LM?.create) {
    warmSession = await LM.create(createOpts);
    return;
  }

  const factory = aiLanguageModelFactory();
  if (factory?.create) {
    warmSession = await factory.create(createOpts);
    return;
  }

  throw new Error('NO_LANGUAGE_MODEL_API');
}

/** Session kept warm after Phase 1 for Phase 2 chat. */
export function getWarmSession(): unknown | null {
  return warmSession;
}

export function destroyWarmSession(): void {
  warmAbort?.abort();
  warmAbort = null;
  const session = warmSession as { destroy?: () => void } | null;
  try {
    session?.destroy?.();
  } catch {
    /* ignore */
  }
  warmSession = null;
}
