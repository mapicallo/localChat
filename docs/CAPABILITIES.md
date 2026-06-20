# LocalChat — Capacidades (referencia canónica)

Documento de verdad para respuestas honestas del asistente.  
**Versión extensión:** 0.4.x · **Actualizar** cuando se implemente Fase 4+.

---

## Qué SÍ puede hacer LocalChat hoy

| Capacidad | Detalle |
|-----------|---------|
| Chat local | Conversación con Gemini Nano en el dispositivo (Prompt API). |
| Streaming | Respuestas en tiempo real en el panel lateral. |
| Privacidad del chat | El texto del chat no se envía a servidores de AI4Context. |
| Nueva conversación | Reinicia la sesión del modelo y borra el hilo visible. |
| Detener respuesta | Cancela una generación en curso. |
| UI bilingüe | Interfaz en español e inglés. |
| Explicar límites | Responder con precisión qué puede y qué no puede hacer. |

---

## Qué NO puede hacer (aún o nunca)

| Límite | Detalle |
|--------|---------|
| Archivos del SO | No lee disco, Documentos, descargas ni carpetas del usuario. |
| Terminal / comandos | No ejecuta PowerShell, bash ni scripts del sistema. |
| Otras apps | Solo existe dentro de la extensión Chrome. |
| Nube del desarrollador | No sube conversaciones a backend AI4Context. |
| Facturación oficial | No sustituye dashboards de OpenAI/Google/Anthropic. |
| **Página web activa** | **Fase 4** — aún no implementado. |
| **Texto seleccionado** | **Fase 6** — aún no implementado. |
| **Rellenar formularios** | **Backlog** — aún no implementado. |
| Todas las máquinas | Requiere Chrome desktop compatible y modelo descargado. |

---

## Primera descarga vs uso offline

- La **primera** descarga de Gemini Nano necesita red.
- Tras cargar el modelo, el chat puede funcionar **sin internet** para inferencia local.

---

## Preguntas frecuentes (respuesta corta)

- **¿Qué puedes hacer?** → Chat local + explicar límites; ver tabla arriba.
- **¿Lees mis archivos?** → No.
- **¿Subes datos a la nube?** → No a servidores AI4Context; inferencia local en Chrome.
- **¿Resumes esta página?** → Próximamente (Fase 4); hoy solo texto que escribes en el chat.
- **¿Funcionas sin internet?** → Sí, después de tener el modelo en el equipo.

---

## Mantenimiento

Al añadir una feature (p. ej. contexto de pestaña), mover la fila de «NO» a «SÍ» aquí y en `apps/extension/src/lib/capabilities.ts`.
