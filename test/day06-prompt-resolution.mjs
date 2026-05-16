// test/day06-prompt-resolution.mjs — Prompt resolution tests
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 6: Prompt Resolution ===\n")

clearTempDir()
clearDebugLog()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: promptLocale "en" → English prompt
console.log("  Test 1: promptLocale 'en' → English prompt")
{
  const server = createMockServer()
  const port = await server.start()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    promptLocale: "en",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const prompt = server.lastRequestBody.messages[0].content[0].text
  includes(prompt, "Describe this image in detail", "English prompt used")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 2: promptLocale "zh" → Chinese prompt
console.log("\n  Test 2: promptLocale 'zh' → Chinese prompt")
{
  const server = createMockServer()
  const port = await server.start()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    promptLocale: "zh",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const prompt = server.lastRequestBody.messages[0].content[0].text
  includes(prompt, "请用中文详细描述这张图片的内容", "Chinese prompt used")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 3: All 9 locales
console.log("\n  Test 3: All 9 locales")
{
  const locales = {
    en: "Describe this image in detail",
    zh: "请用中文详细描述这张图片的内容",
    ja: "この画像の内容を詳しく説明してください",
    ko: "이 이미지의 내용을 자세히 설명해 주세요",
    es: "Describe esta imagen en detalle",
    fr: "Décris cette image en détail",
    de: "Beschreibe dieses Bild im Detail",
    ru: "Подробно опиши это изображение",
    pt: "Descreva esta imagem em detalhes",
  }

  for (const [locale, expected] of Object.entries(locales)) {
    const server = createMockServer()
    const port = await server.start()
    const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
    const opencodeDir = join(configDir, ".opencode")
    mkdirSync(opencodeDir, { recursive: true })
    writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
      apiBaseUrl: `http://127.0.0.1:${port}/v1`,
      promptLocale: locale,
      skipIfModelSupportsVision: false,
      healthCheckOnStart: false,
    }))

    const mod = await loadPlugin()
    const plugin = await mod.default({ directory: configDir })

    const msgs = [{
      info: { role: "user" },
      parts: [{ type: "file", mime: "image/png", url: dataUrl }],
    }]
    const output = { messages: msgs }
    await plugin["experimental.chat.messages.transform"]({}, output)

    const prompt = server.lastRequestBody.messages[0].content[0].text
    includes(prompt, expected, `${locale} prompt contains expected text`)

    rmSync(configDir, { recursive: true, force: true })
    await server.stop()
  }
}

// Test 4: promptTemplate overrides promptLocale
console.log("\n  Test 4: promptTemplate overrides promptLocale")
{
  const server = createMockServer()
  const port = await server.start()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    promptLocale: "en",
    promptTemplate: "Custom prompt: {userText}",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const prompt = server.lastRequestBody.messages[0].content[0].text
  includes(prompt, "Custom prompt:", "promptTemplate overrides locale")
  notOk(prompt.includes("Describe this image"), "locale template not used")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 5: {userText} substitution with user text
console.log("\n  Test 5: {userText} substitution with user text")
{
  const server = createMockServer()
  const port = await server.start()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    promptLocale: "en",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "text", text: "What is this?" },
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const prompt = server.lastRequestBody.messages[0].content[0].text
  includes(prompt, "此外，用户还问了以下问题", "user text appended in Chinese")
  includes(prompt, "What is this?", "user text included in prompt")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 6: {userText} substitution with empty user text
console.log("\n  Test 6: {userText} substitution with empty user text")
{
  const server = createMockServer()
  const port = await server.start()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    promptLocale: "en",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const prompt = server.lastRequestBody.messages[0].content[0].text
  // With no user text, the userTextSuffix should be empty
  ok(!prompt.includes("此外，用户还问了以下问题") || prompt.includes("此外，用户还问了以下问题，请根据图片内容直接回答："), "empty user text handled")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 7: Invalid locale → falls back to zh
console.log("\n  Test 7: Invalid locale → falls back to zh")
{
  const server = createMockServer()
  const port = await server.start()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    promptLocale: "xx",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const prompt = server.lastRequestBody.messages[0].content[0].text
  includes(prompt, "请用中文详细描述这张图片的内容", "invalid locale falls back to zh")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

function notOk(val, msg) {
  if (!val) {
    console.log(`    ✓ ${msg}`)
  } else {
    console.log(`    ✗ ${msg}`)
  }
}

const result = summary()
process.exit(result ? 0 : 1)
