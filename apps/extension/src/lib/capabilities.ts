/**
 * Canonical capability list and intent detection for honest replies.
 * Rule-based answers avoid model hallucination on limits.
 */
import { hasLanguageModelApi, queryAvailability } from './model.js';
import type { Locale } from './storage.js';

export type CapabilityIntent =
  | 'general'
  | 'files_os'
  | 'cloud_privacy'
  | 'offline'
  | 'page_content'
  | 'form_fill'
  | 'browser_scope';

const GENERAL_PATTERNS: RegExp[] = [
  /\bwhat can you do\b/i,
  /\bwhat are your (capabilities|limits|limitations)\b/i,
  /\bwhat do you do\b/i,
  /\bhow can you help\b/i,
  /\bqu[eé] puedes hacer\b/i,
  /\bqu[eé] sabes hacer\b/i,
  /\bcu[aá]les son tus (capacidades|l[ií]mites)\b/i,
  /\bpara qu[eé] sirves\b/i,
  /\bhelp me understand what you can\b/i,
];

const FILES_PATTERNS: RegExp[] = [
  /\b(read|access|open|see|browse).{0,30}(my )?(files?|folders?|documents?|disk|hard drive|downloads)\b/i,
  /\b(leer|acceder|abrir|ver|explorar).{0,30}(mis )?(archivos?|carpetas?|documentos?|disco|descargas)\b/i,
  /\bterminal\b/i,
  /\bcommand line\b/i,
  /\bpowershell\b/i,
  /\bbash\b/i,
];

const CLOUD_PATTERNS: RegExp[] = [
  /\b(send|upload|share|transmit).{0,25}(data|conversation|chat|cloud|internet|server)\b/i,
  /\b(env[ií]as?|subes?|mandas?).{0,25}(datos|conversaci[oó]n|chat|nube|internet|servidor)\b/i,
  /\bprivacy\b/i,
  /\bprivacidad\b/i,
  /\btrack(ing)? me\b/i,
];

const OFFLINE_PATTERNS: RegExp[] = [
  /\b(offline|without internet|no internet|sin conexi[oó]n|sin internet)\b/i,
  /\bwork(s)? offline\b/i,
  /\bfunciona(r)? sin (internet|conexi[oó]n)\b/i,
];

const PAGE_CAPABILITY_PATTERNS: RegExp[] = [
  /\b(can you|could you|are you able|do you).{0,30}(read|summarize|see|access).{0,30}(web )?(pages?|tabs?|websites?|articles?)\b/i,
  /\b(puedes|puede?s|eres capaz).{0,30}(leer|resumir|ver|acceder).{0,30}(p[aá]ginas?|pesta[nñ]as?|webs?|art[ií]culos?|sitios?)\b/i,
  /\bsupport.{0,20}(page|tab) (context|reading)\b/i,
];

const FORM_PATTERNS: RegExp[] = [
  /\b(fill|complete).{0,25}(form|fields?)\b/i,
  /\b(rellenar|completar).{0,25}(formulario|campos?)\b/i,
  /\bautofill\b/i,
];

const BROWSER_SCOPE_PATTERNS: RegExp[] = [
  /\b(other )?(tabs?|windows?|browser history|bookmarks)\b/i,
  /\b(otras )?(pesta[nñ]as?|ventanas?|historial|marcadores)\b/i,
  /\bwhole (computer|pc|machine|ordenador)\b/i,
  /\btodo (el )?(ordenador|equipo|pc)\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  const n = text.trim();
  return patterns.some((p) => p.test(n));
}

/** Detect capability-related user intent; null if normal chat message. */
export function detectCapabilityIntent(text: string): CapabilityIntent | null {
  const n = text.trim();
  if (!n) return null;

  if (matchesAny(n, FILES_PATTERNS)) return 'files_os';
  if (matchesAny(n, FORM_PATTERNS)) return 'form_fill';
  if (matchesAny(n, PAGE_CAPABILITY_PATTERNS)) return 'page_content';
  if (matchesAny(n, CLOUD_PATTERNS)) return 'cloud_privacy';
  if (matchesAny(n, OFFLINE_PATTERNS)) return 'offline';
  if (matchesAny(n, BROWSER_SCOPE_PATTERNS)) return 'browser_scope';
  if (matchesAny(n, GENERAL_PATTERNS)) return 'general';

  if (/\b(can you|are you able|do you|puedes|puede?s|eres capaz)\b/i.test(n)) {
    if (/\b(file|archivo|folder|carpeta|disk|disco|terminal)\b/i.test(n)) return 'files_os';
    if (/\b(form|formulario|field|campo)\b/i.test(n)) return 'form_fill';
    if (/\b(cloud|nube|server|servidor|upload|subir)\b/i.test(n)) return 'cloud_privacy';
    if (/\b(page|p[aá]gina|website|web|tab|pesta[nñ]a)\b/i.test(n) && /\b(can|could|puedes|capaz|support)\b/i.test(n))
      return 'page_content';
  }

  return null;
}

export function isCapabilityQuestion(text: string): boolean {
  return detectCapabilityIntent(text) !== null;
}

async function runtimeStatusLine(locale: Locale): Promise<string> {
  if (!hasLanguageModelApi()) {
    return locale === 'es'
      ? 'Estado: la API de IA integrada no está disponible en este Chrome.'
      : 'Status: built-in AI API is not available in this Chrome.';
  }
  const avail = await queryAvailability();
  if (avail === 'unavailable') {
    return locale === 'es'
      ? 'Estado: Gemini Nano no está disponible en este equipo.'
      : 'Status: Gemini Nano is not available on this device.';
  }
  return locale === 'es'
    ? 'Estado: Gemini Nano está cargado en este navegador.'
    : 'Status: Gemini Nano is loaded in this browser.';
}

const REPLIES: Record<Locale, Record<CapabilityIntent, string>> = {
  en: {
    general: `Here is what LocalChat can do today (honestly):

CAN do now:
• Chat with you using Gemini Nano on your device—replies stay local.
• Stream answers in this side panel.
• Attach visible text from the active tab (button “Use this page”) for summaries or Q&A.
• Attach highlighted text only (button “Use selection”) for fragments you select.
• Start a new conversation or stop a reply in progress.
• Explain these limits when you ask.

CANNOT do (yet or ever):
• Read your PC files, folders, or terminal—never.
• Send your chat to AI4Context servers—no developer cloud for messages.
• Read pages without your explicit click—no background tab monitoring.
• Fill web forms automatically—not yet.

{{STATUS}}

Use “Use this page” or highlight text + “Use selection”, then ask your question.`,
    files_os: `No—I cannot read files on your computer, open folders, or run terminal commands.

LocalChat only runs inside this Chrome extension. I only see messages you type here and page text you attach with “Use this page”.

Your files on disk stay private from this extension.`,
    cloud_privacy: `Your chat text is processed locally by Gemini Nano in Chrome. LocalChat does not upload your conversations to AI4Context servers.

Google Chrome manages the on-device model; see Chrome's built-in AI privacy notices for model download and updates. I do not sell or sync your chat to a developer backend.`,
    offline: `After Gemini Nano is downloaded once, you can chat offline—no internet needed for each reply.

The first model download does need a network connection. If Chrome removes the model (low disk space), it may download again when you open LocalChat.`,
    page_content: `Yes—with your permission. Click “Use this page” for the full visible tab, or highlight text and click “Use selection” for a fragment.

Then ask me to summarize or answer questions—all processed locally. I do not read pages in the background.`,
    form_fill: `Not yet. Automatic form filling is on the roadmap and will always require your confirmation before changing fields.

Today I can only chat about text you send me—I cannot edit web pages.`,
    browser_scope: `I do not watch your whole browser or other tabs in the background.

LocalChat is limited to this side panel and page text you explicitly attach from the active tab. I cannot browse history or bookmarks on my own.`,
  },
  es: {
    general: `Esto es lo que LocalChat puede hacer hoy (con honestidad):

SÍ puede ahora:
• Chatear contigo con Gemini Nano en tu dispositivo—respuestas locales.
• Mostrar respuestas en streaming en este panel.
• Adjuntar texto visible de la pestaña activa (botón «Usar esta página») para resumir o preguntar.
• Adjuntar solo el texto marcado (botón «Usar selección») para fragmentos que selecciones.
• Iniciar una conversación nueva o detener una respuesta.
• Explicar estos límites cuando preguntes.

NO puede (aún o nunca):
• Leer archivos, carpetas o terminal de tu PC—nunca.
• Enviar tu chat a servidores de AI4Context—sin nube del desarrollador.
• Leer páginas sin tu clic explícito—sin vigilar pestañas en segundo plano.
• Rellenar formularios automáticamente—aún no.

{{STATUS}}

Usa «Usar esta página» o marca texto + «Usar selección», y luego pregunta.`,
    files_os: `No—no puedo leer archivos de tu ordenador, abrir carpetas ni ejecutar comandos en la terminal.

LocalChat solo funciona dentro de esta extensión de Chrome. Solo veo mensajes que escribes aquí y texto de página que adjuntas con «Usar esta página».

Tus archivos en disco no los lee esta extensión.`,
    cloud_privacy: `Tu chat se procesa en local con Gemini Nano en Chrome. LocalChat no sube tus conversaciones a servidores de AI4Context.

Chrome gestiona el modelo en el dispositivo; consulta sus avisos de privacidad para descarga y actualizaciones. No vendo ni sincronizo tu chat con un backend del desarrollador.`,
    offline: `Tras descargar Gemini Nano una vez, puedes chatear sin internet—cada respuesta no necesita conexión.

La primera descarga del modelo sí requiere red. Si Chrome elimina el modelo (poco espacio), puede volver a descargarse al abrir LocalChat.`,
    page_content: `Sí—con tu permiso. Pulsa «Usar esta página» para la pestaña visible, o marca texto y «Usar selección» para un fragmento.

Luego pregunta o pide un resumen—todo en local. No leo páginas en segundo plano.`,
    form_fill: `Aún no. Rellenar formularios está en la hoja de ruta y siempre pedirá tu confirmación antes de tocar campos.

Hoy solo puedo conversar sobre texto que me envíes—no edito páginas web.`,
    browser_scope: `No vigilo todo el navegador ni otras pestañas en segundo plano.

LocalChat se limita a este panel y al texto de página que tú adjuntes de la pestaña activa. No puedo explorar historial o marcadores por mi cuenta.`,
  },
};

/** Build a deterministic, accurate reply for capability questions. */
export async function buildCapabilityReply(
  intent: CapabilityIntent,
  locale: Locale,
): Promise<string> {
  const status = await runtimeStatusLine(locale);
  return REPLIES[locale][intent].replace('{{STATUS}}', status);
}

/** Short chip label for quick prompts in the UI. */
export function capabilityChipLabel(locale: Locale): string {
  return locale === 'es' ? '¿Qué puedes hacer?' : 'What can you do?';
}
