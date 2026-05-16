// test/day09-error-display.mjs — Error display options tests
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 9: Error Display Options ===\n")

clearTempDir()
clearDebugLog()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: errorHints: true (default) → error includes cause + fix
console.log("  Test 1: errorHints: true → error includes fix suggestion")
{
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://127.0.0.1:19999/v1",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
    errorHints: true,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "原因", "error cause present")
  includes(text, "建议", "fix suggestion present")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 2: errorHints: false → error includes cause only
console.log("\n  Test 2: errorHints: false → error cause only, no fix")
{
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://127.0.0.1:19999/v1",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
    errorHints: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "图片分析失败", "error message present")
  ok(!text.includes("建议"), "no fix suggestion when errorHints: false")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 3: Error when user text exists → appended
console.log("\n  Test 3: Error with user text → appended to existing text")
{
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://127.0.0.1:19999/v1",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "text", text: "Hello world" },
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "Hello world", "original user text preserved")
  includes(text, "图片分析失败", "error appended")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 4: Error when no user text → error replaces image
console.log("\n  Test 4: Error with no user text → error replaces image")
{
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://127.0.0.1:19999/v1",
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

  equal(msgs[0].parts.length, 1, "only 1 part remains")
  equal(msgs[0].parts[0].type, "text", "error text replaces image")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 5: Error removes all image parts, preserves other parts
console.log("\n  Test 5: Error removes image parts, preserves others")
{
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://127.0.0.1:19999/v1",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "text", text: "Hello" },
      { type: "file", mime: "image/png", url: dataUrl },
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const nonImageParts = msgs[0].parts.filter(p => p.type !== "file")
  equal(nonImageParts.length, 1, "only non-image parts remain")
  equal(msgs[0].parts.filter(p => p.type === "file").length, 0, "all image parts removed")

  rmSync(configDir, { recursive: true, force: true })
}

const result = summary()
process.exit(result ? 0 : 1)
