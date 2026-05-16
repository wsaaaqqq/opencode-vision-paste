// test/day16-cli-init-advanced.mjs — CLI init advanced flags tests
import { equal, ok, includes, summary } from "./assert.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

console.log("\n=== Day 16: CLI init Advanced Flags ===\n")

const CLI = `node ${join(process.cwd(), "cli.mjs")}`

// Test 1: --yes saves defaults
console.log("  Test 1: --yes saves defaults")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  await execAsync(`${CLI} init --yes`, { cwd: testDir })

  const configPath = join(testDir, ".opencode", "vision-paste.config.jsonc")
  const raw = readFileSync(configPath, "utf-8")
  // Better JSONC parsing: only strip // comments not inside strings
  const stripped = raw.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").trim()
  const config = JSON.parse(stripped)

  equal(config.skipIfModelSupportsVision, true, "default skipIfModelSupportsVision")
  equal(config.healthCheckOnStart, true, "default healthCheckOnStart")
  equal(config.errorHints, true, "default errorHints")
  equal(config.promptLocale, "zh", "default promptLocale")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 2: --project forces project-level config
console.log("\n  Test 2: --project forces project-level config")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  await execAsync(`${CLI} init --yes --project`, { cwd: testDir })

  const configPath = join(testDir, ".opencode", "vision-paste.config.jsonc")
  ok(existsSync(configPath), "project config created")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 3: --global forces user-level config
console.log("\n  Test 3: --global forces user-level config")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  await execAsync(`${CLI} init --yes --global`, { cwd: testDir })

  const configPath = join(process.env.USERPROFILE || process.env.HOME, ".config", "opencode", "vision-paste.config.jsonc")
  ok(existsSync(configPath), "global config created")

  rmSync(configPath, { force: true })
  rmSync(testDir, { recursive: true, force: true })
}

// Test 4: Config file is valid JSONC
console.log("\n  Test 4: Config file is valid JSONC")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  await execAsync(`${CLI} init --yes`, { cwd: testDir })

  const configPath = join(testDir, ".opencode", "vision-paste.config.jsonc")
  const raw = readFileSync(configPath, "utf-8")
  const stripped = raw.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").trim()

  let parsed
  try {
    parsed = JSON.parse(stripped)
    ok(true, "config is valid JSON")
  } catch (e) {
    ok(false, `config is valid JSON: ${e.message}`)
  }

  ok(typeof parsed.apiBaseUrl === "string", "apiBaseUrl is string")
  ok(typeof parsed.apiModel === "string", "apiModel is string")
  ok(typeof parsed.skipIfModelSupportsVision === "boolean", "skipIfModelSupportsVision is boolean")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 5: All 10 config options present
console.log("\n  Test 5: All 10 config options present")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  await execAsync(`${CLI} init --yes`, { cwd: testDir })

  const configPath = join(testDir, ".opencode", "vision-paste.config.jsonc")
  const raw = readFileSync(configPath, "utf-8")
  const config = JSON.parse(raw.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").trim())

  const requiredKeys = [
    "apiBaseUrl", "apiModel", "apiKey", "promptTemplate", "promptLocale",
    "skipIfModelSupportsVision", "visionModels", "healthCheckOnStart", "verbose", "errorHints",
  ]

  for (const key of requiredKeys) {
    ok(key in config, `${key} present in config`)
  }

  rmSync(testDir, { recursive: true, force: true })
}

// Test 6: opencode.jsonc auto-registration with --yes
console.log("\n  Test 6: opencode.jsonc auto-registration with --yes")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  mkdirSync(join(testDir, ".opencode"), { recursive: true })

  writeFileSync(join(testDir, ".opencode", "opencode.jsonc"), JSON.stringify({}))

  await execAsync(`${CLI} init --yes`, { cwd: testDir })

  const ojPath = join(testDir, ".opencode", "opencode.jsonc")
  const oj = JSON.parse(readFileSync(ojPath, "utf-8"))
  ok(oj.plugin && oj.plugin.includes("opencode-vision-paste"), "plugin auto-registered with --yes")

  rmSync(testDir, { recursive: true, force: true })
}

const result = summary()
process.exit(result ? 0 : 1)
