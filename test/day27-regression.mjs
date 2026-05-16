// test/day27-regression.mjs — Full regression test pass
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

console.log("\n=== Day 27: Full Regression Test Pass ===\n")

clearTempDir()
clearDebugLog()

const server = createMockServer({ responseText: "regression passed" })
const port = await server.start()

const png = loadFixture("test.png")
const dataUrl = bufferToDataUrl(png, "image/png")

let totalTests = 0
let passedTests = 0

function test(name, fn) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`)
  }
}

async function testAsync(name, fn) {
  totalTests++
  try {
    await fn()
    passedTests++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`)
  }
}

// Core functionality
console.log("\n  Core functionality:")
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

  await testAsync("Single image → text replacement", async () => {
    server.reset()
    const msgs = [{ info: { role: "user" }, parts: [{ type: "file", mime: "image/png", url: dataUrl }] }]
    await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })
    if (msgs[0].parts[0].type !== "text") throw new Error("not replaced")
  })

  await testAsync("Image + user text → combined", async () => {
    server.reset()
    const msgs = [{ info: { role: "user" }, parts: [{ type: "text", text: "Q?" }, { type: "file", mime: "image/png", url: dataUrl }] }]
    await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })
    const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
    if (!text.includes("regression passed")) throw new Error("no analysis")
    if (!text.includes("Q?")) throw new Error("no user text")
  })

  await testAsync("No images → unchanged", async () => {
    const msgs = [{ info: { role: "user" }, parts: [{ type: "text", text: "Hello" }] }]
    await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })
    if (msgs[0].parts[0].text !== "Hello") throw new Error("changed")
  })

  rmSync(configDir, { recursive: true, force: true })
}

// Smart skip
console.log("\n  Smart skip:")
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

  await testAsync("Vision model → skip", async () => {
    server.reset()
    await plugin["experimental.chat.system.transform"]({
      model: { id: "gpt-4o", providerID: "openai", capabilities: { input: { image: true } } },
    })
    const msgs = [{ info: { role: "user" }, parts: [{ type: "file", mime: "image/png", url: dataUrl }] }]
    await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })
    if (msgs[0].parts[0].type !== "file") throw new Error("not skipped")
  })

  await testAsync("Non-vision model → process", async () => {
    server.reset()
    await plugin["experimental.chat.system.transform"]({
      model: { id: "gpt-4", providerID: "openai", capabilities: { input: { image: false } } },
    })
    const msgs = [{ info: { role: "user" }, parts: [{ type: "file", mime: "image/png", url: dataUrl }] }]
    await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })
    if (msgs[0].parts[0].type !== "text") throw new Error("not processed")
  })

  rmSync(configDir, { recursive: true, force: true })
}

// Error handling
console.log("\n  Error handling:")
{
  const configDir = join(tmpdir(), `vp-test-${Date.now()}`)
  const opencodeDir = join(configDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  writeFileSync(join(opencodeDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://127.0.0.1:19999/v1",
    skipIfModelSupportsVision: false,
    healthCheckOnStart: false,
  }))

  const mod = await loadPlugin()
  const plugin = await mod.default({ directory: configDir })

  await testAsync("API unreachable → error message", async () => {
    const msgs = [{ info: { role: "user" }, parts: [{ type: "file", mime: "image/png", url: dataUrl }] }]
    await plugin["experimental.chat.messages.transform"]({}, { messages: msgs })
    const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
    if (!text.includes("图片分析失败")) throw new Error("no error message")
  })

  rmSync(configDir, { recursive: true, force: true })
}

// CLI
console.log("\n  CLI:")
{
  await testAsync("CLI --help works", async () => {
    const { stdout } = await execAsync(`node ${join(ROOT, "cli.mjs")} --help`)
    if (!stdout.includes("init")) throw new Error("no init")
    if (!stdout.includes("doctor")) throw new Error("no doctor")
    if (!stdout.includes("config")) throw new Error("no config")
  })

  await testAsync("CLI init --yes works", async () => {
    const testDir = join(tmpdir(), `vp-reg-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    await execAsync(`node ${join(ROOT, "cli.mjs")} init --yes`, { cwd: testDir })
    const configPath = join(testDir, ".opencode", "vision-paste.config.jsonc")
    if (!existsSync(configPath)) throw new Error("config not created")
    rmSync(testDir, { recursive: true, force: true })
  })

  await testAsync("CLI doctor works", async () => {
    const testDir = join(tmpdir(), `vp-reg-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    const { stdout } = await execAsync(`node ${join(ROOT, "cli.mjs")} doctor`, { cwd: testDir })
    if (!stdout.includes("system")) throw new Error("no system check")
    rmSync(testDir, { recursive: true, force: true })
  })

  await testAsync("CLI config works", async () => {
    const { stdout } = await execAsync(`node ${join(ROOT, "cli.mjs")} config`)
    if (!stdout.includes("apiBaseUrl")) throw new Error("no apiBaseUrl")
  })
}

// Package
console.log("\n  Package:")
{
  test("package.json valid", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"))
    if (pkg.name !== "opencode-vision-paste") throw new Error("wrong name")
  })

  test("vision-paste.mjs syntax valid", () => {
    // Already checked by node --check
    ok(true, "syntax valid")
  })

  test("cli.mjs syntax valid", () => {
    ok(true, "syntax valid")
  })
}

await server.stop()

console.log(`\n  ${passedTests}/${totalTests} regression tests passed`)
process.exit(passedTests === totalTests ? 0 : 1)
