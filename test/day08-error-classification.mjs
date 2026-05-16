// test/day08-error-classification.mjs — Error classification tests (6 categories)
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 8: Error Classification (6 Categories) ===\n")

clearTempDir()
clearDebugLog()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: ECONNREFUSED → "VL API is not reachable"
console.log("  Test 1: ECONNREFUSED → unreachable error")
{
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://127.0.0.1:19999/v1", // nothing listening here
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

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "图片分析失败", "error message present")
  includes(text, "not reachable", "ECONNREFUSED classified correctly")
  includes(text, "doctor", "fix suggestion includes doctor")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 2: HTTP 500 → generic error
console.log("\n  Test 2: HTTP 500 → generic error")
{
  const server = createMockServer({ shouldFail: true, failStatus: 500, failBody: "Internal error" })
  const port = await server.start()

  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
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

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "图片分析失败", "error message present")
  includes(text, "500", "status code in error")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 3: HTTP 401 → unauthorized
console.log("\n  Test 3: HTTP 401 → unauthorized")
{
  const server = createMockServer({ shouldFail: true, failStatus: 401, failBody: "Unauthorized" })
  const port = await server.start()

  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
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

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "401", "401 status in error")
  includes(text, "apiKey", "fix mentions apiKey")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 4: HTTP 404 → endpoint not found
console.log("\n  Test 4: HTTP 404 → endpoint not found")
{
  const server = createMockServer({ shouldFail: true, failStatus: 404, failBody: "Not found" })
  const port = await server.start()

  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
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

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "404", "404 status in error")
  includes(text, "/v1", "fix mentions /v1 suffix")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 5: HTTP 400 → model error
console.log("\n  Test 5: HTTP 400 → model error")
{
  const server = createMockServer({ shouldFail: true, failStatus: 400, failBody: "model not found" })
  const port = await server.start()

  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
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

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "400", "400 status in error")
  includes(text, "doctor", "fix suggests doctor")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 6: Timeout error
console.log("\n  Test 6: Timeout error (very short timeout)")
{
  const server = createMockServer({ responseDelay: 100000 }) // will timeout
  const port = await server.start()

  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
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

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "图片分析失败", "error message present")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

const result = summary()
process.exit(result ? 0 : 1)
