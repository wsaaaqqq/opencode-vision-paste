// test/day11-file-edge-cases.mjs — File format edge case tests
import { createMockServer } from "./mock-server.mjs"
import { equal, ok, includes, summary } from "./assert.mjs"
import { loadPlugin, bufferToDataUrl, loadFixture, clearTempDir, clearDebugLog } from "./helpers.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"

console.log("\n=== Day 11: File Format Edge Cases ===\n")

clearTempDir()
clearDebugLog()

// Test 1: All supported MIME types
console.log("  Test 1: All supported MIME types")
{
  const server = createMockServer({ responseText: "test" })
  const port = await server.start()

  const types = [
    { mime: "image/png", fixture: "test.png" },
    { mime: "image/jpeg", fixture: "test.jpg" },
    { mime: "image/webp", fixture: "test.webp" },
    { mime: "image/gif", fixture: "test.gif" },
    { mime: "image/bmp", fixture: "test.bmp" },
  ]

  for (const { mime, fixture } of types) {
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

    const buf = loadFixture(fixture)
    const dataUrl = bufferToDataUrl(buf, mime)

    const msgs = [{
      info: { role: "user" },
      parts: [{ type: "file", mime, url: dataUrl }],
    }]
    const output = { messages: msgs }
    await plugin["experimental.chat.messages.transform"]({}, output)

    const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
    includes(text, "test", `${mime} processed correctly`)

    rmSync(configDir, { recursive: true, force: true })
  }

  await server.stop()
}

// Test 2: Unknown MIME type → fallback to png
console.log("\n  Test 2: Unknown MIME type → fallback to png")
{
  const server = createMockServer({ responseText: "test" })
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

  const buf = loadFixture("test.png")
  const dataUrl = bufferToDataUrl(buf, "image/x-unknown")

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/x-unknown", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  // Should still process (fallback to png extension)
  const text = msgs[0].parts.find(p => p.type === "text")?.text || ""
  includes(text, "test", "unknown MIME type handled with fallback")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 3: Malformed base64 data URL → saveImage returns null
console.log("\n  Test 3: Malformed base64 → handled gracefully")
{
  const server = createMockServer({ responseText: "test" })
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

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: "data:image/png;base64,!!!invalid!!!" }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  // Malformed base64 may still be processed (Buffer.from handles it), but shouldn't crash
  ok(true, "malformed base64 handled without crash")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 4: Zero-byte image file → error
console.log("\n  Test 4: Zero-byte image → error handled")
{
  const server = createMockServer({ responseText: "test" })
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

  const emptyBuf = loadFixture("empty.png")
  const dataUrl = bufferToDataUrl(emptyBuf, "image/png")

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }

  // Should not crash
  await plugin["experimental.chat.messages.transform"]({}, output)
  ok(true, "zero-byte image handled without crash")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 5: Missing image file → error
console.log("\n  Test 5: Missing image file → error handled")
{
  const server = createMockServer({ responseText: "test" })
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

  // HTTP URL that returns 404
  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: "http://127.0.0.1:19999/nonexistent.png" }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  // HTTP fetch fails, saveImage returns null, hook exits early
  ok(true, "missing HTTP image handled gracefully")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

// Test 6: Large image (simulate)
console.log("\n  Test 6: Large image (1MB simulated)")
{
  const server = createMockServer({ responseText: "test" })
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

  // Create a 1MB buffer
  const largeBuf = Buffer.alloc(1024 * 1024, 0)
  // Make it a valid-ish PNG header
  largeBuf[0] = 0x89; largeBuf[1] = 0x50; largeBuf[2] = 0x4e; largeBuf[3] = 0x47
  const dataUrl = bufferToDataUrl(largeBuf, "image/png")

  const msgs = [{
    info: { role: "user" },
    parts: [{ type: "file", mime: "image/png", url: dataUrl }],
  }]
  const output = { messages: msgs }
  await plugin["experimental.chat.messages.transform"]({}, output)

  // Should process without crash (may fail API but shouldn't crash plugin)
  ok(true, "large image handled without crash")

  rmSync(configDir, { recursive: true, force: true })
  await server.stop()
}

const result = summary()
process.exit(result ? 0 : 1)
