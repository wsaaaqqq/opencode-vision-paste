// test/day14-regression.mjs — Buffer + regression fixes
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 14: Buffer + Regression Fixes ===\n")

clearTempDir()
clearDebugLog()

const server = createMockServer({ responseText: "regression test passed" })
const port = await server.start()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: Full pipeline regression
console.log("  Test 1: Full pipeline regression")
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
    parts: [
      { type: "text", text: "What is this?" },
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "regression test passed", "analysis result present")
  includes(text, "用户问题", "user question section present")
  includes(text, "What is this?", "user question preserved")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 2: Multiple consecutive calls
console.log("\n  Test 2: Multiple consecutive calls")
{
  for (let i = 0; i < 5; i++) {
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
    const output = { messages: msgs }
    await plugin["experimental.chat.messages.transform"]({}, output)

    const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
    includes(text, "regression test passed", `call ${i + 1} succeeded`)

    rmSync(configDir, { recursive: true, force: true })
  }
}

// Test 3: Config cascade regression
console.log("\n  Test 3: Config cascade regression")
{
  const baseDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const projectDir = join(baseDir, ".opencode")
  const userDir = join(tmpdir(), `vp-user-${Date.now()}`)
  mkdirSync(projectDir, { recursive: true })
  mkdirSync(userDir, { recursive: true })

  // Write user-level config
  writeFileSync(join(userDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://user-level:5678/v1",
  }))

  // Write project-level config
  writeFileSync(join(projectDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: baseDir })

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "regression test passed", "project-level config used")

  rmSync(baseDir, { recursive: true, force: true })
  rmSync(userDir, { recursive: true, force: true })
}

// Test 4: Smart skip + error handling regression
console.log("\n  Test 4: Smart skip + error handling regression")
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

  // Model without vision
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

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "regression test passed", "processed despite skipIfModelSupportsVision: true (model lacks vision)")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 5: Prompt resolution regression
console.log("\n  Test 5: Prompt resolution regression")
{
  server.reset()
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
}

await server.stop()

const result = summary()
process.exit(result ? 0 : 1)
