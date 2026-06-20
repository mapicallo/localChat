import { loadLocale, saveLocale, type Locale } from './storage.js';

export type MessageKey =
  | 'tagline'
  | 'stateChecking'
  | 'stateCheckingDetail'
  | 'stateDownloadable'
  | 'stateDownloadableDetail'
  | 'stateDownloading'
  | 'stateDownloadingDetail'
  | 'stateReady'
  | 'stateReadyDetail'
  | 'stateUnavailable'
  | 'stateUnavailableDetail'
  | 'stateNoApi'
  | 'stateNoApiDetail'
  | 'progressLabel'
  | 'retry'
  | 'reqTitle'
  | 'reqChrome'
  | 'reqOs'
  | 'reqRam'
  | 'reqStorage'
  | 'reqFlags'
  | 'docsLink'
  | 'localeEn'
  | 'localeEs';

const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  en: {
    tagline: 'Local AI chat — no cloud upload',
    stateChecking: 'Checking on-device AI…',
    stateCheckingDetail: 'Verifying Gemini Nano availability in Chrome.',
    stateDownloadable: 'Model ready to download',
    stateDownloadableDetail:
      'Chrome will download Gemini Nano once. After that, chat works offline on this device.',
    stateDownloading: 'Downloading on-device model…',
    stateDownloadingDetail: 'This may take a few minutes. Keep Chrome open.',
    stateReady: 'Local AI is ready',
    stateReadyDetail: 'Gemini Nano is loaded. Phase 2 will enable chat here.',
    stateUnavailable: 'On-device AI not available',
    stateUnavailableDetail:
      'This device or Chrome setup does not meet the requirements for Gemini Nano.',
    stateNoApi: 'Built-in AI API not found',
    stateNoApiDetail:
      'Update to Chrome 138+ on desktop, or enable Prompt API flags for development.',
    progressLabel: 'Download progress',
    retry: 'Check again',
    reqTitle: 'Typical requirements',
    reqChrome: 'Chrome 138+ (desktop)',
    reqOs: 'Windows 10/11, macOS 13+, Linux, or Chromebook Plus',
    reqRam: '16 GB RAM (CPU) or GPU with more than 4 GB VRAM',
    reqStorage: '~22 GB free space on the Chrome profile volume',
    reqFlags: 'Dev: enable #prompt-api-for-gemini-nano in chrome://flags',
    docsLink: 'Chrome built-in AI docs',
    localeEn: 'English',
    localeEs: 'Español',
  },
  es: {
    tagline: 'Chat con IA local — sin subir nada a la nube',
    stateChecking: 'Comprobando IA en el dispositivo…',
    stateCheckingDetail: 'Verificando si Gemini Nano está disponible en Chrome.',
    stateDownloadable: 'Modelo listo para descargar',
    stateDownloadableDetail:
      'Chrome descargará Gemini Nano una vez. Después podrás chatear sin nube en este equipo.',
    stateDownloading: 'Descargando modelo local…',
    stateDownloadingDetail: 'Puede tardar unos minutos. Mantén Chrome abierto.',
    stateReady: 'IA local lista',
    stateReadyDetail: 'Gemini Nano está cargado. La Fase 2 activará el chat aquí.',
    stateUnavailable: 'IA en dispositivo no disponible',
    stateUnavailableDetail:
      'Este equipo o configuración de Chrome no cumple los requisitos de Gemini Nano.',
    stateNoApi: 'API de IA integrada no encontrada',
    stateNoApiDetail:
      'Actualiza a Chrome 138+ en escritorio, o activa los flags de Prompt API en desarrollo.',
    progressLabel: 'Progreso de descarga',
    retry: 'Comprobar de nuevo',
    reqTitle: 'Requisitos habituales',
    reqChrome: 'Chrome 138+ (escritorio)',
    reqOs: 'Windows 10/11, macOS 13+, Linux o Chromebook Plus',
    reqRam: '16 GB RAM (CPU) o GPU con más de 4 GB VRAM',
    reqStorage: '~22 GB libres en el volumen del perfil de Chrome',
    reqFlags: 'Dev: activar #prompt-api-for-gemini-nano en chrome://flags',
    docsLink: 'Documentación de IA integrada en Chrome',
    localeEn: 'English',
    localeEs: 'Español',
  },
};

let currentLocale: Locale = 'en';

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: MessageKey): string {
  return MESSAGES[currentLocale][key];
}

export async function initI18n(): Promise<Locale> {
  currentLocale = await loadLocale();
  return currentLocale;
}

export async function setLocale(locale: Locale): Promise<void> {
  currentLocale = locale;
  await saveLocale(locale);
}

export function applyStaticTranslations(root: ParentNode): void {
  const tagline = root.querySelector<HTMLElement>('[data-i18n="tagline"]');
  if (tagline) tagline.textContent = t('tagline');

  const retry = root.querySelector<HTMLButtonElement>('#retry-btn');
  if (retry) retry.textContent = t('retry');

  const docs = root.querySelector<HTMLAnchorElement>('#docs-link');
  if (docs) docs.textContent = t('docsLink');

  const reqTitle = root.querySelector<HTMLElement>('#req-title');
  if (reqTitle) reqTitle.textContent = t('reqTitle');

  for (const [id, key] of [
    ['req-chrome', 'reqChrome'],
    ['req-os', 'reqOs'],
    ['req-ram', 'reqRam'],
    ['req-storage', 'reqStorage'],
    ['req-flags', 'reqFlags'],
  ] as const) {
    const el = root.querySelector<HTMLElement>(`#${id}`);
    if (el) el.textContent = t(key);
  }

  const progressLabel = root.querySelector<HTMLElement>('#progress-label');
  if (progressLabel) progressLabel.textContent = t('progressLabel');
}
