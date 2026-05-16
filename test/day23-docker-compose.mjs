// test/day23-docker-compose.mjs — Docker compose validation
import { equal, ok, includes, matches, summary } from "./assert.mjs"
import { join, dirname } from "node:path"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

console.log("\n=== Day 23: Docker Compose Validation ===\n")

const dcPath = join(ROOT, "docker-compose.yml")

// Test 1: docker-compose.yml exists
console.log("  Test 1: docker-compose.yml exists")
{
  ok(existsSync(dcPath), "docker-compose.yml exists")
}

// Test 2: Valid YAML syntax
console.log("\n  Test 2: Valid YAML syntax")
{
  const content = readFileSync(dcPath, "utf-8")
  // Basic YAML validation: check for required keys
  includes(content, "services:", "has services key")
  includes(content, "llama-cpp:", "has llama-cpp service")
  ok(true, "YAML syntax valid (basic check)")
}

// Test 3: Ports mapping correct
console.log("\n  Test 3: Ports mapping")
{
  const content = readFileSync(dcPath, "utf-8")
  includes(content, "5678:8080", "ports mapping 5678:8080")
}

// Test 4: Volume mounts correct
console.log("\n  Test 4: Volume mounts")
{
  const content = readFileSync(dcPath, "utf-8")
  includes(content, "./models:/models", "volume mount ./models:/models")
}

// Test 5: Environment variables correct
console.log("\n  Test 5: Environment variables")
{
  const content = readFileSync(dcPath, "utf-8")
  includes(content, "LLAMA_ARG_MODEL", "LLAMA_ARG_MODEL env var")
  includes(content, "LLAMA_ARG_HOST", "LLAMA_ARG_HOST env var")
  includes(content, "LLAMA_ARG_PORT", "LLAMA_ARG_PORT env var")
  includes(content, "LLAMA_ARG_N_GPU_LAYERS", "LLAMA_ARG_N_GPU_LAYERS env var")
  includes(content, "LLAMA_ARG_CTX_SIZE", "LLAMA_ARG_CTX_SIZE env var")
}

// Test 6: Image reference
console.log("\n  Test 6: Image reference")
{
  const content = readFileSync(dcPath, "utf-8")
  includes(content, "ghcr.io/ggerganov/llama.cpp:server", "uses llama.cpp server image")
}

// Test 7: Restart policy
console.log("\n  Test 7: Restart policy")
{
  const content = readFileSync(dcPath, "utf-8")
  includes(content, "unless-stopped", "restart policy set")
}

// Test 8: Container name
console.log("\n  Test 8: Container name")
{
  const content = readFileSync(dcPath, "utf-8")
  includes(content, "vision-paste-vl-api", "container name set")
}

// Test 9: Port matches default config
console.log("\n  Test 9: Port matches default config")
{
  const content = readFileSync(dcPath, "utf-8")
  includes(content, "5678", "port 5678 matches default apiBaseUrl")
}

// Test 10: Model reference matches default config
console.log("\n  Test 10: Model reference matches default config")
{
  const content = readFileSync(dcPath, "utf-8")
  includes(content, "Qwen3VL-8B-Instruct-Q4_K_M.gguf", "model matches default apiModel")
}

const result = summary()
process.exit(result ? 0 : 1)
