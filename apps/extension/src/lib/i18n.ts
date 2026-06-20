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
  | 'localeEs'
  | 'newChat'
  | 'send'
  | 'stop'
  | 'writing'
  | 'composerHint'
  | 'errorGeneric'
  | 'errorQuota'
  | 'welcomeTitle'
  | 'welcomeBody'
  | 'useThisPage'
  | 'attachPageConfirm'
  | 'attachPageFirst'
  | 'removeContext'
  | 'errorPageRestricted'
  | 'errorPageEmpty'
  | 'errorPageNoTab'
  | 'errorPageScript'
  | 'pageAttachedHint'
  | 'privacyLink'
  | 'messageInputLabel'
  | 'ai4contextFamily';

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
    stateReadyDetail: 'Starting chat…',
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
    newChat: 'New chat',
    send: 'Send',
    stop: 'Stop',
    writing: 'Writing…',
    composerHint: 'Enter or Ctrl+Enter to send · Shift+Enter for new line',
    errorGeneric: 'Something went wrong. Try again or start a new chat.',
    errorQuota: 'Context limit reached. Start a new chat to continue.',
    welcomeTitle: 'Local chat on your device',
    welcomeBody: 'Ask anything. Replies stay on this computer—nothing is sent to the cloud.',
    useThisPage: 'Use this page',
    attachPageConfirm:
      'LocalChat will read visible text from the active tab in this window (not your files). Continue?',
    attachPageFirst:
      'Attach the page first: click “Use this page” in the toolbar, then ask your question (e.g. summarize).',
    removeContext: 'Remove page context',
    errorPageRestricted: 'This page cannot be read (browser internal or store page). Open a normal website and try again.',
    errorPageEmpty: 'No readable text found on this tab.',
    errorPageNoTab: 'No active tab found in this window.',
    errorPageScript: 'Could not read this tab. Reload the page and try again.',
    pageAttachedHint: 'Page attached. Ask a question or type “Summarize this page”.',
    privacyLink: 'Privacy policy',
    messageInputLabel: 'Message',
    ai4contextFamily: 'Part of AI4Context',
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
    stateReadyDetail: 'Iniciando chat…',
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
    newChat: 'Nueva conversación',
    send: 'Enviar',
    stop: 'Detener',
    writing: 'Escribiendo…',
    composerHint: 'Enter o Ctrl+Enter para enviar · Shift+Enter nueva línea',
    errorGeneric: 'Algo falló. Inténtalo de nuevo o abre una conversación nueva.',
    errorQuota: 'Límite de contexto alcanzado. Abre una conversación nueva para seguir.',
    welcomeTitle: 'Chat local en tu equipo',
    welcomeBody: 'Pregunta lo que quieras. Las respuestas se quedan en este ordenador—nada va a la nube.',
    useThisPage: 'Usar esta página',
    attachPageConfirm:
      'LocalChat leerá el texto visible de la pestaña activa en esta ventana (no tus archivos). ¿Continuar?',
    attachPageFirst:
      'Primero adjunta la página: pulsa «Usar esta página» en la barra y luego pregunta (p. ej. «Resume esta página»).',
    removeContext: 'Quitar contexto de página',
    errorPageRestricted:
      'No se puede leer esta página (interna del navegador o tienda). Abre un sitio web normal e inténtalo de nuevo.',
    errorPageEmpty: 'No hay texto legible en esta pestaña.',
    errorPageNoTab: 'No hay pestaña activa en esta ventana.',
    errorPageScript: 'No se pudo leer la pestaña. Recarga la página e inténtalo de nuevo.',
    pageAttachedHint: 'Página adjunta. Pregunta lo que quieras o escribe «Resume esta página».',
    privacyLink: 'Política de privacidad',
    messageInputLabel: 'Mensaje',
    ai4contextFamily: 'Parte de AI4Context',
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

  const newChat = root.querySelector<HTMLButtonElement>('#new-chat-btn');
  if (newChat) newChat.textContent = t('newChat');

  const send = root.querySelector<HTMLButtonElement>('#send-btn');
  if (send) send.textContent = t('send');

  const stop = root.querySelector<HTMLButtonElement>('#stop-btn');
  if (stop) stop.textContent = t('stop');

  const hint = root.querySelector<HTMLElement>('#composer-hint');
  if (hint) hint.textContent = t('composerHint');

  const welcomeTitle = root.querySelector<HTMLElement>('#welcome-title');
  if (welcomeTitle) welcomeTitle.textContent = t('welcomeTitle');

  const welcomeBody = root.querySelector<HTMLElement>('#welcome-body');
  if (welcomeBody) welcomeBody.textContent = t('welcomeBody');

  const attachBtn = root.querySelector<HTMLButtonElement>('#attach-page-btn');
  if (attachBtn) attachBtn.textContent = t('useThisPage');

  const clearCtx = root.querySelector<HTMLButtonElement>('#context-clear');
  if (clearCtx) clearCtx.setAttribute('aria-label', t('removeContext'));

  const privacy = root.querySelector<HTMLAnchorElement>('#privacy-link');
  if (privacy) privacy.textContent = t('privacyLink');

  const family = root.querySelector<HTMLElement>('#ai4context-family');
  if (family) family.textContent = t('ai4contextFamily');

  const chatInput = root.querySelector<HTMLTextAreaElement>('#chat-input');
  if (chatInput) chatInput.setAttribute('aria-label', t('messageInputLabel'));
}
