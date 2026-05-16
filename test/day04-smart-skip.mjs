// test/day04-smart-skip.mjs — Smart skip feature tests
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, notOk, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 4: Smart Skip Feature ===\n")

clearTempDir()
clearDebugLog()

const server = createMockServer({ responseText: "should not see this" })
const port = await server.start()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: Model with capabilities.input.image: true → skip
console.log("  Test 1: Model with vision capabilities → skip")
{
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    skipIfModelSupportsVision: true,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  // Simulate system transform capturing a vision-capable model
  await plugin["experimental.chat.system.transform"]({
    model: {
      id: "gpt-4o",
      providerID: "openai",
      capabilities: { input: { image: true } },
    },
  })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  equal(msgs[0].parts.length, 1, "parts unchanged (skipped)")
  equal(msgs[0].parts[0].type, "file", "image part still present")
  equal(server.requestCount, 0, "no API call made")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 2: Model with capabilities.input.image: false → process
console.log("\n  Test 2: Model without vision capabilities → process")
{
  server.reset()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    skipIfModelSupportsVision: true,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  await plugin["experimental.chat.system.transform"]({
    model: {
      id: "gpt-4",
      providerID: "openai",
      capabilities: { input: { image: false } },
    },
  })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  equal(msgs[0].parts[0].type, "text", "image replaced with text")
  equal(server.requestCount, 1, "API call was made")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 3: visionModels pattern match → skip
console.log("\n  Test 3: visionModels pattern match → skip")
{
  server.reset()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    skipIfModelSupportsVision: true,
    visionModels: ["claude", "gemini"],
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  await plugin["experimental.chat.system.transform"]({
    model: {
      id: "claude-sonnet-4",
      providerID: "anthropic",
      capabilities: { input: { image: false } },
    },
  })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  equal(msgs[0].parts[0].type, "file", "image part still present (pattern matched)")
  equal(server.requestCount, 0, "no API call made")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 4: skipIfModelSupportsVision: false → process despite capabilities
console.log("\n  Test 4: skipIfModelSupportsVision: false → process despite capabilities")
{
  server.reset()
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

  await plugin["experimental.chat.system.transform"]({
    model: {
      id: "gpt-4o",
      providerID: "openai",
      capabilities: { input: { image: true } },
    },
  })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  equal(msgs[0].parts[0].type, "text", "image replaced despite vision capability")
  equal(server.requestCount, 1, "API call was made")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 5: No model captured → process (fallback)
console.log("\n  Test 5: No model captured → process (fallback)")
{
  server.reset()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    skipIfModelSupportsVision: true,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })
  // Don't call system.transform — no model captured

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  equal(msgs[0].parts[0].type, "text", "image replaced (no model to skip)")
  equal(server.requestCount, 1, "API call was made")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 6: visionModels empty array → only relies on capabilities
console.log("\n  Test 6: visionModels empty → only capabilities check")
{
  server.reset()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    skipIfModelSupportsVision: true,
    visionModels: [],
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  await plugin["experimental.chat.system.transform"]({
    model: {
      id: "claude-sonnet-4",
      providerID: "anthropic",
      capabilities: { input: { image: false } },
    },
  })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  equal(msgs[0].parts[0].type, "text", "image processed (no pattern match, no capability)")
  equal(server.requestCount, 1, "API call was made")

  rmSync(configDir, { recursive: true, force: true })
}

await server.stop()

const result = summary()
process.exit(result ? 0 : 1)
