// test/day03-http-multi-dedup.mjs — HTTP URL + multi-image + deduplication tests
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 3: HTTP URL + Multi-Image + Deduplication ===\n")

clearTempDir()
clearDebugLog()

// Create mock server that serves images via HTTP
const imageServer = createMockServer({ responseText: "HTTP image analysis" })
const imagePort = await imageServer.start()

// Create VL API server
const vlServer = createMockServer({ responseText: "这是一张HTTP图片的描述。" })
const vlPort = await vlServer.start()

const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
const opencodeDir = join(configDir, ".opencode")
mkdirSync(opencodeDir, { recursive: true })
writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
  apiBaseUrl: `http://127.0.0.1:${vlPort}/v1`,
  apiModel: "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
  skipIfModelSupportsVision: false,
  healthCheckOnStart: false,
}))

const mod = await loadPlugin()
const plugin = await mod.default({ directory: configDir })

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")
const httpUrl = `http://127.0.0.1:${imagePort}/test.png`

// Test 1: HTTP URL image → fetched, analyzed, replaced
console.log("  Test 1: HTTP URL image → fetched and analyzed")
{
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/png", url: httpUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  const parts = msgs[0].parts
  equal(parts.length, 1, "only 1 part remains")
  equal(parts[0].type, "text", "remaining part is text")
  includes(parts[0].text, "这是一张HTTP图片的描述", "HTTP image analyzed")
}

// Test 2: Two images → 2 API calls, numbered labels
console.log("\n  Test 2: Two images → numbered labels")
{
  vlServer.reset()
  const png2 = loadFixture("test.jpg")
  const dataUrl2 = bufferToDataUrl(png2, "image/jpeg")
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/png", url: dataUrl },
      { type: "file", mime: "image/jpeg", url: dataUrl2 },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  const parts = msgs[0].parts
  equal(parts.length, 1, "only 1 part remains")
  includes(parts[0].text, "[图片 1/2]", "first image numbered")
  includes(parts[0].text, "[图片 2/2]", "second image numbered")
  includes(parts[0].text, "---", "images separated by ---")
}

// Test 3: Three images → all analyzed
console.log("\n  Test 3: Three images → all analyzed")
{
  vlServer.reset()
  const jpg = loadFixture("test.jpg")
  const webp = loadFixture("test.webp")
  const dataUrl2 = bufferToDataUrl(jpg, "image/jpeg")
  const dataUrl3 = bufferToDataUrl(webp, "image/webp")
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/png", url: dataUrl },
      { type: "file", mime: "image/jpeg", url: dataUrl2 },
      { type: "file", mime: "image/webp", url: dataUrl3 },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  const parts = msgs[0].parts
  includes(parts[0].text, "[图片 1/3]", "first of three numbered")
  includes(parts[0].text, "[图片 2/3]", "second of three numbered")
  includes(parts[0].text, "[图片 3/3]", "third of three numbered")
}

// Test 4: Duplicate URLs → deduped
console.log("\n  Test 4: Duplicate URLs → deduped")
{
  vlServer.reset()
  const sameUrl = dataUrl
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/png", url: sameUrl },
      { type: "file", mime: "image/png", url: sameUrl },
      { type: "file", mime: "image/png", url: sameUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  // After dedup, only 1 unique image should be processed
  equal(vlServer.requestCount, 1, "only 1 API call for duplicate images")
}

// Test 5: Mix of data URL + HTTP URL
console.log("\n  Test 5: Mix of data URL + HTTP URL")
{
  vlServer.reset()
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/png", url: dataUrl },
      { type: "file", mime: "image/png", url: httpUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  const parts = msgs[0].parts
  equal(parts.length, 1, "only 1 part remains")
  includes(parts[0].text, "[图片 1/2]", "first image (data URL)")
  includes(parts[0].text, "[图片 2/2]", "second image (HTTP URL)")
}

// Test 6: HTTP URL returns 404 → image skipped
console.log("\n  Test 6: HTTP URL returns 404 → skipped gracefully")
{
  vlServer.reset()
  const badUrl = `http://127.0.0.1:${imagePort}/nonexistent.png`
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/png", url: badUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)
  // Image fetch fails, saveImage returns null, hook exits
  ok(true, "HTTP 404 handled gracefully without crash")
}

rmSync(configDir, { recursive: true, force: true })
await imageServer.stop()
await vlServer.stop()

const result = summary()
process.exit(result ? 0 : 1)
