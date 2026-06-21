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
  | 'statePreparingDetail'
  | 'stateRestoringDetail'
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
  | 'history'
  | 'historyTitle'
  | 'historyEmpty'
  | 'historyCloseLabel'
  | 'deleteChat'
  | 'deleteChatConfirm'
  | 'untitledChat'
  | 'savedChatsHint'
  | 'send'
  | 'stop'
  | 'writing'
  | 'composerHint'
  | 'errorGeneric'
  | 'errorQuota'
  | 'welcomeTitle'
  | 'welcomeBody'
  | 'useThisPage'
  | 'useThisPageHint'
  | 'useSelection'
  | 'useSelectionHint'
  | 'attachDocument'
  | 'attachDocumentHint'
  | 'attachImage'
  | 'attachImageHint'
  | 'attachDocumentFirst'
  | 'attachImageFirst'
  | 'documentAttachedHint'
  | 'imageAttachedHint'
  | 'errorFileTooLarge'
  | 'errorFileUnsupported'
  | 'errorFileEmpty'
  | 'errorPdfFailed'
  | 'errorImageFailed'
  | 'errorFileRead'
  | 'attachToolsHint'
  | 'resizeHandleLabel'
  | 'attachPageConfirm'
  | 'attachPageFirst'
  | 'attachSelectionFirst'
  | 'selectionAttachedHint'
  | 'errorNoSelection'
  | 'removeContext'
  | 'errorPageRestricted'
  | 'errorPageEmpty'
  | 'errorPageNoTab'
  | 'errorPageScript'
  | 'pageAttachedHint'
  | 'privacyLink'
  | 'messageInputLabel'
  | 'langLabel'
  | 'appSubtitle'
  | 'footerByPrefix'
  | 'footerSupport';

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
    statePreparingDetail: 'Preparing chat session—almost there…',
    stateRestoringDetail: 'Restoring your saved conversation…',
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
    history: 'History',
    historyTitle: 'Saved conversations',
    historyEmpty: 'No saved conversations yet. Your chats are stored on this device only.',
    historyCloseLabel: 'Close history',
    deleteChat: 'Delete',
    deleteChatConfirm: 'Delete this saved conversation?',
    untitledChat: 'New conversation',
    savedChatsHint: 'Conversations are saved locally on this device. Open History to restore one.',
    send: 'Send',
    stop: 'Stop',
    writing: 'Writing…',
    composerHint: 'Enter or Ctrl+Enter to send · Shift+Enter for new line',
    errorGeneric: 'Something went wrong. Try again or start a new chat.',
    errorQuota: 'Context limit reached. Start a new chat to continue.',
    welcomeTitle: 'Local chat on your device',
    welcomeBody: 'Ask anything. Replies stay on this computer—nothing is sent to the cloud.',
    useThisPage: 'Use this page',
    useThisPageHint: 'Attach visible text from the browser tab you were on when you opened LocalChat.',
    useSelection: 'Use selection',
    useSelectionHint: 'Highlight text on the page, then click to attach only that fragment.',
    attachDocument: 'Attach document',
    attachDocumentHint: 'Pick a local PDF or text file. Text is extracted on this device only.',
    attachImage: 'Attach image',
    attachImageHint: 'Pick a local PNG, JPEG, WebP, or GIF. Processed on this device only.',
    attachDocumentFirst:
      'Attach a document first: click “Attach document” in the toolbar, then ask your question.',
    attachImageFirst:
      'Attach an image first: click “Attach image” in the toolbar, then ask your question.',
    documentAttachedHint:
      'Document attached. Ask a question or e.g. “Summarize this document”.',
    imageAttachedHint:
      'Image attached. Ask a question or e.g. “Describe this image”.',
    errorFileTooLarge: 'File is too large. Try a smaller file (max ~8 MB for images, ~16 MB for documents).',
    errorFileUnsupported: 'Unsupported file type. Use PDF, text, Markdown, CSV, JSON, or common image formats.',
    errorFileEmpty: 'No readable text found in this file.',
    errorPdfFailed: 'Could not read this PDF. Try a text export or another file.',
    errorImageFailed: 'Could not load this image. Try PNG, JPEG, WebP, or GIF.',
    errorFileRead: 'Could not read this file. Try again with another file.',
    attachToolsHint:
      'Optional: attach page text, a selection, a local document, or an image—then ask your question. Everything stays on this device.',
    attachPageConfirm:
      'LocalChat will read visible text from the active tab in this window (not your files). Continue?',
    attachPageFirst:
      'Attach the page first: click “Use this page” in the toolbar, then ask your question (e.g. summarize).',
    attachSelectionFirst:
      'Highlight text on the page, click “Use selection” in the toolbar, then ask your question.',
    selectionAttachedHint:
      'Selection attached. Ask a question or e.g. “Explain this in simpler words”.',
    errorNoSelection:
      'No text is selected. Highlight a fragment on the page, then click “Use selection” again.',
    removeContext: 'Remove context',
    resizeHandleLabel: 'Drag to resize the chat area',
    errorPageRestricted: 'This page cannot be read (browser internal or store page). Open a normal website and try again.',
    errorPageEmpty: 'No readable text found on this tab.',
    errorPageNoTab: 'No active tab found in this window.',
    errorPageScript: 'Could not read this tab. Reload the page and try again.',
    pageAttachedHint: 'Page attached. Ask a question or type “Summarize this page”.',
    privacyLink: 'Privacy',
    messageInputLabel: 'Message',
    langLabel: 'Language',
    appSubtitle: 'By AI4Context',
    footerByPrefix: 'by',
    footerSupport: 'Support',
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
    statePreparingDetail: 'Preparando el chat—un momento…',
    stateRestoringDetail: 'Recuperando tu conversación guardada…',
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
    history: 'Historial',
    historyTitle: 'Conversaciones guardadas',
    historyEmpty: 'Aún no hay conversaciones guardadas. Se almacenan solo en este dispositivo.',
    historyCloseLabel: 'Cerrar historial',
    deleteChat: 'Eliminar',
    deleteChatConfirm: '¿Eliminar esta conversación guardada?',
    untitledChat: 'Nueva conversación',
    savedChatsHint: 'Las conversaciones se guardan en local. Abre Historial para recuperar una.',
    send: 'Enviar',
    stop: 'Detener',
    writing: 'Escribiendo…',
    composerHint: 'Enter o Ctrl+Enter para enviar · Shift+Enter nueva línea',
    errorGeneric: 'Algo falló. Inténtalo de nuevo o abre una conversación nueva.',
    errorQuota: 'Límite de contexto alcanzado. Abre una conversación nueva para seguir.',
    welcomeTitle: 'Chat local en tu equipo',
    welcomeBody: 'Pregunta lo que quieras. Las respuestas se quedan en este ordenador—nada va a la nube.',
    useThisPage: 'Usar esta página',
    useThisPageHint: 'Adjunta el texto visible de la pestaña del navegador al abrir LocalChat.',
    useSelection: 'Usar selección',
    useSelectionHint: 'Marca texto en la página y pulsa para adjuntar solo ese fragmento.',
    attachDocument: 'Adjuntar documento',
    attachDocumentHint: 'Elige un PDF o archivo de texto local. El texto se extrae solo en este dispositivo.',
    attachImage: 'Adjuntar imagen',
    attachImageHint: 'Elige PNG, JPEG, WebP o GIF local. Se procesa solo en este dispositivo.',
    attachDocumentFirst:
      'Primero adjunta un documento: pulsa «Adjuntar documento» en la barra y luego pregunta.',
    attachImageFirst:
      'Primero adjunta una imagen: pulsa «Adjuntar imagen» en la barra y luego pregunta.',
    documentAttachedHint:
      'Documento adjunto. Pregunta lo que quieras o p. ej. «Resume este documento».',
    imageAttachedHint:
      'Imagen adjunta. Pregunta lo que quieras o p. ej. «Describe esta imagen».',
    errorFileTooLarge: 'Archivo demasiado grande. Prueba uno más pequeño (máx. ~8 MB imágenes, ~16 MB documentos).',
    errorFileUnsupported: 'Tipo de archivo no admitido. Usa PDF, texto, Markdown, CSV, JSON o formatos de imagen habituales.',
    errorFileEmpty: 'No hay texto legible en este archivo.',
    errorPdfFailed: 'No se pudo leer este PDF. Prueba exportar a texto u otro archivo.',
    errorImageFailed: 'No se pudo cargar esta imagen. Prueba PNG, JPEG, WebP o GIF.',
    errorFileRead: 'No se pudo leer el archivo. Inténtalo con otro.',
    attachToolsHint:
      'Opcional: adjunta texto de página, selección, documento local o imagen—y luego pregunta. Todo se queda en este dispositivo.',
    attachPageConfirm:
      'LocalChat leerá el texto visible de la pestaña activa en esta ventana (no tus archivos). ¿Continuar?',
    attachPageFirst:
      'Primero adjunta la página: pulsa «Usar esta página» en la barra y luego pregunta (p. ej. «Resume esta página»).',
    attachSelectionFirst:
      'Marca texto en la página, pulsa «Usar selección» en la barra y luego pregunta.',
    selectionAttachedHint:
      'Selección adjunta. Pregunta lo que quieras o p. ej. «Explícalo más simple».',
    errorNoSelection:
      'No hay texto seleccionado. Marca un fragmento en la página y pulsa «Usar selección» de nuevo.',
    removeContext: 'Quitar contexto',
    resizeHandleLabel: 'Arrastra para cambiar el tamaño del chat',
    errorPageRestricted:
      'No se puede leer esta página (interna del navegador o tienda). Abre un sitio web normal e inténtalo de nuevo.',
    errorPageEmpty: 'No hay texto legible en esta pestaña.',
    errorPageNoTab: 'No hay pestaña activa en esta ventana.',
    errorPageScript: 'No se pudo leer la pestaña. Recarga la página e inténtalo de nuevo.',
    pageAttachedHint: 'Página adjunta. Pregunta lo que quieras o escribe «Resume esta página».',
    privacyLink: 'Privacidad',
    messageInputLabel: 'Mensaje',
    langLabel: 'Idioma',
    appSubtitle: 'Por AI4Context',
    footerByPrefix: 'por',
    footerSupport: 'Apoyar',
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

  const headerSubtitle = root.querySelector<HTMLElement>('#header-subtitle');
  if (headerSubtitle) headerSubtitle.textContent = t('appSubtitle');

  const langLabel = root.querySelector<HTMLElement>('#lang-label');
  if (langLabel) langLabel.textContent = t('langLabel');

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

  const historyBtn = root.querySelector<HTMLButtonElement>('#history-btn');
  if (historyBtn) historyBtn.textContent = t('history');

  const historyTitle = root.querySelector<HTMLElement>('#history-title');
  if (historyTitle) historyTitle.textContent = t('historyTitle');

  const historyEmpty = root.querySelector<HTMLElement>('#history-empty');
  if (historyEmpty) historyEmpty.textContent = t('historyEmpty');

  const historyClose = root.querySelector<HTMLButtonElement>('#history-close');
  if (historyClose) historyClose.setAttribute('aria-label', t('historyCloseLabel'));

  const savedHint = root.querySelector<HTMLElement>('#saved-chats-hint');
  if (savedHint) savedHint.textContent = t('savedChatsHint');

  const chatLoadingTitle = root.querySelector<HTMLElement>('#chat-loading-title');
  if (chatLoadingTitle) chatLoadingTitle.textContent = t('stateReady');

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
  if (attachBtn) {
    attachBtn.textContent = t('useThisPage');
    attachBtn.title = t('useThisPageHint');
  }

  const selBtn = root.querySelector<HTMLButtonElement>('#attach-selection-btn');
  if (selBtn) {
    selBtn.textContent = t('useSelection');
    selBtn.title = t('useSelectionHint');
  }

  const docBtn = root.querySelector<HTMLButtonElement>('#attach-document-btn');
  if (docBtn) {
    docBtn.textContent = t('attachDocument');
    docBtn.title = t('attachDocumentHint');
  }

  const imgBtn = root.querySelector<HTMLButtonElement>('#attach-image-btn');
  if (imgBtn) {
    imgBtn.textContent = t('attachImage');
    imgBtn.title = t('attachImageHint');
  }

  const attachHint = root.querySelector<HTMLElement>('#attach-hint');
  if (attachHint) attachHint.textContent = t('attachToolsHint');

  const resizeHandle = root.querySelector<HTMLElement>('#chat-resize-handle');
  if (resizeHandle) {
    resizeHandle.setAttribute('aria-label', t('resizeHandleLabel'));
  }

  const clearCtx = root.querySelector<HTMLButtonElement>('#context-clear');
  if (clearCtx) clearCtx.textContent = t('removeContext');

  const privacy = root.querySelector<HTMLAnchorElement>('#privacy-link');
  if (privacy) privacy.textContent = t('privacyLink');

  const footerSupport = root.querySelector<HTMLAnchorElement>('#footer-support');
  if (footerSupport) footerSupport.textContent = t('footerSupport');

  const footerByPrefix = root.querySelector<HTMLElement>('#footer-by-prefix');
  if (footerByPrefix) footerByPrefix.textContent = t('footerByPrefix');

  const chatInput = root.querySelector<HTMLTextAreaElement>('#chat-input');
  if (chatInput) chatInput.setAttribute('aria-label', t('messageInputLabel'));
}
