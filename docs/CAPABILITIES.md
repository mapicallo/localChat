# LocalChat — Capacidades (referencia canónica)

Documento de verdad para respuestas honestas del asistente.  
**Versión extensión:** 0.5.x · **Actualizar** al añadir features.

---

## Qué SÍ puede hacer LocalChat hoy

| Capacidad | Detalle |
|-----------|---------|
| Chat local | Conversación con Gemini Nano en el dispositivo (Prompt API). |
| Streaming | Respuestas en tiempo real en el panel lateral. |
| **Contexto de pestaña** | Botón **«Usar esta página»** — lee texto visible de la pestaña activa (con confirmación). |
| Resumir / Q&A sobre página | Tras adjuntar contexto, preguntar p. ej. «Resume esta página». |
| Privacidad del chat | El texto no se envía a servidores de AI4Context. |
| Nueva conversación | Reinicia sesión del modelo y borra hilo + contexto adjunto. |
| Detener respuesta | Cancela generación en curso. |
| UI bilingüe | Interfaz en español e inglés. |
| Explicar límites | Respuestas precisas sobre capacidades (catálogo en código). |

---

## Qué NO puede hacer (aún o nunca)

| Límite | Detalle |
|--------|---------|
| Archivos del SO | No lee disco, Documentos, descargas ni carpetas del usuario. |
| Terminal / comandos | No ejecuta PowerShell, bash ni scripts del sistema. |
| Otras apps | Solo existe dentro de la extensión Chrome. |
| Nube del desarrollador | No sube conversaciones a backend AI4Context. |
| Páginas restringidas | No lee `chrome://`, Web Store, extensiones, etc. |
| Fondo / otras pestañas | No vigila pestañas sin acción explícita del usuario. |
| **Texto seleccionado** | **Fase 6** — aún no implementado. |
| **Rellenar formularios** | **Backlog** — aún no implementado. |
| Todas las máquinas | Requiere Chrome desktop compatible y modelo descargado. |

---

## Flujo «Usar esta página»

1. Usuario abre un sitio web normal (http/https).
2. Abre LocalChat (panel lateral).
3. Pulsa **Usar esta página** → confirma el diálogo.
4. Aparece chip **Contexto: [título]**.
5. Escribe pregunta o «Resume esta página».
6. Gemini Nano procesa texto adjunto **solo en local** (hasta ~40k caracteres; puede truncar).

---

## Primera descarga vs uso offline

- La **primera** descarga de Gemini Nano necesita red.
- Tras cargar el modelo, el chat puede funcionar **sin internet** para inferencia local.

---

## Mantenimiento

Actualizar este archivo y `apps/extension/src/lib/capabilities.ts` cuando cambien las features.
