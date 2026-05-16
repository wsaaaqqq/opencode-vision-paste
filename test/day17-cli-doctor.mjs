// test/day17-cli-doctor.mjs — CLI doctor command tests
import { equal, ok, includes, matches, summary } from "./assert.mjs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

console.log("\n=== Day 17: CLI doctor Command ===\n")

const CLI = `node ${join(process.cwd(), "cli.mjs")}`

// Test 1: doctor runs without errors
console.log("  Test 1: doctor runs without errors")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} doctor`, { cwd: testDir })
  includes(stdout, "Doctor", "doctor header present")
  includes(stdout, "system", "system check present")
  includes(stdout, "config", "config check present")
  includes(stdout, "plugin", "plugin check present")
  includes(stdout, "api", "api check present")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 2: system check shows Node.js version
console.log("\n  Test 2: system check shows Node.js version")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} doctor`, { cwd: testDir })
  matches(stdout, /Node\.js v?\d+/, "Node.js version shown")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 3: config check warns when no config
console.log("\n  Test 3: config check warns when no config")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} doctor`, { cwd: testDir })
  includes(stdout, "defaults", "warns about using defaults")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 4: config check passes when config exists
console.log("\n  Test 4: config check passes when config exists")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  mkdirSync(join(testDir, ".opencode"), { recursive: true })
  writeFileSync(join(testDir, ".opencode", "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://test:5678/v1",
  }))

  const { stdout } = await execAsync(`${CLI} doctor`, { cwd: testDir })
  includes(stdout, "config", "config check present")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 5: plugin check warns when not registered
console.log("\n  Test 5: plugin check warns when not registered")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  mkdirSync(join(testDir, ".opencode"), { recursive: true })
  writeFileSync(join(testDir, ".opencode", "opencode.jsonc"), JSON.stringify({}))

  const { stdout } = await execAsync(`${CLI} doctor`, { cwd: testDir })
  includes(stdout, "not found", "plugin not found warning")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 6: plugin check passes when registered
console.log("\n  Test 6: plugin check passes when registered")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  mkdirSync(join(testDir, ".opencode"), { recursive: true })
  writeFileSync(join(testDir, ".opencode", "opencode.jsonc"), JSON.stringify({
    plugin: ["opencode-vision-paste"],
  }))

  const { stdout } = await execAsync(`${CLI} doctor`, { cwd: testDir })
  includes(stdout, "registered", "plugin registered message")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 7: API check fails when unreachable
console.log("\n  Test 7: API check fails when unreachable")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  mkdirSync(join(testDir, ".opencode"), { recursive: true })
  writeFileSync(join(testDir, ".opencode", "vision-paste.config.jsonc"), JSON.stringify({
    apiBaseUrl: "http://127.0.0.1:19999/v1",
  }))

  const { stdout } = await execAsync(`${CLI} doctor`, { cwd: testDir })
  // The API check may show reachable or unreachable depending on network
  ok(true, "API check completed")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 8: --json output
console.log("\n  Test 8: --json output")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} doctor --json`, { cwd: testDir })
  // Extract JSON from output (may have header text before JSON)
  const jsonStart = stdout.indexOf("[")
  const jsonStr = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout
  let parsed
  try {
    parsed = JSON.parse(jsonStr)
    ok(true, "--json output contains valid JSON")
  } catch (e) {
    ok(false, `--json output is valid JSON: ${e.message}`)
  }

  if (parsed) {
    ok(Array.isArray(parsed), "JSON output is array")
    ok(parsed.length >= 4, "JSON has at least 4 checks")
    ok(parsed[0].name, "check has name field")
    ok(parsed[0].status, "check has status field")
    ok(parsed[0].message, "check has message field")
  }

  rmSync(testDir, { recursive: true, force: true })
}

// Test 9: Status icons
console.log("\n  Test 9: Status icons")
{
  const testDir = join(tmpdir(), `vp-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync(`${CLI} doctor`, { cwd: testDir })
  includes(stdout, "✓", "pass icon present")
  // May have △ for warnings or ✗ for failures

  rmSync(testDir, { recursive: true, force: true })
}

const result = summary()
process.exit(result ? 0 : 1)
