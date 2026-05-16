// test/day30-release.mjs — Release + final sign-off
import { equal, ok, includes, summary } from "./assert.mjs"
import { join, dirname } from "node:path"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

console.log("\n=== Day 30: Release + Final Sign-Off ===\n")

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

// Final sign-off checklist
console.log("\n  Final sign-off checklist:")

test("package.json exists and is valid", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"))
  if (!pkg.name) throw new Error("no name")
  if (!pkg.version) throw new Error("no version")
})

test("vision-paste.mjs exists", () => {
  if (!existsSync(join(ROOT, "vision-paste.mjs"))) throw new Error("missing")
})

test("cli.mjs exists", () => {
  if (!existsSync(join(ROOT, "cli.mjs"))) throw new Error("missing")
})

test("docker-compose.yml exists", () => {
  if (!existsSync(join(ROOT, "docker-compose.yml"))) throw new Error("missing")
})

test("examples/ directory exists", () => {
  if (!existsSync(join(ROOT, "examples"))) throw new Error("missing")
})

test("README.md exists", () => {
  if (!existsSync(join(ROOT, "README.md"))) throw new Error("missing")
})

test("CONFIGURATION.md exists", () => {
  if (!existsSync(join(ROOT, "CONFIGURATION.md"))) throw new Error("missing")
})

test("CHANGELOG.md exists", () => {
  if (!existsSync(join(ROOT, "CHANGELOG.md"))) throw new Error("missing")
})

test("LICENSE exists", () => {
  if (!existsSync(join(ROOT, "LICENSE"))) throw new Error("missing")
})

test("test/ directory exists", () => {
  if (!existsSync(join(ROOT, "test"))) throw new Error("missing")
})

test("All 30 test files exist", () => {
  const expected = [
    "day01-harness.mjs", "day02-core-interception.mjs", "day03-http-multi-dedup.mjs",
    "day04-smart-skip.mjs", "day05-config-loading.mjs", "day06-prompt-resolution.mjs",
    "day07-temp-logging.mjs", "day08-error-classification.mjs", "day09-error-display.mjs",
    "day10-health-check.mjs", "day11-file-edge-cases.mjs", "day12-network-edge-cases.mjs",
    "day13-logging-audit.mjs", "day14-regression.mjs", "day15-cli-init-interactive.mjs",
    "day16-cli-init-advanced.mjs", "day17-cli-doctor.mjs", "day18-cli-config.mjs",
    "day19-e2e-pipeline.mjs", "day20-multi-image-e2e.mjs", "day21-real-world.mjs",
    "day22-example-configs.mjs", "day23-docker-compose.mjs", "day24-npm-package.mjs",
    "day25-ci-cd.mjs", "day26-docs-audit.mjs", "day27-regression.mjs",
    "day28-bugfixes.mjs", "day29-release-prep.mjs", "day30-release.mjs",
  ]
  for (const file of expected) {
    if (!existsSync(join(ROOT, "test", file))) throw new Error(`missing ${file}`)
  }
})

await testAsync("Syntax check passes", async () => {
  await execAsync("node --check vision-paste.mjs", { cwd: ROOT })
  await execAsync("node --check cli.mjs", { cwd: ROOT })
})

await testAsync("npm pack succeeds", async () => {
  await execAsync("npm pack --dry-run", { cwd: ROOT })
})

await testAsync("npm publish --dry-run succeeds", async () => {
  await execAsync("npm publish --dry-run", { cwd: ROOT })
})

test("10 translated READMEs exist", () => {
  const expected = ["zh-CN.md", "zh-TW.md", "ja.md", "ko.md", "es.md", "fr.md", "de.md", "ru.md", "pt.md"]
  for (const file of expected) {
    if (!existsSync(join(ROOT, "readme", file))) throw new Error(`missing ${file}`)
  }
})

test("INSTALL.md exists", () => {
  if (!existsSync(join(ROOT, "readme", "INSTALL.md"))) throw new Error("missing")
})

test("CI workflow exists", () => {
  if (!existsSync(join(ROOT, ".github", "workflows", "ci.yml"))) throw new Error("missing")
})

test("Release workflow exists", () => {
  if (!existsSync(join(ROOT, ".github", "workflows", "release.yml"))) throw new Error("missing")
})

test("AGENTS.md exists", () => {
  if (!existsSync(join(ROOT, "AGENTS.md"))) throw new Error("missing")
})

test("CONTRIBUTING.md exists", () => {
  if (!existsSync(join(ROOT, "CONTRIBUTING.md"))) throw new Error("missing")
})

console.log(`\n  ========================================`)
console.log(`  Final sign-off: ${passedTests}/${totalTests} checks passed`)
console.log(`  ========================================`)

if (passedTests === totalTests) {
  console.log(`\n  ✓ All checks passed! Ready for v0.3.0 release.`)
  console.log(`\n  Next steps:`)
  console.log(`    1. git add -A`)
  console.log(`    2. git commit -m "chore: v0.3.0 release - comprehensive testing"`)
  console.log(`    3. git tag v0.3.0`)
  console.log(`    4. git push origin main --tags`)
  console.log(`    5. Verify npm publish and GitHub Release`)
} else {
  console.log(`\n  ✗ ${totalTests - passedTests} checks failed. Fix before release.`)
}

process.exit(passedTests === totalTests ? 0 : 1)
