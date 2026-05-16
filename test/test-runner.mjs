// test/test-runner.mjs — Main test runner
import { readdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))

const TEST_DIR = __dirname
const DAY_PATTERN = /^day\d{2}-.*\.mjs$/

async function runTests(filter = null) {
  const files = readdirSync(TEST_DIR)
    .filter(f => DAY_PATTERN.test(f))
    .filter(f => !filter || f.includes(filter))
    .sort()

  if (files.length === 0) {
    console.log("No test files found.")
    process.exit(1)
  }

  console.log(`\n  Running ${files.length} test file(s)...\n`)

  let totalPassed = 0
  let totalFailed = 0
  let totalFiles = 0
  let failedFiles = []

  for (const file of files) {
    const filePath = join(TEST_DIR, file)
    console.log(`\n  ── ${file} ──`)

    try {
      const { stdout, stderr } = await execAsync(`node "${filePath}"`, {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      })
      totalFiles++
      totalPassed++
    } catch (e) {
      totalFiles++
      totalFailed++
      failedFiles.push(file)
      console.log(`  ✗ ${file} failed: ${e.message.slice(0, 200)}`)
    }
  }

  console.log(`\n  ========================================`)
  console.log(`  Results: ${totalPassed}/${totalFiles} files passed, ${totalFailed} failed`)
  console.log(`  ========================================`)

  if (failedFiles.length > 0) {
    console.log(`\n  Failed files:`)
    for (const f of failedFiles) {
      console.log(`    - ${f}`)
    }
  }

  process.exit(totalFailed === 0 ? 0 : 1)
}

// Parse command line args
const args = process.argv.slice(2)
const filter = args.find(a => !a.startsWith("--"))

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  Usage: node test/test-runner.mjs [filter]

  Options:
    --help, -h    Show this help
    [filter]      Run only tests matching filter (e.g., "day01")

  Examples:
    node test/test-runner.mjs           # Run all tests
    node test/test-runner.mjs day01     # Run only day01 tests
    node test/test-runner.mjs cli       # Run all CLI tests
  `)
  process.exit(0)
}

runTests(filter)
