# Changelog

All notable changes to opencode-vision-paste will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] - 2026-05-16

### Added

- **CLI tool**: `npx opencode-vision-paste init|doctor|config`
- **Auto-detection**: `init` detects running VL backends (Ollama, llama.cpp, vLLM, LM Studio)
- **Doctor command**: 4 diagnostic checks (system/config/plugin/api) with `--json` and `--verbose` flags
- **Startup health check**: pings VL API on `session.created`, warns in chat if unreachable
- **Smart error feedback**: classified API errors with specific fix suggestions
- **Multi-language prompts**: 9 built-in prompt templates via `promptLocale` config
- **Docker Compose**: one-command VL API setup
- **Example configs**: presets for Ollama, llama.cpp, vLLM
- **New config options**: `promptLocale`, `healthCheckOnStart`, `verbose`, `errorHints`
- **FAQ section** in README

### Changed

- CLI now uses Commander.js (single runtime dependency)
- `promptLocale` replaces hardcoded `promptTemplate` default

## [0.1.0] - 2026-05-15

### Added

- Initial release
- Image interception via `experimental.chat.messages.transform` hook
- Local VL API support (OpenAI-compatible, default: Qwen3VL via llama.cpp)
- Multi-image support with deduplication and numbered labels
- Smart skip: auto-detects when the current chat model natively supports images (`skipIfModelSupportsVision` config)
- `visionModels` config for pattern-based vision-capable model matching
- HTTP URL and data URL image support
- JSONC config loading (project-level + user-level + built-in defaults)
- Temporary file management (auto-clean >24h on startup, immediate delete after processing)
- Debug logging to `%TMP%/vision-paste/debug.log`
- CI/CD: GitHub Actions for syntax check + npm pack (CI) and npm publish + GitHub Release (CD)
- Multilingual README: English + 简体中文 + 繁體中文 + 日本語 + 한국어 + Español + Français + Deutsch + Русский + Português
- MIT License
