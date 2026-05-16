# Configuration Reference

## Config file locations

The plugin loads configuration from `vision-paste.config.jsonc` (JSONC format — supports `//` and `/* */` comments).

Priority (first found wins):

| Level | Path |
|-------|------|
| Project | `.opencode/vision-paste.config.jsonc` |
| User | `~/.config/opencode/vision-paste.config.jsonc` |
| Default | Built-in defaults (see below) |

## Options

### `apiBaseUrl`

- **Type**: `string`
- **Default**: `http://192.168.9.44:5678/v1`
- **Description**: OpenAI-compatible VL API endpoint URL

### `apiModel`

- **Type**: `string`
- **Default**: `Qwen3VL-8B-Instruct-Q4_K_M.gguf`
- **Description**: Model name used for vision-language analysis
- **Available**: Qwen3VL-8B (fast) and Qwen3VL-30B (more capable)

### `apiKey`

- **Type**: `string`
- **Default**: `""`
- **Description**: API key for the VL API (leave empty if the server doesn't require one)

### `promptTemplate`

- **Type**: `string`
- **Default**: `请用中文详细描述这张图片的内容。{userText}`
- **Description**: Prompt sent to the vision model. `{userText}` is replaced with the user's original message text. Change this to your preferred language or style.

### `promptLocale`

- **Type**: `string`
- **Default**: `zh`
- **Description**: Built-in prompt language code. Supported: `en`, `zh`, `ja`, `ko`, `es`, `fr`, `de`, `ru`, `pt`. Overridden by `promptTemplate` if set.

### `skipIfModelSupportsVision`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: When `true`, the plugin does NOT intercept images if the current chat model natively supports image input. This avoids redundant processing when using multimodal models like GPT-4o, Claude 3.5 Sonnet, or Gemini. Set to `false` to force the plugin to process all images regardless.

### `visionModels`

- **Type**: `string[]`
- **Default**: `[]`
- **Description**: Additional model ID patterns to treat as vision-capable (case-insensitive substring match). Useful as a fallback if a model doesn't report its capabilities correctly. Example: `["claude", "gemini", "gpt-4o", "qwen-vl"]`

### `healthCheckOnStart`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: When `true`, the plugin pings the VL API at session start. If unreachable, a warning is injected into the first chat message, alerting the user that images will not be analyzed.

### `verbose`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: When `true`, the plugin injects analysis progress messages into the chat (e.g., "Analyzing image..."). Useful for understanding what the plugin is doing.

### `errorHints`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: When `true`, API errors include troubleshooting suggestions (e.g., "Check apiBaseUrl" or "Run doctor to diagnose"). Set to `false` for minimal error messages.

## Example config

```jsonc
{
  "apiBaseUrl": "http://192.168.9.44:5678/v1",
  "apiModel": "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
  "apiKey": "",
  "promptTemplate": "Please describe this image in detail. {userText}"
}
```
