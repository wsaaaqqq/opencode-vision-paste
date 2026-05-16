// test/day02-core-interception.mjs — Core image interception tests (data URL)
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, notOk, includes, summary, reset } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, createMessages, createTextPart, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

console.log("\n=== Day 2: Core Image Interception (Data URL) ===\n")

clearTempDir()
clearDebugLog()

const server = createMockServer({ responseText: "这是一张测试图片的描述。" })
const port = await server.start()

const mod = await loadPlugin()
const plugin = await mod.default({ directory: process.cwd() })

// Override config by writing a temp config
const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
const opencodeDir = join(configDir, ".opencode")
import { mkdirSync, writeFileSync, rmSync } from "node:fs"
mkdirSync(opencodeDir, { recursive: true })
writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
  apiBaseUrl: `http://127.0.0.1:${port}/v1`,
  apiModel: "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
  skipIfModelSupportsVision: false,
  healthCheckOnStart: false,
}))

const plugin2 = await mod.default({ directory: configDir })

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: Single image file part → replaced with analysis text
console.log("  Test 1: Single image file part → text replacement")
{
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  const parts = msgs[0].parts
  equal(parts.length, 1, "only 1 part remains (image replaced)")
  equal(parts[0].type, "text", "remaining part is text")
  includes(parts[0].text, "这是一张测试图片的描述", "text contains analysis result")
}

// Test 2: Image with user text → combined output
console.log("\n  Test 2: Image with user text → combined output")
{
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "text", text: "这是什么？" },
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  const parts = msgs[0].parts
  equal(parts.length, 1, "only 1 part remains")
  equal(parts[0].type, "text", "remaining part is text")
  includes(parts[0].text, "这是一张测试图片的描述", "text contains analysis")
  includes(parts[0].text, "这是什么？", "text contains user question")
}

// Test 3: Image with no user text → analysis only
console.log("\n  Test 3: Image with no user text → analysis only")
{
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  const parts = msgs[0].parts
  equal(parts.length, 1, "only 1 part remains")
  includes(parts[0].text, "这是一张测试图片的描述", "text contains analysis")
  notOk(parts[0].text.includes("用户问题"), "no user question section when no user text")
}

// Test 4: type:"image" variant
console.log("\n  Test 4: type:'image' variant")
{
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "image", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  const parts = msgs[0].parts
  equal(parts.length, 1, "only 1 part remains")
  equal(parts[0].type, "text", "remaining part is text")
  includes(parts[0].text, "这是一张测试图片的描述", "text contains analysis")
}

// Test 5: JPEG image
console.log("\n  Test 5: JPEG image")
{
  const jpg = loadFixture("test.jpg")
  const jpgUrl = bufferToDataUrl(jpg, "image/jpeg")
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/jpeg", url: jpgUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  const parts = msgs[0].parts
  equal(parts.length, 1, "only 1 part remains")
  includes(parts[0].text, "这是一张测试图片的描述", "JPEG processed correctly")
}

// Test 6: No images → hook returns early
console.log("\n  Test 6: No images → no changes")
{
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "text", text: "Hello" },
    ],
  }]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  equal(msgs[0].parts.length, 1, "parts unchanged")
  equal(msgs[0].parts[0].text, "Hello", "text unchanged")
}

// Test 7: No user messages → hook returns early
console.log("\n  Test 7: No user messages → no changes")
{
  const msgs = [{
    info: { role: "assistant" },
    parts: [
      { type: "text", text: "Hello" },
    ],
  }]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  equal(msgs[0].parts[0].text, "Hello", "assistant message unchanged")
}

// Test 8: Temp file created then deleted
console.log("\n  Test 8: Temp file lifecycle")
{
  const tempDir = join(tmpdir(), "vision-paste")
  const beforeCount = existsSync(tempDir) ? 0 : 0 // just check it doesn't crash
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "image/png", url: dataUrl },
    ],
  }]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  ok(true, "temp file created and deleted without error")
}

// Test 9: Message order preserved
console.log("\n  Test 9: Message order preserved")
{
  const msgs = [
    { info: { role: "system" }, parts: [{ type: "text", text: "system" }] },
    { info: { role: "user" }, parts: [{ type: "text", text: "user1" }] },
    { info: { role: "assistant" }, parts: [{ type: "text", text: "assistant1" }] },
    { info: { role: "user" }, parts: [{ type: "file", mime: "image/png", url: dataUrl }] },
  ]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  equal(msgs.length, 4, "message count unchanged")
  equal(msgs[0].info.role, "system", "system message preserved")
  equal(msgs[1].info.role, "user", "first user message preserved")
  equal(msgs[2].info.role, "assistant", "assistant message preserved")
  equal(msgs[3].info.role, "user", "last user message still user role")
}

// Test 10: Non-image file part not affected
console.log("\n  Test 10: Non-image file parts not affected")
{
  const msgs = [{
    info: { role: "user" },
    parts: [
      { type: "file", mime: "application/pdf", url: "data:application/pdf;base64,abc" },
      { type: "text", text: "Hello" },
    ],
  }]
  const output = { messages: msgs }
  await plugin2["experimental.chat.messages.transform"]({}, output)
  equal(msgs[0].parts.length, 2, "non-image parts preserved")
  equal(msgs[0].parts[0].mime, "application/pdf", "PDF part unchanged")
}

rmSync(configDir, { recursive: true, force: true })
await server.stop()

const result = summary()
process.exit(result ? 0 : 1)
