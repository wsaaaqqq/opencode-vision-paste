<div align="center">

# opencode-vision-paste

**OpenCode plugin: intercept pasted images → local VL API analysis → replace with text**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](README.md) | [简体中文](readme/zh-CN.md) | [繁體中文](readme/zh-TW.md) | [日本語](readme/ja.md) | [한국어](readme/ko.md) | [Español](readme/es.md) | [Français](readme/fr.md) | [Deutsch](readme/de.md) | [Русский](readme/ru.md) | [Português](readme/pt.md)

</div>

You paste an image into your OpenCode session. The LLM can't see it. The plugin can.

opencode-vision-paste intercepts pasted images, sends them to a local VL API (e.g., Qwen3VL running via llama.cpp), and replaces the image with a detailed text description — seamlessly, before the LLM ever sees the message.

No cloud dependencies. No API keys required. Your images stay local.

---

## Features

- **Transparent** — images are silently converted to text. The LLM never knows there was an image
- **Zero dependencies** — single ESM file, no build step, no npm deps
- **Multi-image support** — paste multiple images at once; each is analyzed and numbered
- **Local-first** — works with any OpenAI-compatible VL API (llama.cpp, vLLM, etc.)
- **Smart caching** — reuses analysis results for duplicate images across conversation turns
- **HTTP & data URLs** — handles both pasted images (data: URLs) and web-hosted images

## Installation

### For Humans

Copy and paste this prompt to your OpenCode agent:

```
Install and configure opencode-vision-paste by following the instructions here:
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### For LLM Agents

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

Or read the [Installation Guide](readme/INSTALL.md) directly.

---

## Quick Start

1. **Install** the plugin (see [Installation](#installation) above)
2. **Configure** your VL API endpoint in `.opencode/vision-paste.config.jsonc` (optional — defaults work if you have a local llama.cpp running)
3. **Paste an image** in any OpenCode chat — watch it turn into text

---

## Configuration

All settings are optional. The plugin works with sensible defaults.

| Option | Default | Description |
|--------|---------|-------------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | OpenAI-compatible VL API endpoint |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | Model name for the VL API |
| `apiKey` | `""` | API key (leave empty if not required) |
| `promptTemplate` | `请用中文详细描述这张图片的内容。{userText}` | Prompt sent to the VL model; `{userText}` is replaced with the user's original message |

**Config file locations** (first found wins):
1. `.opencode/vision-paste.config.jsonc` (project-level)
2. `~/.config/opencode/vision-paste.config.jsonc` (user-level)

Full reference: [CONFIGURATION.md](CONFIGURATION.md)

---

## How it works

```
User pastes image
       ↓
opencode-vision-paste intercepts `experimental.chat.messages.transform`
       ↓
Decodes image (data URL or HTTP) → saves temp file
       ↓
Sends to local VL API (OpenAI-compatible chat completions)
       ↓
Replaces image part with analysis text
       ↓
Temp file deleted — LLM sees text only
```

The plugin hooks into OpenCode's `experimental.chat.messages.transform` pipeline, running before the message is sent to the LLM.

---

## Development

```
npm test    # syntax check
npm pack    # build the package locally
```

The plugin is a single file (`vision-paste.mjs`). No build step. Edit and reload.

To test locally, add it to your `.opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["./path/to/vision-paste.mjs"]
}
```

Then restart OpenCode or use `/model` to trigger a reload.

---

## Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
