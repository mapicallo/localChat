# LocalChat

**Chatea con la IA de tu Chrome, sin subir nada a la nube.**

Extensión Chrome (Manifest V3) con **ventana flotante** redimensionable: chat local usando la [Prompt API](https://developer.chrome.com/docs/ai/prompt-api) y **Gemini Nano** on-device.

Parte del ecosistema [AI4Context](https://www.ai4context.com).

## Requisitos de desarrollo

- **Chrome 138+** (desktop): Windows 10/11, macOS 13+, Linux o Chromebook Plus.
- Hardware según [documentación oficial](https://developer.chrome.com/docs/ai/prompt-api) (RAM/GPU, espacio en disco).
- Node.js 20+ para compilar la extensión.

### Flags (solo si el modelo no aparece en desarrollo)

En `chrome://flags`:

| Flag | Valor |
|------|--------|
| `#prompt-api-for-gemini-nano` | Enabled (o multilingual) |
| `#optimization-guide-on-device-model` | Enabled BypassPerfRequirement *(solo dev)* |

Comprueba en consola del panel: `await LanguageModel.availability()`.

## Desarrollo

```bash
cd apps/extension
npm install
npm run build
```

Carga la extensión en **chrome://extensions** → *Load unpacked* → `apps/extension/dist/`.

```bash
npm run dev      # build en watch
npm run icons    # regenerar iconos placeholder
npm run pack     # ZIP para tienda (tras build)
```

## Estructura

```
apps/extension/   → código MV3 (Vite + TypeScript)
docs/             → plan, arquitectura, ficha tienda
```

## Estado

| Versión | Fase |
|---------|------|
| 0.6.0 | Fase 5 — i18n, privacidad bilingüe, atajos UX |
| 0.7.0 | Fase 6 — adjuntar texto seleccionado («Usar selección») |
| 0.8.0 | Historial local — conversaciones guardadas y recuperables |

Ver [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Licencia

MIT — Manuel Angel Picallo Perez / AI4Context.
