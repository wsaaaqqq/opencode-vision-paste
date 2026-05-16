// test/day07-temp-logging.mjs — Temp file management + debug logging tests
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, matches, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog, getTempDir, readDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, statSync, utimesSync } from "node:fs"

console.log("\n=== Day 7: Temp File Management + Debug Logging ===\n")

clearTempDir()
clearDebugLog()

const server = createMockServer({ responseText: "test" })
const port = await server.start()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

// Test 1: Temp dir created on first use
console.log("  Test 1: Temp dir created on first use")
{
  clearTempDir()
  ok(!existsSync(getTempDir()), "temp dir doesn't exist before")

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

  ok(existsSync(getTempDir()), "temp dir created after processing")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 2: Files older than 24h deleted on startup
console.log("\n  Test 2: Files older than 24h deleted on startup")
{
  clearTempDir()
  mkdirSync(getTempDir(), { recursive: true })
  const oldFile = join(getTempDir(), "old-file.png")
  writeFileSync(oldFile, png)
  // Set modification time to 25 hours ago
  const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000)
  utimesSync(oldFile, oldTime, oldTime)
  ok(existsSync(oldFile), "old file exists before")

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

  ok(!existsSync(oldFile), "old file deleted on startup")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 3: Files newer than 24h preserved
console.log("\n  Test 3: Files newer than 24h preserved")
{
  clearTempDir()
  mkdirSync(getTempDir(), { recursive: true })
  const newFile = join(getTempDir(), "new-file.png")
  writeFileSync(newFile, png)
  ok(existsSync(newFile), "new file exists before")

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

  ok(existsSync(newFile), "new file preserved after startup")

  rmSync(configDir, { recursive: true, force: true })
  rmSync(newFile, { force: true })
}

// Test 4: Temp dir doesn't exist → cleanup skips gracefully
console.log("\n  Test 4: Temp dir doesn't exist → cleanup skips gracefully")
{
  clearTempDir()
  ok(!existsSync(getTempDir()), "temp dir doesn't exist")

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
  ok(true, "cleanup skipped gracefully when temp dir missing")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 5: Files deleted immediately after API call
console.log("\n  Test 5: Files deleted after API call (finally block)")
{
  clearTempDir()
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
  await new Promise(r => setTimeout(r, 100))

  // Check that temp dir has no leftover image files (debug.log is expected)
  const files = existsSync(getTempDir()) ? readdirSync(getTempDir()).filter(f => f !== "debug.log") : []
  equal(files.length, 0, "no leftover temp files after processing")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 6: Debug log written with correct format
console.log("\n  Test 6: Debug log format")
{
  clearTempDir()
  clearDebugLog()

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
  await new Promise(r => setTimeout(r, 200))

  const log = readDebugLog()
  ok(log.length > 0, "debug log has content")
  matches(log, /\[\d{4}-\d{2}-\d{2}T/, "log has ISO timestamp")

  rmSync(configDir, { recursive: true, force: true })
}

// Test 7: Log includes performance metrics
console.log("\n  Test 7: Log includes performance metrics")
{
  clearTempDir()
  clearDebugLog()

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

  // Wait for async INIT/CLEAN log writes
  await new Promise(r => setTimeout(r, 200))

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  // Wait for async log writes
  await new Promise(r => setTimeout(r, 500))

  const log = readDebugLog()
  ok(log.length > 0, "log has content")

  // Check for reliably written entries
  includes(log, "SAVED", "SAVED log present")
  includes(log, "API_CALL", "API_CALL log present")
  includes(log, "API.fetch", "API.fetch log present")
  includes(log, "API.done", "API.done log present")
  includes(log, "API_OK", "API_OK log present")
  includes(log, "CLEANUP", "CLEANUP log present")
  includes(log, "DONE", "DONE log present")

  rmSync(configDir, { recursive: true, force: true })
}

await server.stop()

const result = summary()
process.exit(result ? 0 : 1)
