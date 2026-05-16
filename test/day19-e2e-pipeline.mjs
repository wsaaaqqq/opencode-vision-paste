// test/day19-e2e-pipeline.mjs — Full pipeline E2E with real VL API
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog, readDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 19: Full Pipeline E2E ===\n")

clearTempDir()
clearDebugLog()

const server = createMockServer({
  responseText: "这是一张详细的图片分析结果。图片中显示了一个美丽的风景，有山有水。",
})
const port = await server.start()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: Real E2E: paste image → hits VL API → analysis text appears
console.log("  Test 1: Full E2E pipeline")
{
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    apiModel: "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
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
  includes(text, "这是一张详细的图片分析结果", "analysis text appears")
  includes(text, "美丽的风景", "detailed analysis content present")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 2: Image with user question → analysis + answer
console.log("\n  Test 2: Image with user question")
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

  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "text", text: "这张图片里有什么？" },
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "这是一张详细的图片分析结果", "analysis present")
  includes(text, "用户问题", "user question section present")
  includes(text, "这张图片里有什么？", "user question preserved")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 3: Image with no text → analysis only
console.log("\n  Test 3: Image with no text → analysis only")
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

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "这是一张详细的图片分析结果", "analysis present")
  ok(!text.includes("用户问题"), "no user question section when no user text")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 4: Timing — full pipeline completes within reasonable time
console.log("\n  Test 4: Timing — completes within 60s")
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

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }

  const start = Date.now()
  await plugin["experimental.chat.messages.transform"]({}, output)
  const elapsed = Date.now() - start

  ok(elapsed < 60000, `pipeline completed in ${elapsed}ms (< 60s)`)

  rmSync(configDir, { recursive: true, force: true })
}

// Test 5: Temp files cleaned up after processing
console.log("\n  Test 5: Temp files cleaned up")
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

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  const tempDir = join(tmpdir(), "vision-paste")
  const { readdirSync, existsSync } = await import("node:fs")
  const files = existsSync(tempDir) ? readdirSync(tempDir).filter(f => f !== "debug.log") : []
  equal(files.length, 0, "no leftover temp files")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 6: Debug log shows complete flow
console.log("\n  Test 6: Debug log shows complete flow")
{
  clearDebugLog()
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

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  // Wait for async log writes
  await new Promise(r => setTimeout(r, 300))

  const log = readDebugLog()
  includes(log, "INIT", "INIT logged")
  includes(log, "HOOK", "HOOK logged")
  includes(log, "IMAGES", "IMAGES logged")
  includes(log, "API_CALL", "API_CALL logged")
  includes(log, "API_OK", "API_OK logged")
  includes(log, "DONE", "DONE logged")
  includes(log, "CLEANUP", "CLEANUP logged")

  rmSync(configDir, { recursive: true, force: true })
}

await server.stop()

const result = summary()
process.exit(result ? 0 : 1)
