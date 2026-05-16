// test/day28-bugfixes.mjs — Bug fixes + polish verification
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 28: Bug Fixes + Polish Verification ===\n")

clearTempDir()
clearDebugLog()

const server = createMockServer({ responseText: "polish test" })
const port = await server.start()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: Plugin doesn't crash on empty messages array
console.log("  Test 1: Empty messages array")
{
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

  const msgs = []
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  ok(true, "empty messages array handled")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 2: Plugin doesn't crash on message without parts
console.log("\n  Test 2: Message without parts")
{
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

  const msgs = [{ info: { role: "user" } }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  ok(true, "message without parts handled")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 3: Plugin doesn't crash on message without info
console.log("\n  Test 3: Message without info")
{
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

  const msgs = [{ parts: [{ type: "text", text: "Hello" }] }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  ok(true, "message without info handled")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 4: Plugin handles image part without url
console.log("\n  Test 4: Image part without url")
{
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
    parts: [{ type: "file", mime: "image/png" }], // no url
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  ok(true, "image part without url handled")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 5: Plugin handles data URL without base64 prefix
console.log("\n  Test 5: Data URL without base64")
{
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
    parts: [{ type: "file", mime: "image/png", url: "data:image/png,not-base64" }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  ok(true, "data URL without base64 handled")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 6: Plugin handles API URL with trailing slash
console.log("\n  Test 6: API URL with trailing slash")
{
  server.reset()
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1/`, // trailing slash
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
  includes(text, "polish test", "trailing slash handled correctly")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 7: Plugin handles multiple sessions (re-initialization)
console.log("\n  Test 7: Multiple plugin instances")
{
  for (let i = 0; i < 3; i++) {
    server.reset()
    const configDir = join(tmpdir(), `vp-test-${Date.now()}-${i}`)
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
    await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })

    const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
    includes(text, "polish test", `instance ${i + 1} works`)

    rmSync(configDir, { recursive: true, force: true })
  }
}

// Test 8: Plugin handles very long user text
console.log("\n  Test 8: Very long user text")
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

  const longText = "A".repeat(10000)
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "text", text: longText },
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "polish test", "long user text handled")

  rmSync(configDir, { recursive: true, force: true })
}

await server.stop()

const result = summary()
process.exit(result ? 0 : 1)
