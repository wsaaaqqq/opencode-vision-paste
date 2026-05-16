// test/day24-npm-package.mjs — npm package structure tests
import { equal, ok, includes, summary } from "./assert.mjs"
import { join, dirname } from "node:path"
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import { tmpdir } from "node:os"

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

console.log("\n=== Day 24: npm Package Structure ===\n")

// Test 1: package.json exists and is valid
console.log("  Test 1: package.json")
{
  const pkgPath = join(ROOT, "package.json")
  ok(existsSync(pkgPath), "package.json exists")

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
  equal(pkg.name, "opencode-vision-paste", "correct package name")
  equal(pkg.version, "0.2.0", "correct version")
  equal(pkg.main, "vision-paste.mjs", "correct main entry")
  equal(pkg.type, "module", "ESM type")
}

// Test 2: bin entry works
console.log("\n  Test 2: bin entry")
{
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"))
  ok(pkg.bin["opencode-vision-paste"], "bin entry exists")
  equal(pkg.bin["opencode-vision-paste"], "cli.mjs", "bin points to cli.mjs")
}

// Test 3: files array
console.log("\n  Test 3: files array")
{
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"))
  ok(pkg.files.includes("vision-paste.mjs"), "includes vision-paste.mjs")
  ok(pkg.files.includes("cli.mjs"), "includes cli.mjs")
  ok(pkg.files.includes("docker-compose.yml"), "includes docker-compose.yml")
  ok(pkg.files.includes("examples/"), "includes examples/")
}

// Test 4: engines
console.log("\n  Test 4: engines")
{
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"))
  ok(pkg.engines.node, "node engine specified")
  ok(pkg.engines.opencode, "opencode engine specified")
}

// Test 5: npm pack output
console.log("\n  Test 5: npm pack")
{
  const testDir = join(tmpdir(), `vp-npm-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })

  const { stdout } = await execAsync("npm pack --json", { cwd: ROOT })
  const packInfo = JSON.parse(stdout)
  ok(packInfo.length > 0, "npm pack produces tarball")
  ok(packInfo[0].name.includes("opencode-vision-paste"), "tarball has correct name")

  rmSync(testDir, { recursive: true, force: true })
}

// Test 6: node --check vision-paste.mjs
console.log("\n  Test 6: Syntax check vision-paste.mjs")
{
  const { stdout, stderr } = await execAsync("node --check vision-paste.mjs", { cwd: ROOT })
  ok(true, "vision-paste.mjs syntax valid")
}

// Test 7: node --check cli.mjs
console.log("\n  Test 7: Syntax check cli.mjs")
{
  const { stdout, stderr } = await execAsync("node --check cli.mjs", { cwd: ROOT })
  ok(true, "cli.mjs syntax valid")
}

// Test 8: npx opencode-vision-paste --help
console.log("\n  Test 8: CLI --help via npx")
{
  const { stdout } = await execAsync("node cli.mjs --help", { cwd: ROOT })
  includes(stdout, "init", "help shows init")
  includes(stdout, "doctor", "help shows doctor")
  includes(stdout, "config", "help shows config")
}

// Test 9: package.json keywords
console.log("\n  Test 9: Keywords")
{
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"))
  ok(pkg.keywords.includes("opencode"), "has opencode keyword")
  ok(pkg.keywords.includes("opencode-plugin"), "has opencode-plugin keyword")
  ok(pkg.keywords.includes("vision"), "has vision keyword")
}

// Test 10: license
console.log("\n  Test 10: License")
{
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"))
  equal(pkg.license, "MIT", "MIT license")

  const licensePath = join(ROOT, "LICENSE")
  ok(existsSync(licensePath), "LICENSE file exists")
}

const result = summary()
process.exit(result ? 0 : 1)
