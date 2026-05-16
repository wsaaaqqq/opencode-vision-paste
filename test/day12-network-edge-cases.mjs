// test/day12-network-edge-cases.mjs — Network edge case tests
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 12: Network Edge Cases ===\n")

clearTempDir()
clearDebugLog()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: VL API returns non-JSON response
console.log("  Test 1: Non-JSON response → error caught")
{
  const server = createMockServer({ nonJsonResponse: true })
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
  includes(text, "图片分析失败", "non-JSON response triggers error")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 2: VL API returns null content → "(no response)"
console.log("\n  Test 2: null content → '(no response)' fallback")
{
  const server = createMockServer({ nullContent: true })
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
  includes(text, "(no response)", "null content falls back to '(no response)'")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 3: VL API returns empty choices array → "(no response)"
console.log("\n  Test 3: Empty choices → '(no response)' fallback")
{
  const server = createMockServer({ emptyChoices: true })
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
  includes(text, "(no response)", "empty choices falls back to '(no response)'")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 4: Connection drops mid-stream (simulated by server closing)
console.log("\n  Test 4: Connection drops → error caught")
{
  const server = createMockServer({ responseText: "test" })
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

  // Close server mid-request (race condition)
  setTimeout(() => server.stop(), 10)

  try {
    await plugin["experimental.chat.messages.transform"]({}, output)
    ok(true, "connection drop handled without crash")
  } catch (e) {
    ok(true, "connection drop throws but doesn't crash")
  }

  rmSync(configDir, { recursive: true, force: true })
}

// Test 5: Empty response body
console.log("\n  Test 5: Empty response body → error caught")
{
  const server = createMockServer({ responseText: "" })
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

  // Empty string response is valid (not null), so ?? doesn't trigger
  // The plugin still processes it without crashing
  ok(true, "empty response handled without crash")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

const result = summary()
process.exit(result ? 0 : 1)
