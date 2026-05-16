// test/day22-example-configs.mjs — Example configs validation
import { equal, ok, includes, summary } from "./assert.mjs"
import { join, dirname } from "node:path"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const EXAMPLES = join(ROOT, "examples")

console.log("\n=== Day 22: Example Configs Validation ===\n")

// Test 1: ollama.jsonc exists and is valid
console.log("  Test 1: ollama.jsonc")
{
  const path = join(EXAMPLES, "ollama.jsonc")
  ok(existsSync(path), "ollama.jsonc exists")

  const raw = readFileSync(path, "utf-8")
  const stripped = raw.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim()
  let config
  try {
    config = JSON.parse(stripped)
    ok(true, "valid JSON")
  } catch (e) {
    ok(false, `valid JSON: ${e.message}`)
  }

  ok(config.apiBaseUrl, "has apiBaseUrl")
  ok(config.apiBaseUrl.includes("11434"), "uses Ollama port")
  ok(config.apiModel, "has apiModel")
}

// Test 2: llama-cpp.jsonc exists and is valid
console.log("\n  Test 2: llama-cpp.jsonc")
{
  const path = join(EXAMPLES, "llama-cpp.jsonc")
  ok(existsSync(path), "llama-cpp.jsonc exists")

  const raw = readFileSync(path, "utf-8")
  const stripped = raw.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim()
  let config
  try {
    config = JSON.parse(stripped)
    ok(true, "valid JSON")
  } catch (e) {
    ok(false, `valid JSON: ${e.message}`)
  }

  ok(config.apiBaseUrl, "has apiBaseUrl")
  ok(config.apiBaseUrl.includes("8080") || config.apiBaseUrl.includes("5678"), "uses llama.cpp port")
  ok(config.apiModel, "has apiModel")
}

// Test 3: vllm.jsonc exists and is valid
console.log("\n  Test 3: vllm.jsonc")
{
  const path = join(EXAMPLES, "vllm.jsonc")
  ok(existsSync(path), "vllm.jsonc exists")

  const raw = readFileSync(path, "utf-8")
  const stripped = raw.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim()
  let config
  try {
    config = JSON.parse(stripped)
    ok(true, "valid JSON")
  } catch (e) {
    ok(false, `valid JSON: ${e.message}`)
  }

  ok(config.apiBaseUrl, "has apiBaseUrl")
  ok(config.apiBaseUrl.includes("8000"), "uses vLLM port")
  ok(config.apiModel, "has apiModel")
}

// Test 4: All example configs have required fields
console.log("\n  Test 4: All example configs have required fields")
{
  const files = ["ollama.jsonc", "llama-cpp.jsonc", "vllm.jsonc"]
  const requiredFields = ["apiBaseUrl", "apiModel"]

  for (const file of files) {
    const path = join(EXAMPLES, file)
    const raw = readFileSync(path, "utf-8")
    const stripped = raw.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim()
    const config = JSON.parse(stripped)

    for (const field of requiredFields) {
      ok(config[field] !== undefined, `${file} has ${field}`)
    }
  }
}

// Test 5: Example configs match CONFIGURATION.md documentation
console.log("\n  Test 5: Example configs match documentation")
{
  const configPath = join(ROOT, "CONFIGURATION.md")
  const configDoc = readFileSync(configPath, "utf-8")

  const files = ["ollama.jsonc", "llama-cpp.jsonc", "vllm.jsonc"]
  for (const file of files) {
    const path = join(EXAMPLES, file)
    const raw = readFileSync(path, "utf-8")
    const stripped = raw.replace(/\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim()
    const config = JSON.parse(stripped)

    // Check core fields are documented
    for (const key of ["apiBaseUrl", "apiModel", "apiKey"]) {
      if (config[key] !== undefined) {
        includes(configDoc, key, `${file} field "${key}" documented`)
      }
    }
  }
}

const result = summary()
process.exit(result ? 0 : 1)
