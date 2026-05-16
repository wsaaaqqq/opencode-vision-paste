// test/day01-harness.mjs — Test harness setup verification
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, notOk, summary, reset } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"

console.log("\n=== Day 1: Test Harness Setup ===\n")

// Test 1: Mock server starts and stops
console.log("  Mock server lifecycle:")
const server = createMockServer({ responseText: "test response" })
const port = await server.start()
ok(port > 0, "server starts on valid port")
equal(server.url, `http://127.0.0.1:${port}`, "server.url returns correct URL")
await server.stop()
ok(true, "server stops cleanly")

// Test 2: Mock server responds to /models
console.log("\n  Mock server /models endpoint:")
const server2 = createMockServer({
  modelsResponse: { data: [{ id: "test-model" }] },
})
const port2 = await server2.start()
const modelsRes = await fetch(`http://127.0.0.1:${port2}/models`)
const modelsData = await modelsRes.json()
equal(modelsData.data[0].id, "test-model", "/models returns correct data")
await server2.stop()

// Test 3: Mock server responds to /chat/completions
console.log("\n  Mock server /chat/completions endpoint:")
const server3 = createMockServer({ responseText: "Hello from mock!" })
const port3 = await server3.start()
const chatRes = await fetch(`http://127.0.0.1:${port3}/v1/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "test",
    messages: [{ role: "user", content: "hi" }],
  }),
})
const chatData = await chatRes.json()
equal(chatData.choices[0].message.content, "Hello from mock!", "/chat/completions returns correct response")
await server3.stop()

// Test 4: Mock server tracks requests
console.log("\n  Mock server request tracking:")
const server4 = createMockServer()
const port4 = await server4.start()
await fetch(`http://127.0.0.1:${port4}/models`)
await fetch(`http://127.0.0.1:${port4}/v1/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "test", messages: [] }),
})
equal(server4.requestCount, 2, "requestCount tracks all requests")
equal(server4.lastRequestBody.model, "test", "lastRequestBody captures POST body")
equal(server4.requestHistory.length, 2, "requestHistory has correct length")
await server4.stop()

// Test 5: Mock server failure modes
console.log("\n  Mock server failure modes:")
const server5 = createMockServer({ shouldFail: true, failStatus: 500, failBody: "error" })
const port5 = await server5.start()
const failRes = await fetch(`http://127.0.0.1:${port5}/v1/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "test", messages: [] }),
})
equal(failRes.status, 500, "failure mode returns correct status")
await server5.stop()

// Test 6: Plugin loads
console.log("\n  Plugin loading:")
const mod = await loadPlugin()
ok(typeof mod.default === "function", "plugin default export is a function")

// Test 7: Plugin initializes with input
console.log("\n  Plugin initialization:")
clearTempDir()
clearDebugLog()
const plugin = await mod.default({ directory: process.cwd() })
ok(typeof plugin.event === "function", "plugin has event hook")
ok(typeof plugin["experimental.chat.system.transform"] === "function", "plugin has system transform hook")
ok(typeof plugin["experimental.chat.messages.transform"] === "function", "plugin has messages transform hook")

// Test 8: Fixtures exist
console.log("\n  Test fixtures:")
const png = loadFixture("test.png")
ok(png.length > 0, "test.png fixture exists and has content")
const jpg = loadFixture("test.jpg")
ok(jpg.length > 0, "test.jpg fixture exists and has content")
const webp = loadFixture("test.webp")
ok(webp.length > 0, "test.webp fixture exists and has content")
const gif = loadFixture("test.gif")
ok(gif.length > 0, "test.gif fixture exists and has content")
const bmp = loadFixture("test.bmp")
ok(bmp.length > 0, "test.bmp fixture exists and has content")
const empty = loadFixture("empty.png")
equal(empty.length, 0, "empty.png fixture is zero bytes")

// Test 9: Data URL conversion
console.log("\n  Data URL utilities:")
const dataUrl = bufferToDataUrl(png, "image/png")
ok(dataUrl.startsWith("data:image/png;base64,"), "bufferToDataUrl creates correct data URL")

// Test 10: Mock server reset
console.log("\n  Mock server reset:")
const server6 = createMockServer()
const port6 = await server6.start()
await fetch(`http://127.0.0.1:${port6}/models`)
equal(server6.requestCount, 1, "request count before reset")
server6.reset()
equal(server6.requestCount, 0, "request count after reset")
equal(server6.lastRequestBody, null, "lastRequestBody after reset")
await server6.stop()

const result = summary()
process.exit(result ? 0 : 1)
