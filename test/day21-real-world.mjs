// test/day21-real-world.mjs — Real-world usage scenarios
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 21: Real-World Usage Scenarios ===\n")

clearTempDir()
clearDebugLog()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: New chat session → plugin initializes, health check runs
console.log("  Test 1: New chat session initialization")
{
  const server = createMockServer()
  const port = await server.start()

  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    healthCheckOnStart: true,
    skipIfModelSupportsVision: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  // Simulate new session
  await plugin.event({ event: { type: "session.created" } })
  equal(server.requestCount, 1, "health check ran on session start")

  // First message
  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "text", text: "Hello" }],
  }]
  await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })
  equal(msgs[0].parts[0].text, "Hello", "first message unchanged (no images)")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 2: Existing chat with history → plugin works correctly
console.log("\n  Test 2: Existing chat with history")
{
  const server = createMockServer({ responseText: "analysis" })
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

  // Simulate existing chat history
  const msgs = [
    { info: { role: "system" }, parts: [{ type: "text", text: "You are helpful" }] },
    { info: { role: "user" }, parts: [{ type: "text", text: "Hi" }] },
    { info: { role: "assistant" }, parts: [{ type: "text", text: "Hello!" }] },
    { info: { role: "user" }, parts: [{ type: "text", text: "Look at this" }] },
    { info: { role: "assistant" }, parts: [{ type: "text", text: "Sure!" }] },
    { info: { role: "user" }, parts: [{ type: "file", mime: "image/png", url: dataUrl }] },
  ]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  // Only last user message should be modified
  equal(msgs[0].parts[0].text, "You are helpful", "system message unchanged")
  equal(msgs[1].parts[0].text, "Hi", "first user message unchanged")
  equal(msgs[2].parts[0].text, "Hello!", "first assistant message unchanged")
  equal(msgs[3].parts[0].text, "Look at this", "second user message unchanged")
  equal(msgs[4].parts[0].text, "Sure!", "second assistant message unchanged")
  equal(msgs[5].parts[0].type, "text", "last user message modified (image → text)")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 3: Multiple consecutive image pastes
console.log("\n  Test 3: Multiple consecutive image pastes")
{
  for (let i = 0; i < 3; i++) {
    const server = createMockServer({ responseText: `result ${i + 1}` })
    const port = await server.start()

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
    includes(text, `result ${i + 1}`, `paste ${i + 1} processed independently`)

    rmSync(configDir, { recursive: true, force: true })
    await server.stop()
  }
}

// Test 4: Image paste followed by text-only message
console.log("\n  Test 4: Image paste followed by text-only message")
{
  const server = createMockServer({ responseText: "analysis" })
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

  // First: image paste
  const msgs1 = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  await plugin["experimental.chat.messages.transform"]({}, { messages: msgs1 })
  equal(msgs1[0].parts[0].type, "text", "image replaced with text")

  // Second: text-only message
  const msgs2 = [{
    info: { role: "user" },
    parts: [{ type: "text", text: "Follow up question" }],
  }]
  await plugin["experimental.chat.messages.transform"]({}, { messages: msgs2 })
  equal(msgs2[0].parts[0].text, "Follow up question", "text-only message unaffected")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 5: Plugin with different models (vision vs non-vision)
console.log("\n  Test 5: Plugin with different models")
{
  // Vision model → skip
  {
    const server = createMockServer({ responseText: "should not see" })
    const port = await server.start()

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
      model: { id: "gpt-4o", providerID: "openai", capabilities: { input: { image: true } } },
    })

    const msgs = [{
      info: { role: "user" },
      parts: [{ type: "file", mime: "image/png", url: dataUrl }],
    }]
    await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })
    equal(msgs[0].parts[0].type, "file", "vision model → skip")

    rmSync(configDir, { recursive: true, force: true })
    await server.stop()
  }

  // Non-vision model → process
  {
    const server = createMockServer({ responseText: "processed" })
    const port = await server.start()

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
      model: { id: "gpt-4", providerID: "openai", capabilities: { input: { image: false } } },
    })

    const msgs = [{
      info: { role: "user" },
      parts: [{ type: "file", mime: "image/png", url: dataUrl }],
    }]
    await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })
    equal(msgs[0].parts[0].type, "text", "non-vision model → process")

    rmSync(configDir, { recursive: true, force: true })
    await server.stop()
  }
}

const result = summary()
process.exit(result ? 0 : 1)
