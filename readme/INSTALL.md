# Installation Guide

## Prerequisites

- [OpenCode](https://opencode.ai) Desktop or CLI
- A running VL API server (OpenAI-compatible, e.g., [llama.cpp](https://github.com/ggml-org/llama.cpp) with Qwen3VL)

## Install from npm (recommended)

Add `opencode-vision-paste` to your `opencode.json` or `opencode.jsonc` plugin list:

```jsonc
{
  "plugin": ["opencode-vision-paste"]
}
```

Restart OpenCode (or switch models with `/model` to trigger a reload). That's it.

## Install from local file

If you prefer not to use npm, download `vision-paste.mjs` and reference it directly:

```jsonc
{
  "plugin": ["./path/to/vision-paste.mjs"]
}
```

## Configuration

The plugin works out of the box with sensible defaults, but you can customize it via `vision-paste.config.jsonc`:

**Project-level** (highest priority): `.opencode/vision-paste.config.jsonc`

**User-level** (global fallback): `~/.config/opencode/vision-paste.config.jsonc`

```jsonc
{
  // Your VL API endpoint (OpenAI-compatible)
  "apiBaseUrl": "http://192.168.9.44:5678/v1",
  // Model name
  "apiModel": "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
  // API key if required
  "apiKey": "",
  // Prompt sent to the vision model
  "promptTemplate": "请用中文详细描述这张图片的内容。{userText}"
}
```

See [CONFIGURATION.md](../CONFIGURATION.md) for all available options.

## Verify it works

1. Open any OpenCode chat session
2. Paste an image (Ctrl+V / Cmd+V)
3. The image is automatically intercepted, analyzed by your local VL API, and replaced with descriptive text before the LLM sees it

No manual commands needed. The plugin works silently in the background.
