#!/usr/bin/env node

import { Command } from "commander"
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { readFile, writeFile, mkdir, access } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { homedir } from "node:os"

const CONFIG_FILE = "vision-paste.config.jsonc"

const PROMPT_LOCALES = {
  en: "Describe this image in detail. {userText}",
  zh: "请用中文详细描述这张图片的内容。{userText}",
  ja: "この画像の内容を詳しく説明してください。{userText}",
  ko: "이 이미지의 내용을 자세히 설명해 주세요. {userText}",
  es: "Describe esta imagen en detalle. {userText}",
  fr: "Décris cette image en détail. {userText}",
  de: "Beschreibe dieses Bild im Detail. {userText}",
  ru: "Подробно опиши это изображение. {userText}",
  pt: "Descreva esta imagem em detalhes. {userText}",
}

const DEFAULT_CONFIG = {
  apiBaseUrl: "http://192.168.9.44:5678/v1",
  apiModel: "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
  apiKey: "",
  promptTemplate: "",
  promptLocale: "zh",
  skipIfModelSupportsVision: true,
  visionModels: [],
  healthCheckOnStart: true,
  verbose: false,
  errorHints: true,
}

function projectConfigPath() {
  return join(process.cwd(), ".opencode", CONFIG_FILE)
}

function userConfigPath() {
  return join(homedir(), ".config", "opencode", CONFIG_FILE)
}

function opencodeJsonPath() {
  return join(process.cwd(), ".opencode", "opencode.jsonc")
}

const VL_BACKENDS = [
  { label: "Ollama", url: "http://localhost:11434/v1", models: ["llava", "minicpm-v", "qwen2.5-vl"] },
  { label: "llama.cpp", url: "http://localhost:8080/v1", models: ["Qwen3VL-8B-Instruct-Q4_K_M.gguf"] },
  { label: "vLLM", url: "http://localhost:8000/v1", models: ["Qwen2-VL-7B-Instruct"] },
  { label: "LM Studio", url: "http://localhost:1234/v1", models: ["llava-v1.6"] },
]

async function detectVLBackends() {
  const found = []
  for (const be of VL_BACKENDS) {
    try {
      const res = await fetch(be.url.replace(/\/+$/, "") + "/models", {
        signal: AbortSignal.timeout(2000),
      })
      if (res.ok) {
        const data = await res.json()
        const entries = data.data || data.models || data || []
        const models = Array.isArray(entries)
          ? entries.map(m => typeof m === "string" ? m : m.id || m.name).filter(Boolean)
          : []
        found.push({ ...be, models })
      }
    } catch {}
  }
  return found
}

async function prompt(q, defaultVal = "") {
  const rl = createInterface({ input: stdin, output: stdout })
  const suffix = defaultVal ? ` [${defaultVal}]` : ""
  const answer = await rl.question(`? ${q}${suffix}: `)
  rl.close()
  return answer.trim() || defaultVal
}

async function promptYesNo(q, defaultYes = true) {
  const yes = defaultYes ? "Y" : "y"
  const no = defaultYes ? "n" : "N"
  const ans = await prompt(`${q} (${yes}/${no})`)
  return ans === "" ? defaultYes : ans.toLowerCase().startsWith("y")
}

function formatJsonc(obj) {
  let out = "{\n"
  const entries = Object.entries(obj)
  entries.forEach(([key, val], i) => {
    const comma = i < entries.length - 1 ? "," : ""
    if (typeof val === "boolean" || typeof val === "number") {
      out += `  "${key}": ${val}${comma}\n`
    } else if (Array.isArray(val)) {
      out += `  "${key}": [${val.map(v => `"${v}"`).join(", ")}]${comma}\n`
    } else {
      out += `  "${key}": "${val}"${comma}\n`
    }
  })
  out += "}"
  return out
}

async function resolveConfig() {
  const paths = [
    { path: projectConfigPath(), label: "project-level (.opencode/)" },
    { path: userConfigPath(), label: "user-level (~/.config/opencode/)" },
  ]

  for (const { path, label } of paths) {
    try {
      const raw = await readFile(path, "utf-8")
      const json = stripJsoncComments(raw)
      return { config: { ...DEFAULT_CONFIG, ...JSON.parse(json) }, source: label, path }
    } catch {
      continue
    }
  }

  return { config: { ...DEFAULT_CONFIG }, source: "built-in defaults", path: null }
}

function stripJsoncComments(text) {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, "")
  const lines = out.split("\n")
  out = ""
  for (const line of lines) {
    let inString = false, escaped = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (escaped) { out += ch; escaped = false; continue }
      if (ch === "\\") { out += ch; escaped = true; continue }
      if (ch === '"') { inString = !inString; out += ch; continue }
      if (!inString && ch === "/" && line[i + 1] === "/") break
      out += ch
    }
    out += "\n"
  }
  return out.trim()
}

function printConfig(cfg) {
  console.log(formatJsonc(cfg))
}

function printLangOptions() {
  console.log("\n  Available prompt languages:")
  for (const [key, tmpl] of Object.entries(PROMPT_LOCALES)) {
    console.log(`    ${key.padEnd(6)} ${tmpl.slice(0, 60)}...`)
  }
}

const program = new Command()

program
  .name("opencode-vision-paste")
  .description("OpenCode vision paste plugin CLI")
  .version("0.3.0")

program
  .command("init")
  .description("Interactive setup wizard")
  .option("--yes", "Skip prompts and use defaults")
  .option("--docker", "Generate docker-compose.yml alongside config")
  .option("--project", "Force project-level config")
  .option("--global", "Force user-level config")
  .action(async (opts) => {
    console.log("\n  opencode-vision-paste setup wizard\n")

    const cfg = { ...DEFAULT_CONFIG }

    // Auto-detect running VL backends
    if (!opts.yes) {
      const detected = await detectVLBackends()
      if (detected.length > 0) {
        console.log("  Detected VL backends:\n")
        detected.forEach((be, i) => {
          const models = be.models.slice(0, 5).join(", ")
          console.log(`    ${i + 1}. ${be.label.padEnd(12)} ${be.url} (${models})`)
        })
        const use = await prompt("\n  Use detected backend? (enter number, or skip)", "")
        const idx = parseInt(use) - 1
        if (detected[idx]) {
          cfg.apiBaseUrl = detected[idx].url
          if (detected[idx].models.length > 0) {
            cfg.apiModel = detected[idx].models[0]
          }
          console.log(`  ✓ Using ${detected[idx].label}: ${cfg.apiBaseUrl} → ${cfg.apiModel}\n`)
          // Skip manual Steps 1-2 since we auto-filled
          opts._detected = true
        }
      }
    }

    if (!opts.yes && !opts._detected) {
      // Step 1: VL API endpoint
      console.log("  Step 1: VL API endpoint")
      cfg.apiBaseUrl = await prompt("VL API URL", cfg.apiBaseUrl)

      // Step 2: Model
      console.log("\n  Step 2: Vision model")
      cfg.apiModel = await prompt("Model name", cfg.apiModel)
    }

    if (!opts.yes) {
      // Step 3: API key
      console.log("\n  Step 3: API key (leave blank if not required)")
      const key = await prompt("API key", "")
      if (key) cfg.apiKey = key

      // Step 4: Prompt language
      printLangOptions()
      const locale = await prompt("\n  Step 4: Prompt language", "zh")
      if (PROMPT_LOCALES[locale]) {
        cfg.promptLocale = locale
      }

      // Step 5: Smart skip
      console.log("\n  Step 5: Smart skip mode")
      cfg.skipIfModelSupportsVision = await promptYesNo(
        "Skip interception when chat model natively supports images?",
        true
      )

      // Step 6: Config location
      const isGlobal = opts.global || await promptYesNo("\n  Step 6: Save as global config?", false)
      const configPath = isGlobal ? userConfigPath() : projectConfigPath()

      console.log(`\n  → Config will be saved to: ${configPath}`)
      const proceed = await promptYesNo("Proceed?", true)
      if (!proceed) { console.log("  Cancelled.\n"); return }

      const dir = dirname(configPath)
      if (!existsSync(dir)) await mkdir(dir, { recursive: true })
      await writeFile(configPath, formatJsonc(cfg) + "\n")
      console.log("  ✓ Config saved")
    } else {
      const configPath = opts.global ? userConfigPath() : projectConfigPath()
      const dir = dirname(configPath)
      if (!existsSync(dir)) await mkdir(dir, { recursive: true })
      await writeFile(configPath, formatJsonc(cfg) + "\n")
      console.log(`  ✓ Config saved to ${configPath}`)
    }

    // Auto-register plugin in opencode.json
    const ojPath = opencodeJsonPath()
    try {
      if (existsSync(ojPath)) {
        const raw = await readFile(ojPath, "utf-8")
        const stripped = raw
          .replace(/\/\/.*$/gm, "")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .trim()
        const oj = JSON.parse(stripped)
        if (!oj.plugin) oj.plugin = []
        if (!oj.plugin.includes("opencode-vision-paste")) {
          const add = opts.yes || await promptYesNo("\n  Add plugin to opencode.jsonc?", true)
          if (add) {
            // Rewrite the file, preserving comments is too complex so we reconstruct
            oj.plugin.push("opencode-vision-paste")
            await writeFile(ojPath, JSON.stringify(oj, null, 2) + "\n")
            console.log("  ✓ opencode-vision-paste added to opencode.jsonc")
          }
        } else {
          console.log("  ℹ Plugin already in opencode.jsonc")
        }
      }
    } catch {
      console.log("  ! Could not auto-register plugin. Add manually:\n")
      console.log('    { "plugin": ["opencode-vision-paste"] }\n')
    }

    console.log("\n  Setup complete. Restart OpenCode and paste an image to test.\n")

    // Docker compose
    if (opts.docker) {
      const dcPath = join(process.cwd(), "docker-compose.yml")
      console.log("  → Generates docker-compose.yml for VL API...")
      process.exit(0) // placeholder for Day 7
    }
  })

program
  .command("config")
  .description("Print current effective configuration")
  .action(async () => {
    const { config, source } = await resolveConfig()
    console.log(`\n  Source: ${source}\n`)
    printConfig(config)
    console.log()
  })

program
  .command("doctor")
  .description("Diagnose plugin setup")
  .option("--json", "Output as JSON")
  .option("--verbose", "Detailed diagnostics")
  .action(async (opts) => {
    console.log("\n  Doctor: checking your setup...\n")

    const results = []

    // Check 1: System
    const nodeVer = process.version
    results.push({ name: "system", status: "pass", message: `Node.js ${nodeVer} detected` })

    // Check 2: Config
    const { config, source, path } = await resolveConfig()
    const configStatus = source !== "built-in defaults" ? "pass" : "warn"
    results.push({
      name: "config",
      status: configStatus,
      message: configStatus === "pass"
        ? `Config loaded from ${source}`
        : "No config file found, using defaults"
    })

    // Check 3: Plugin registration
    const ojPath = opencodeJsonPath()
    let pluginRegistered = false
    try {
      if (existsSync(ojPath)) {
        const raw = await readFile(ojPath, "utf-8")
        const stripped = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim()
        const oj = JSON.parse(stripped)
        pluginRegistered = (oj.plugin || []).includes("opencode-vision-paste")
      }
    } catch {}
    results.push({
      name: "plugin",
      status: pluginRegistered ? "pass" : "warn",
      message: pluginRegistered
        ? "Plugin registered in opencode.jsonc"
        : "Plugin not found in opencode.jsonc — add 'opencode-vision-paste' to plugin array"
    })

    // Check 4: VL API connectivity
    try {
      const url = config.apiBaseUrl.replace(/\/+$/, "") + "/models"
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = await res.json()
        const models = data.data || data.models || data || []
        const modelIds = Array.isArray(models) ? models.map(m => m.id || m.name || m).filter(Boolean) : []
        const found = modelIds.some(m => m === config.apiModel || m.includes(config.apiModel))
        results.push({
          name: "api",
          status: found ? "pass" : "warn",
          message: found
            ? `VL API reachable — model "${config.apiModel}" found`
            : `VL API reachable but model "${config.apiModel}" not in model list: [${modelIds.slice(0, 5).join(", ")}]`
        })
      } else {
        results.push({ name: "api", status: "fail", message: `VL API returned ${res.status}` })
      }
    } catch (e) {
      const hint = e.cause?.code || e.code || ""
      results.push({
        name: "api",
        status: "fail",
        message: `VL API unreachable: ${e.message} (${hint})`
      })
    }

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2))
    } else {
      for (const r of results) {
        const icon = r.status === "pass" ? "✓" : r.status === "warn" ? "△" : "✗"
        const label = icon + " " + r.name.padEnd(10)
        console.log(`  ${label} ${r.message}`)
      }
    }
    console.log()
  })

program.parse()
