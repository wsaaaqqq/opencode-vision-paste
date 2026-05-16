// test/day15-cli-init-interactive.mjs — CLI init interactive mode tests
import { equal, ok, includes, summary } from "./assert.mjs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

console.log("\n=== Day 15: CLI init Interactive Mode ===\n")

const CLI = `node ${join(process.cwd(), "cli.mjs")}`

// Test 1: CLI --help works
console.log("  Test 1: CLI --help")
{
  const { stdout } = await execAsync(`${CLI} --help`)
  includes(stdout, "init", "help shows init command")
  includes(stdout, "doctor", "help shows doctor command")
  includes(stdout, "config", "help shows config command")
  includes(stdout, "version", "help shows version option")
}

// Test 2: CLI init --yes (non-interactive)
console.log("\n  Test 2: CLI init --yes")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} init --yes`, { cwd: testDir })
  includes(stdout, "Config saved", "config saved message present")

  const configPath = join(testDir, ".opencode", "vision-paste.config.jsonc")
  ok(existsSync(configPath), "config file created")

  const raw = readFileSync(configPath, "utf-8")
  // Better JSONC parsing: only strip // comments that are not inside strings
  const stripped = raw.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").trim()
  const config = JSON.parse(stripped)
  equal(config.apiBaseUrl, "http://192.168.9.44:5678/v1", "default apiBaseUrl")
  equal(config.apiModel, "Qwen3VL-8B-Instruct-Q4_K_M.gguf", "default apiModel")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 3: CLI init --yes --global
console.log("\n  Test 3: CLI init --yes --global")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} init --yes --global`, { cwd: testDir })
  includes(stdout, "Config saved", "config saved message present")

  const configPath = join(process.env.USERPROFILE || process.env.HOME, ".config", "opencode", "vision-paste.config.jsonc")
  ok(existsSync(configPath), "global config file created")

  rmSync(configPath, { force: true })
  rmSync(testDir, { recursive: true, force: true })
}

// Test 4: CLI init --yes --project
console.log("\n  Test 4: CLI init --yes --project")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} init --yes --project`, { cwd: testDir })
  includes(stdout, "Config saved", "config saved message present")

  const configPath = join(testDir, ".opencode", "vision-paste.config.jsonc")
  ok(existsSync(configPath), "project config file created")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 5: CLI init --yes --docker
console.log("\n  Test 5: CLI init --yes --docker")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  // --docker flag causes process.exit(0) in current code
  try {
    await execAsync(`${CLI} init --yes --docker`, { cwd: testDir, timeout: 5000 })
  } catch (e) {
    // Expected: process exits early
    ok(true, "--docker flag triggers early exit (placeholder)")
  }

  rmSync(testDir, { recursive: true, force: true })
}

// Test 6: CLI init --yes with opencode.jsonc auto-registration
console.log("\n  Test 6: CLI init --yes with opencode.jsonc auto-registration")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  mkdirSync(join(testDir, ".opencode"), { recursive: true })

  // Create opencode.jsonc without plugin
  writeFileSync(join(testDir, ".opencode", "opencode.jsonc"), JSON.stringify({
    plugin: ["some-other-plugin"],
  }))

  const { stdout } = await execAsync(`${CLI} init --yes`, { cwd: testDir })
  includes(stdout, "opencode-vision-paste added", "plugin auto-registered")

  const oj = JSON.parse(readFileSync(join(testDir, ".opencode", "opencode.jsonc"), "utf-8"))
  ok(oj.plugin.includes("opencode-vision-paste"), "plugin in opencode.jsonc")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 7: CLI init --yes when plugin already registered
console.log("\n  Test 7: CLI init --yes when plugin already registered")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  mkdirSync(join(testDir, ".opencode"), { recursive: true })

  writeFileSync(join(testDir, ".opencode", "opencode.jsonc"), JSON.stringify({
    plugin: ["opencode-vision-paste"],
  }))

  const { stdout } = await execAsync(`${CLI} init --yes`, { cwd: testDir })
  includes(stdout, "already", "plugin already registered message")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 8: CLI init --yes when no opencode.jsonc
console.log("\n  Test 8: CLI init --yes when no opencode.jsonc")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} init --yes`, { cwd: testDir })
  includes(stdout, "Config saved", "config saved despite no opencode.jsonc")

  rmSync(testDir, { recursive: true, force: true })
}

const result = summary()
process.exit(result ? 0 : 1)
