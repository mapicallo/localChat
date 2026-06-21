# LocalChat — Capacidades (referencia canónica)

Documento de verdad para respuestas honestas del asistente.  
**Versión extensión:** 0.9.x · **Actualizar** al añadir features.

---

## Qué SÍ puede hacer LocalChat hoy

| Capacidad | Detalle |
|-----------|---------|
| Chat local | Conversación con Gemini Nano en el dispositivo (Prompt API). |
| Streaming | Respuestas en tiempo real en la ventana popup. |
| **Contexto de pestaña** | Botón **«Usar esta página»** — lee texto visible de la pestaña activa (con confirmación). |
| **Texto seleccionado** | Botón **«Usar selección»** — adjunta solo el fragmento que marques en la pestaña activa. |
| **Documento local** | Botón **«Adjuntar documento»** — PDF o texto (.txt, .md, .csv, .json, etc.); extracción en el dispositivo. |
| **Imagen local** | Botón **«Adjuntar imagen»** — PNG/JPEG/WebP/GIF; prompt multimodal con Gemini Nano en local. |
| Resumir / Q&A sobre página, selección, documento o imagen | Tras adjuntar contexto, preguntar p. ej. «Resume este documento» o «Describe esta imagen». |
| Privacidad del chat | El texto no se envía a servidores de AI4Context. |
| Nueva conversación | Reinicia sesión del modelo y borra hilo + contexto adjunto. |
| **Historial local** | Conversaciones guardadas en el dispositivo (Historial); recuperables al reabrir LocalChat. |
| Detener respuesta | Cancela generación en curso. |
| UI bilingüe | Interfaz en español e inglés. |
| Explicar límites | Respuestas precisas sobre capacidades (catálogo en código). |

---

## Qué NO puede hacer (aún o nunca)

| Límite | Detalle |
|--------|---------|
| Explorar disco | No rastrea carpetas ni abre archivos sin que el usuario elija uno con el selector. |
| Terminal / comandos | No ejecuta PowerShell, bash ni scripts del sistema. |
| Otras apps | Solo existe dentro de la extensión Chrome. |
| Nube del desarrollador | No sube conversaciones a backend AI4Context. |
| Páginas restringidas | No lee `chrome://`, Web Store, extensiones, etc. |
| Fondo / otras pestañas | No vigila pestañas sin acción explícita del usuario. |
| **Rellenar formularios** | **Backlog** — aún no implementado. |
| Todas las máquinas | Requiere Chrome desktop compatible y modelo descargado. |

---

## Flujo «Usar esta página»

1. Usuario abre un sitio web normal (http/https).
2. Abre LocalChat (panel lateral).
3. Pulsa **Usar esta página** → confirma el diálogo.
4. Aparece chip **Contexto: [título]**.
5. Escribe pregunta o «Resume esta página».
6. Gemini Nano procesa texto adjunto **solo en local** (página hasta ~40k caracteres; selección hasta ~20k; puede truncar).

---

## Flujo «Usar selección»

1. Usuario abre un sitio web normal (http/https).
2. **Marca** el fragmento de texto que le interesa.
3. Abre LocalChat (panel lateral).
4. Pulsa **Usar selección** (sin diálogo extra; debe haber texto marcado).
5. Aparece chip **Selección: [vista previa]**.
6. Escribe pregunta o p. ej. «Explícalo más simple».
7. Gemini Nano procesa la selección **solo en local** (hasta ~20k caracteres; puede truncar).

---

## Flujo «Adjuntar documento»

1. Usuario abre LocalChat (ventana popup).
2. Pulsa **Adjuntar documento** → elige PDF o archivo de texto.
3. Aparece chip **Documento: [nombre]**.
4. Escribe pregunta o «Resume este documento».
5. Texto extraído en el panel (PDF vía pdf.js); hasta ~40k caracteres; puede truncar.

---

## Flujo «Adjuntar imagen»

1. Usuario abre LocalChat.
2. Pulsa **Adjuntar imagen** → elige PNG, JPEG, WebP o GIF (máx. ~8 MB).
3. Aparece chip **Imagen: [nombre]** con miniatura.
4. Escribe pregunta o «Describe esta imagen».
5. Imagen redimensionada si hace falta (máx. 2048 px); prompt multimodal **solo en local**.

---

## Primera descarga vs uso offline

- La **primera** descarga de Gemini Nano necesita red.
- Tras cargar el modelo, el chat puede funcionar **sin internet** para inferencia local.

---

## Mantenimiento

Actualizar este archivo y `apps/extension/src/lib/capabilities.ts` cuando cambien las features.
