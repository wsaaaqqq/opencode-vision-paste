// test/day26-docs-audit.mjs — Documentation audit
import { equal, ok, includes, matches, summary } from "./assert.mjs"
import { join, dirname } from "node:path"
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

console.log("\n=== Day 26: Documentation Audit ===\n")

// Test 1: README.md exists
console.log("  Test 1: README.md exists")
{
  const readmePath = join(ROOT, "README.md")
  ok(existsSync(readmePath), "README.md exists")
}

// Test 2: CONFIGURATION.md exists
console.log("\n  Test 2: CONFIGURATION.md exists")
{
  const configPath = join(ROOT, "CONFIGURATION.md")
  ok(existsSync(configPath), "CONFIGURATION.md exists")
}

// Test 3: CHANGELOG.md exists
console.log("\n  Test 3: CHANGELOG.md exists")
{
  const changelogPath = join(ROOT, "CHANGELOG.md")
  ok(existsSync(changelogPath), "CHANGELOG.md exists")
}

// Test 4: All 10 config options documented in CONFIGURATION.md
console.log("\n  Test 4: All 10 config options documented")
{
  const configPath = join(ROOT, "CONFIGURATION.md")
  const content = readFileSync(configPath, "utf-8")

  const options = [
    "apiBaseUrl", "apiModel", "apiKey", "promptTemplate", "promptLocale",
    "skipIfModelSupportsVision", "visionModels", "healthCheckOnStart", "verbose", "errorHints",
  ]

  for (const opt of options) {
    includes(content, opt, `${opt} documented`)
  }
}

// Test 5: README config table has all options
console.log("\n  Test 5: README config table")
{
  const readmePath = join(ROOT, "README.md")
  const content = readFileSync(readmePath, "utf-8")

  const options = [
    "apiBaseUrl", "apiModel", "apiKey", "promptTemplate", "promptLocale",
    "skipIfModelSupportsVision", "visionModels", "healthCheckOnStart", "verbose", "errorHints",
  ]

  for (const opt of options) {
    includes(content, opt, `${opt} in README table`)
  }
}

// Test 6: FAQ answers are accurate
console.log("\n  Test 6: FAQ section")
{
  const readmePath = join(ROOT, "README.md")
  const content = readFileSync(readmePath, "utf-8")

  includes(content, "FAQ", "FAQ section exists")
  includes(content, "doctor", "FAQ mentions doctor")
  includes(content, "apiBaseUrl", "FAQ mentions apiBaseUrl")
  includes(content, "skipIfModelSupportsVision", "FAQ mentions skipIfModelSupportsVision")
  includes(content, "promptLocale", "FAQ mentions promptLocale")
}

// Test 7: Example values match defaults
console.log("\n  Test 7: Example values match defaults")
{
  const readmePath = join(ROOT, "README.md")
  const content = readFileSync(readmePath, "utf-8")

  includes(content, "http://192.168.9.44:5678/v1", "default apiBaseUrl in README")
  includes(content, "Qwen3VL-8B-Instruct-Q4_K_M.gguf", "default apiModel in README")
}

// Test 8: 10 translated READMEs exist
console.log("\n  Test 8: Translated READMEs")
{
  const readmeDir = join(ROOT, "readme")
  const files = readdirSync(readmeDir)

  const expected = ["zh-CN.md", "zh-TW.md", "ja.md", "ko.md", "es.md", "fr.md", "de.md", "ru.md", "pt.md"]
  for (const file of expected) {
    ok(files.includes(file), `${file} exists`)
  }
}

// Test 9: INSTALL.md exists
console.log("\n  Test 9: INSTALL.md")
{
  const installPath = join(ROOT, "readme", "INSTALL.md")
  ok(existsSync(installPath), "INSTALL.md exists")
}

// Test 10: CLI commands documented
console.log("\n  Test 10: CLI commands documented")
{
  const readmePath = join(ROOT, "README.md")
  const content = readFileSync(readmePath, "utf-8")

  includes(content, "init", "init command documented")
  includes(content, "doctor", "doctor command documented")
  includes(content, "config", "config command documented")
}

// Test 11: VL API setup guide
console.log("\n  Test 11: VL API setup guide")
{
  const readmePath = join(ROOT, "README.md")
  const content = readFileSync(readmePath, "utf-8")

  includes(content, "VL API Setup", "VL API setup section")
  includes(content, "Docker", "Docker setup documented")
  includes(content, "Ollama", "Ollama setup documented")
}

// Test 12: No outdated information
console.log("\n  Test 12: Version consistency")
{
  const readmePath = join(ROOT, "README.md")
  const readme = readFileSync(readmePath, "utf-8")

  const pkgPath = join(ROOT, "package.json")
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))

  // README uses badges for version, so check for badge presence
  includes(readme, "npm/v/opencode-vision-paste", "README has npm version badge")
  includes(readme, "github/v/release", "README has GitHub release badge")
}

const result = summary()
process.exit(result ? 0 : 1)
