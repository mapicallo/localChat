import './sidepanel.css';
import { bindChatEvents, initChatSession, onLocaleChangeForChat, refreshChatLabels } from './lib/chatUi.js';
import { applyStaticTranslations, getLocale, initI18n, setLocale, t, type MessageKey } from './lib/i18n.js';
import {
  destroyWarmSession,
  getWarmSession,
  hasLanguageModelApi,
  queryAvailability,
  warmUpModel,
  type ModelUiState,
} from './lib/model.js';
import type { Locale } from './lib/storage.js';

const statusSection = document.getElementById('model-status') as HTMLElement | null;
const statusTitle = document.getElementById('status-title');
const statusDetail = document.getElementById('status-detail');
const progressWrap = document.getElementById('progress-wrap');
const progressBar = document.getElementById('download-progress') as HTMLProgressElement | null;
const requirements = document.getElementById('requirements');
const retryBtn = document.getElementById('retry-btn') as HTMLButtonElement | null;
const localeSelect = document.getElementById('locale-select') as HTMLSelectElement | null;
const spinner = document.querySelector<HTMLElement>('.lc-spinner');
const docsLink = document.getElementById('docs-link') as HTMLAnchorElement | null;

let running = false;
let chatReady = false;

function setUiState(state: ModelUiState): void {
  statusSection?.setAttribute('data-state', state);
  statusSection?.setAttribute('aria-busy', state === 'checking' || state === 'downloading' ? 'true' : 'false');
  if (spinner) spinner.hidden = state !== 'checking' && state !== 'downloading';
  if (progressWrap) progressWrap.hidden = state !== 'downloading';
  if (requirements) requirements.hidden = state !== 'unavailable' && state !== 'no-api';
  if (docsLink) docsLink.hidden = state !== 'unavailable' && state !== 'no-api';
  if (retryBtn) retryBtn.hidden = state === 'checking' || state === 'downloading';
}

function setStatus(titleKey: MessageKey, detailKey: MessageKey): void {
  if (statusTitle) statusTitle.textContent = t(titleKey);
  if (statusDetail) statusDetail.textContent = t(detailKey);
}

function setProgress(ratio: number): void {
  if (!progressBar) return;
  const pct = Math.round(ratio * 100);
  progressBar.value = pct;
  progressBar.textContent = `${pct}%`;
}

async function enterChat(): Promise<void> {
  if (chatReady) return;
  chatReady = true;
  setUiState('ready');
  setStatus('stateReady', 'stateReadyDetail');
  try {
    await initChatSession();
  } catch (err) {
    console.error('[LocalChat] chat init', err);
    chatReady = false;
    statusSection?.removeAttribute('hidden');
    document.getElementById('chat-panel')?.setAttribute('hidden', '');
    setUiState('unavailable');
    setStatus('stateUnavailable', 'stateUnavailableDetail');
  }
}

async function runAvailabilityFlow(): Promise<void> {
  if (running) return;
  running = true;
  retryBtn?.setAttribute('disabled', 'true');

  try {
    if (chatReady) return;

    setUiState('checking');
    setStatus('stateChecking', 'stateCheckingDetail');
    statusSection?.removeAttribute('hidden');
    document.getElementById('chat-panel')?.setAttribute('hidden', '');

    if (!hasLanguageModelApi()) {
      setUiState('no-api');
      setStatus('stateNoApi', 'stateNoApiDetail');
      return;
    }

    const availability = await queryAvailability();

    if (availability === 'unavailable') {
      setUiState('unavailable');
      setStatus('stateUnavailable', 'stateUnavailableDetail');
      return;
    }

    if (availability === 'available' && getWarmSession()) {
      await enterChat();
      return;
    }

    if (availability === 'downloadable') {
      setUiState('downloadable');
      setStatus('stateDownloadable', 'stateDownloadableDetail');
      await new Promise((r) => setTimeout(r, 600));
    }

    setUiState('downloading');
    setStatus('stateDownloading', 'stateDownloadingDetail');
    setProgress(0);

    destroyWarmSession();
    await warmUpModel((ratio) => {
      setUiState('downloading');
      setProgress(ratio);
    });

    await enterChat();
  } catch (err) {
    console.error('[LocalChat] model warm-up', err);
    setUiState('unavailable');
    setStatus('stateUnavailable', 'stateUnavailableDetail');
  } finally {
    running = false;
    retryBtn?.removeAttribute('disabled');
  }
}

async function refreshUi(): Promise<void> {
  applyStaticTranslations(document);
  refreshChatLabels();
  const state = statusSection?.getAttribute('data-state') as ModelUiState | null;
  const map: Partial<Record<ModelUiState, [MessageKey, MessageKey]>> = {
    checking: ['stateChecking', 'stateCheckingDetail'],
    downloadable: ['stateDownloadable', 'stateDownloadableDetail'],
    downloading: ['stateDownloading', 'stateDownloadingDetail'],
    ready: ['stateReady', 'stateReadyDetail'],
    unavailable: ['stateUnavailable', 'stateUnavailableDetail'],
    'no-api': ['stateNoApi', 'stateNoApiDetail'],
  };
  if (state && map[state]) {
    const [title, detail] = map[state]!;
    setStatus(title, detail);
  }
}

async function boot(): Promise<void> {
  await initI18n();
  bindChatEvents();

  if (localeSelect) {
    localeSelect.value = getLocale();
    localeSelect.addEventListener('change', async () => {
      const next = localeSelect.value === 'es' ? 'es' : 'en';
      await setLocale(next as Locale);
      document.documentElement.lang = next;
      await refreshUi();
      onLocaleChangeForChat(next);
    });
  }

  document.documentElement.lang = getLocale();
  applyStaticTranslations(document);

  retryBtn?.addEventListener('click', () => {
    chatReady = false;
    destroyWarmSession();
    void runAvailabilityFlow();
  });

  void runAvailabilityFlow();
}

void boot();
