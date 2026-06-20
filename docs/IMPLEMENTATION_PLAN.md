# LocalChat — Plan de implementación

**Producto:** extensión Chrome/Edge (MV3) — chat local con la IA integrada del navegador (Gemini Nano en Chrome, Phi/Aion en Edge cuando esté disponible).

**Tagline:** *Chatea con la IA de tu Chrome, sin subir nada a la nube.*

**Workspace:** `C:\code-localChat\`  
**Repositorio:** https://github.com/mapicallo/localChat  
**Ecosistema:** [AI4Context](https://www.ai4context.com) (ficha web y tiendas en fases posteriores)

---

## Principios de diseño

1. **Local-first:** inferencia on-device; sin backend AI4Context para el chat.
2. **Honestidad:** la UI y el system prompt + catálogo en código explican límites reales.
3. **Consentimiento explícito:** leer una pestaña solo cuando el usuario pulsa un botón.
4. **Incremental:** cada fase produce una extensión cargable en `chrome://extensions`.
5. **Stack alineado con AITokenMeter:** TypeScript, Vite, MV3, ES modules — sin React en v0.1 (UI en vanilla TS; valorar React en v0.3 si crece).

---

## API correcta (no usar el prompt de Gemini tal cual)

| Incorrecto (Gemini) | Correcto (Chrome 138+) |
|---------------------|-------------------------|
| `ai.languageModel` | `LanguageModel` (global) |
| `capabilities()` | `LanguageModel.availability()` |
| `systemPrompt` en `create()` | `initialPrompts: [{ role: 'system', content: '...' }]` |
| `chrome.tabs.executeScript` | `chrome.scripting.executeScript` |
| Permiso `aiLanguageModelOriginTrial` | No necesario en extensiones actuales |

Tipos: `@types/dom-chromium-ai` (devDependency).

---

## Estructura objetivo del repo

```
localChat/
├── docs/
│   ├── IMPLEMENTATION_PLAN.md    ← este documento
│   ├── ARCHITECTURE.md           ← fase 0
│   ├── CAPABILITIES.md           ← catálogo honesto de límites
│   ├── FICHA_PRODUCTO.md
│   ├── PRIVACY_STORE.md
│   └── STORE_URLS.md
├── apps/extension/
│   ├── public/
│   │   ├── manifest.json
│   │   ├── icons/
│   │   ├── privacy.html
│   │   └── privacy.js
│   ├── src/
│   │   ├── background.ts
│   │   ├── sidepanel.html
│   │   ├── sidepanel.ts
│   │   ├── sidepanel.css
│   │   ├── lib/
│   │   │   ├── model.ts          # LanguageModel: availability, create, stream, destroy
│   │   │   ├── capabilities.ts   # reglas + respuestas sobre "¿puedo…?"
│   │   │   ├── pageContext.ts    # extracción texto pestaña
│   │   │   ├── storage.ts        # prefs + historial opcional
│   │   │   └── i18n.ts           # ES / EN
│   │   └── types/
│   │       └── dom-chromium-ai.d.ts  # si hace falta shim
│   ├── scripts/
│   │   ├── build-extension.mjs
│   │   ├── package-zip.mjs
│   │   └── write-placeholder-icons.mjs
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── pantallazos/                  # capturas tienda (fase 8)
├── README.md
├── LICENSE
└── .gitignore
```

**Build:** `npm run build` → `apps/extension/dist/` (cargar unpacked desde ahí).

---

## Requisitos de desarrollo (máquina del autor)

- Chrome **138+** (desktop).
- Flags de desarrollo si `availability()` devuelve `unavailable`:
  - `chrome://flags/#prompt-api-for-gemini-nano` → Enabled (o multilingual).
  - `chrome://flags/#optimization-guide-on-device-model` → Enabled BypassPerfRequirement (solo dev).
- Hardware: ver [Prompt API — hardware](https://developer.chrome.com/docs/ai/prompt-api).
- Comprobar en consola del side panel: `await LanguageModel.availability()`.

---

## Fases

### Fase 0 — Bootstrap del repo (0,5–1 día)

**Objetivo:** repo clonable, build vacío, extensión que carga sin errores.

**Tareas:**
- [ ] `git init`, `.gitignore` (node_modules, dist, .env, *.zip).
- [ ] `README.md` con requisitos, flags, `npm install`, `npm run build`, load unpacked.
- [ ] Monorepo simple: solo `apps/extension` (sin workspaces npm hasta que haga falta).
- [ ] Vite multi-entry: `background.ts`, `sidepanel.ts`.
- [ ] `manifest.json` mínimo: `sidePanel`, `storage`, `action`, `background` (module).
- [ ] `background.ts`: `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.
- [ ] Side panel placeholder: “LocalChat — loading…”.
- [ ] Iconos placeholder 16/48/128.
- [ ] Primer commit + push a `main`.

**Criterio de aceptación:** extensión visible en barra; clic abre panel lateral con texto estático.

---

### Fase 1 — Disponibilidad del modelo (1–2 días)

**Objetivo:** pantalla de estado antes del chat.

**Tareas:**
- [ ] `lib/model.ts`: `checkAvailability()`, estados UI (`checking`, `unavailable`, `downloadable`, `downloading`, `ready`).
- [ ] `LanguageModel.create({ monitor })` con listener `downloadprogress`.
- [ ] UI: spinner + barra de progreso + mensajes ES/EN.
- [ ] Pantalla `unavailable`: requisitos (RAM, SO, versión Chrome, enlace a docs).
- [ ] Botón “Reintentar comprobación”.

**Criterio de aceptación:** en PC compatible, usuario ve descarga del modelo y llega a “Listo”. En PC incompatible, mensaje claro sin crash.

---

### Fase 2 — Chat básico con streaming (2–3 días)

**Objetivo:** conversación funcional en el side panel.

**Tareas:**
- [ ] `lib/model.ts`: `createSession()`, `promptStreaming()`, `destroySession()`.
- [ ] System prompt (ES/EN) con límites: sin OS, sin terminal, solo extensión + texto que envía el usuario.
- [ ] UI: burbujas user/assistant, scroll automático, textarea (Enter envía, Shift+Enter newline).
- [ ] Estados: “Escribiendo…”, deshabilitar input mientras stream activo.
- [ ] Acumulación correcta de chunks (`for await`) sin duplicar texto.
- [ ] Botón “Nueva conversación” → `session.destroy()` + nueva sesión.
- [ ] Manejo de errores: `QuotaExceededError`, abort con `AbortSignal`.

**Criterio de aceptación:** 10+ turnos de chat local; streaming visible; nueva conversación resetea contexto.

---

### Fase 3 — Capacidades honestas (1–2 días)

**Objetivo:** responder bien a “¿qué puedes hacer?”.

**Tareas:**
- [ ] `docs/CAPABILITIES.md` + `lib/capabilities.ts` (lista canónica).
- [ ] Detección de intents (“¿qué puedes hacer?”, “¿puedes leer mis archivos?”).
- [ ] Respuesta híbrida: reglas fijas + opcional enriquecimiento vía modelo.
- [ ] Nunca prometer acciones no implementadas.

**Criterio de aceptación:** preguntas sobre límites devuelven respuestas precisas sin alucinar acceso al disco.

---

### Fase 4 — Contexto de pestaña (2–3 días)

**Objetivo:** “Léete esta página y resúmela” (local).

**Tareas:**
- [ ] Permisos: `activeTab`, `scripting`.
- [ ] `lib/pageContext.ts`: `extractActiveTabText(tabId)` vía `chrome.scripting.executeScript`.
- [ ] Limitar tamaño (p. ej. 30–50k chars), limpiar espacios, aviso si página vacía o restringida (`chrome://`, Web Store).
- [ ] Botón “Usar contenido de esta pestaña” con confirmación previa.
- [ ] Inyectar en prompt o `session.append()`; mostrar chip “Contexto: [título pestaña]”.
- [ ] Heurística simple: preferir `main` / `article` si existe (mejora v4.1).

**Criterio de aceptación:** en un artículo de noticias, resumen coherente; en `chrome://extensions` mensaje de error amable.

---

### Fase 5 — i18n, persistencia y pulido UX (2 días)

**Objetivo:** producto usable a diario.

**Tareas:**
- [ ] `lib/i18n.ts`: ES / EN (selector en panel, guardado en `chrome.storage.local`).
- [ ] Opcional: persistir historial de la sesión actual (no obligatorio en v0.1).
- [ ] Atajos: Ctrl+Enter enviar; foco en input al abrir panel.
- [ ] Tema claro coherente con familia AI4Context (CSS variables).
- [ ] `privacy.html` + `privacy.js` (CSP MV3, bilingüe — patrón AITokenMeter).

**Criterio de aceptación:** cambio de idioma instantáneo; política de privacidad abre en pestaña.

---

### Fase 6 — Selección de texto (1–2 días)

**Objetivo:** preguntar sobre un fragmento sin toda la página.

**Tareas:**
- [ ] Content script ligero **solo tras gesto** (inyección on-demand desde side panel).
- [ ] Leer `window.getSelection().toString()` en pestaña activa.
- [ ] Botón “Usar texto seleccionado” en panel.
- [ ] Si no hay selección, tooltip de ayuda.

**Criterio de aceptación:** seleccionar párrafo → explicar / resumir / traducir en chat local.

---

### Fase 7 — Edge y detección multi-navegador (1–2 días)

**Objetivo:** misma extensión, distinto modelo según navegador.

**Tareas:**
- [ ] Detectar `navigator.userAgent` Edg vs Chrome.
- [ ] Copy UI: “Modelo local de Chrome (Gemini Nano)” vs “Modelo local de Edge (Phi/Aion)” cuando aplique.
- [ ] Documentar que Edge puede requerir Canary/Dev + flags ([Microsoft Prompt API](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api)).
- [ ] No publicar en Edge Add-ons hasta validar en Stable.

**Criterio de aceptación:** en Chrome Stable funciona; en Edge muestra estado honesto.

---

### Fase 8 — Empaquetado, tiendas y web AI4Context (3–5 días)

**Objetivo:** publicación alineada con el resto del ecosistema.

**Tareas:**
- [ ] `npm run pack` → ZIP para Chrome Web Store.
- [ ] `docs/FICHA_PRODUCTO.md`, `PRIVACY_STORE.md`, capturas 1280×800.
- [ ] Entrada en `code-rag-java/landing`: `localChat` en catálogo (Chrome link; Edge pending).
- [ ] `docs/STORE_URLS.md` en repo localChat.
- [ ] Versión `0.1.0` en manifest.

**Copy tienda (borrador):**
- **Nombre:** LocalChat — local AI chat in Chrome  
- **Descripción corta:** Chat with your browser’s built-in AI. Private, on-device, no cloud upload.  
- **Single purpose:** Local conversational assistant using the browser’s on-device language model.

**Criterio de aceptación:** extensión enviada a revisión CWS; ficha en ai4context.com.

---

### Fase 9 — Post-MVP (backlog)

Orden sugerido según valor / riesgo:

| # | Feature | Notas |
|---|---------|--------|
| 9.1 | Summarizer API dedicada | Acción rápida “Resumir” sin chat largo |
| 9.2 | Translator / Language Detector | Botones ES↔EN |
| 9.3 | Lectura inteligente (Readability) | Mejor calidad que `body.innerText` |
| 9.4 | Asistente de formularios | Solo lectura → propuesta → confirmación → relleno |
| 9.5 | Perfil local (nombre, email…) | `storage.local`, cifrado opcional |
| 9.6 | Export / import historial JSON | Patrón AITokenMeter |
| 9.7 | Tool calling (cuando exista en Chromium) | [crbug.com/422803232](https://crbug.com/422803232) |

---

## Orden de trabajo recomendado (sprints)

| Sprint | Fases | Entrega |
|--------|-------|---------|
| **S1** | 0 + 1 | Repo + panel + estado del modelo |
| **S2** | 2 + 3 | Chat streaming + límites honestos |
| **S3** | 4 + 5 | Contexto de página + i18n + privacidad |
| **S4** | 6 + 7 | Selección + Edge |
| **S5** | 8 | Tienda + web |

Estimación total MVP publicable: **~3–4 semanas** a ritmo part-time.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Modelo no disponible en muchos PCs | Pantalla de requisitos; no marketing “para todos” |
| API cambia entre versiones Chrome | Pin documentación; `@types/dom-chromium-ai`; tests manuales en 138+ |
| Contexto de página demasiado grande | Truncar + avisar; resumir por chunks en v9 |
| Alucinaciones sobre capacidades | `capabilities.ts` + reglas |
| Edge menos maduro | Chrome first; Edge cuando Stable confirme API |
| Revisión CWS (permisos `scripting`) | Single purpose claro; solo lectura bajo botón explícito |

---

## Comandos npm previstos

```json
{
  "scripts": {
    "dev": "vite build --watch",
    "build": "node scripts/build-extension.mjs",
    "icons": "node scripts/write-placeholder-icons.mjs",
    "pack": "npm run build && node scripts/package-zip.mjs"
  }
}
```

---

## Próximo paso inmediato

**Empezar Fase 0:** scaffold en `C:\code-localChat\apps\extension\`, primer commit a `main`, probar load unpacked.

Cuando quieras, en el chat: *“Implementa la Fase 0 de LocalChat”* y generamos el código base.
