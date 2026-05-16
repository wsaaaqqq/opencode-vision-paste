// test/day18-cli-config.mjs — CLI config command tests
import { equal, ok, includes, summary } from "./assert.mjs"
import { tmpdir, homedir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

console.log("\n=== Day 18: CLI config Command ===\n")

const CLI = `node ${join(process.cwd(), "cli.mjs")}`

// Test 1: config with project-level config
console.log("  Test 1: config with project-level config")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  mkdirSync(join(testDir, ".opencode"), { recursive: true })
  writeFileSync(join(testDir, ".opencode", "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://project:5678/v1",
    apiModel: "project-model",
  }))

  const { stdout } = await execAsync(`${CLI} config`, { cwd: testDir })
  includes(stdout, "project-level", "source shows project-level")
  includes(stdout, "http://project:5678/v1", "apiBaseUrl shown")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 2: config with user-level config only
console.log("\n  Test 2: config with user-level config only")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const userDir = join(homedir(), ".config", "opencode")
  mkdirSync(userDir, { recursive: true })
  writeFileSync(join(userDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://user:5678/v1",
  }))

  const { stdout } = await execAsync(`${CLI} config`, { cwd: testDir })
  includes(stdout, "user-level", "source shows user-level")

  rmSync(join(userDir, "vision-paste.config.jsonc"), { force: true })
  rmSync(testDir, { recursive: true, force: true })
}

// Test 3: config with no config → built-in defaults
console.log("\n  Test 3: config with no config → built-in defaults")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} config`, { cwd: testDir })
  includes(stdout, "built-in defaults", "source shows built-in defaults")
  includes(stdout, "http://192.168.9.44:5678/v1", "default apiBaseUrl shown")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 4: output is valid JSONC
console.log("\n  Test 4: output is valid JSONC")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} config`, { cwd: testDir })
  // Extract JSON from output
  const jsonMatch = stdout.match(/\{[\s\S]*\}/)
  ok(jsonMatch, "output contains JSON object")

  if (jsonMatch) {
    const stripped = jsonMatch[0].replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").trim()
    let parsed
    try {
      parsed = JSON.parse(stripped)
      ok(true, "output is valid JSON")
    } catch (e) {
      ok(false, `output is valid JSON: ${e.message}`)
    }
  }

  rmSync(testDir, { recursive: true, force: true })
}

// Test 5: all 10 config options displayed
console.log("\n  Test 5: all 10 config options displayed")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} config`, { cwd: testDir })

  const requiredKeys = [
    "apiBaseUrl", "apiModel", "apiKey", "promptTemplate", "promptLocale",
    "skipIfModelSupportsVision", "visionModels", "healthCheckOnStart", "verbose", "errorHints",
  ]

  for (const key of requiredKeys) {
    includes(stdout, key, `${key} displayed`)
  }

  rmSync(testDir, { recursive: true, force: true })
}

// Test 6: project-level wins over user-level
console.log("\n  Test 6: project-level wins over user-level")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  mkdirSync(join(testDir, ".opencode"), { recursive: true })
  writeFileSync(join(testDir, ".opencode", "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://project:5678/v1",
  }))

  const userDir = join(homedir(), ".config", "opencode")
  mkdirSync(userDir, { recursive: true })
  writeFileSync(join(userDir, "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://user:5678/v1",
  }))

  const { stdout } = await execAsync(`${CLI} config`, { cwd: testDir })
  includes(stdout, "http://project:5678/v1", "project-level config used")

  rmSync(join(userDir, "vision-paste.config.jsonc"), { force: true })
  rmSync(testDir, { recursive: true, force: true })
}

const result = summary()
process.exit(result ? 0 : 1)
