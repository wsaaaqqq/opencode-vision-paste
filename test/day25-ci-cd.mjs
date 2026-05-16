// test/day25-ci-cd.mjs — CI/CD workflow validation
import { equal, ok, includes, matches, summary } from "./assert.mjs"
import { join, dirname } from "node:path"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

console.log("\n=== Day 25: CI/CD Workflow Validation ===\n")

const workflowsDir = join(ROOT, ".github", "workflows")

// Test 1: ci.yml exists
console.log("  Test 1: ci.yml exists")
{
  const ciPath = join(workflowsDir, "ci.yml")
  ok(existsSync(ciPath), "ci.yml exists")
}

// Test 2: release.yml exists
console.log("\n  Test 2: release.yml exists")
{
  const releasePath = join(workflowsDir, "release.yml")
  ok(existsSync(releasePath), "release.yml exists")
}

// Test 3: CI triggers on push/PR
console.log("\n  Test 3: CI triggers")
{
  const ciPath = join(workflowsDir, "ci.yml")
  const content = readFileSync(ciPath, "utf-8")
  includes(content, "push", "CI triggers on push")
  includes(content, "pull_request", "CI triggers on pull_request")
}

// Test 4: CI runs syntax check
console.log("\n  Test 4: CI runs syntax check")
{
  const ciPath = join(workflowsDir, "ci.yml")
  const content = readFileSync(ciPath, "utf-8")
  includes(content, "node --check", "CI runs syntax check")
}

// Test 5: CI runs npm pack
console.log("\n  Test 5: CI runs npm pack")
{
  const ciPath = join(workflowsDir, "ci.yml")
  const content = readFileSync(ciPath, "utf-8")
  includes(content, "npm pack", "CI runs npm pack")
}

// Test 6: Release triggers on tag v*
console.log("\n  Test 6: Release triggers on tag")
{
  const releasePath = join(workflowsDir, "release.yml")
  const content = readFileSync(releasePath, "utf-8")
  includes(content, "push", "release triggers on push")
  includes(content, "tags", "release triggers on tags")
}

// Test 7: Release runs npm publish
console.log("\n  Test 7: Release runs npm publish")
{
  const releasePath = join(workflowsDir, "release.yml")
  const content = readFileSync(releasePath, "utf-8")
  includes(content, "npm publish", "release runs npm publish")
}

// Test 8: Release runs GitHub Release
console.log("\n  Test 8: Release runs GitHub Release")
{
  const releasePath = join(workflowsDir, "release.yml")
  const content = readFileSync(releasePath, "utf-8")
  includes(content, "release", "release creates GitHub Release")
}

// Test 9: NPM_TOKEN secret referenced
console.log("\n  Test 9: NPM_TOKEN secret")
{
  const releasePath = join(workflowsDir, "release.yml")
  const content = readFileSync(releasePath, "utf-8")
  includes(content, "NPM_TOKEN", "NPM_TOKEN secret referenced")
}

// Test 10: GH_TOKEN / GITHUB_TOKEN referenced
console.log("\n  Test 10: GitHub token")
{
  const releasePath = join(workflowsDir, "release.yml")
  const content = readFileSync(releasePath, "utf-8")
  ok(content.includes("GITHUB_TOKEN") || content.includes("GH_TOKEN"), "GitHub token referenced")
}

// Test 11: npm publish --dry-run succeeds
console.log("\n  Test 11: npm publish --dry-run")
{
  const { stdout } = await execAsync("npm publish --dry-run", { cwd: ROOT })
  includes(stdout, "opencode-vision-paste", "dry-run shows package name")
}

// Test 12: CI workflow uses Node.js
console.log("\n  Test 12: CI uses Node.js")
{
  const ciPath = join(workflowsDir, "ci.yml")
  const content = readFileSync(ciPath, "utf-8")
  includes(content, "node", "CI uses Node.js")
  includes(content, "actions/checkout", "CI checks out code")
  includes(content, "actions/setup-node", "CI sets up Node.js")
}

const result = summary()
process.exit(result ? 0 : 1)
