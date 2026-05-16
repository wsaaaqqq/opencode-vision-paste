import { mkdir, writeFile, readFile, readdir, stat, unlink, appendFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir, homedir } from "node:os"
import { randomUUID } from "node:crypto"

const LOG = join(tmpdir(), "vision-paste", "debug.log")
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")}`
  appendFile(LOG, line + "\n").catch(() => {})
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

const TEMP_DIR = join(tmpdir(), "vision-paste")
const MIME_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/bmp": "bmp" }
const EXT_TO_MIME = Object.fromEntries(Object.entries(MIME_EXT).map(([m, e]) => [e, m]))
let currentModel = null
let healthChecked = false
let apiUnreachable = false
let healthWarnInjected = false
const TIMEOUT_MS = 60_000
const MAX_AGE_MS = 24 * 60 * 60 * 1000
function projectConfigPath(directory) {
  return join(directory, ".opencode", "vision-paste.config.jsonc")
}

function userConfigPath() {
  return join(homedir(), ".config", "opencode", "vision-paste.config.jsonc")
}

async function loadConfig(directory) {
  const paths = [
    { path: projectConfigPath(directory) },
    { path: userConfigPath() },
  ]

  for (const { path } of paths) {
    try {
      if (!existsSync(path)) continue
      const raw = await readFile(path, "utf-8")
      const stripped = stripJsoncComments(raw)
      const parsed = JSON.parse(stripped)
      return { ...DEFAULT_CONFIG, ...parsed }
    } catch {
      continue
    }
  }

  return { ...DEFAULT_CONFIG }
}

function resolvePrompt(cfg) {
  if (cfg.promptTemplate) return cfg.promptTemplate
  return PROMPT_LOCALES[cfg.promptLocale] || PROMPT_LOCALES.zh
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

async function cleanOldTempFiles() {
  const t0 = performance.now()
  try {
    if (!existsSync(TEMP_DIR)) { log("CLEAN", { ms: (performance.now() - t0).toFixed(1), files: 0, skipped: "dir missing" }); return }
    const files = await readdir(TEMP_DIR)
    const now = Date.now()
    let cleaned = 0
    for (const file of files) {
      const fp = join(TEMP_DIR, file)
      const s = await stat(fp).catch(() => null)
      if (s && now - s.mtimeMs > MAX_AGE_MS) { await unlink(fp).catch(() => {}); cleaned++ }
    }
    log("CLEAN", { ms: (performance.now() - t0).toFixed(1), total: files.length, cleaned })
  } catch { log("CLEAN", { ms: (performance.now() - t0).toFixed(1), error: true }) }
}

async function callVisionAPI(imagePath, userText, cfg) {
  const t0 = performance.now()

  const s = await stat(imagePath).catch(() => null)
  if (!s || s.size === 0) throw new Error("image file is empty or missing")
  log("API.stat", { ms: (performance.now() - t0).toFixed(1), sizeKB: (s.size / 1024).toFixed(1) })

  const data = await readFile(imagePath)
  log("API.readFile", { ms: (performance.now() - t0).toFixed(1) })

  const ext = imagePath.split(".").pop()?.toLowerCase()
  const mime = EXT_TO_MIME[ext] ?? "image/jpeg"
  const b64 = data.toString("base64")
  const dataUrl = `data:${mime};base64,${b64}`
  log("API.encode", { ms: (performance.now() - t0).toFixed(1), b64len: b64.length })

  const userTextSuffix = userText ? `\n\n此外，用户还问了以下问题，请根据图片内容直接回答：${userText}` : ""
  const promptText = resolvePrompt(cfg).replace("{userText}", userTextSuffix)

  const body = {
    model: cfg.apiModel,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  }

  const headers = { "Content-Type": "application/json" }
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`

  const tFetch = performance.now()
  const res = await fetch(`${cfg.apiBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  log("API.fetch", { ms: (performance.now() - tFetch).toFixed(1), status: res.status })

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown error")
    throw new Error(`vision API ${res.status}: ${err}`)
  }

  const tParse = performance.now()
  const data2 = await res.json()
  log("API.parse", { ms: (performance.now() - tParse).toFixed(1) })

  const result = data2.choices?.[0]?.message?.content ?? "(no response)"
  log("API.done", { totalMs: (performance.now() - t0).toFixed(1) })
  return result
}

function classifyError(e, cfg) {
  const code = e.cause?.code || e.code || ""
  const name = e.name || ""
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") return {
    cause: `VL API at ${cfg.apiBaseUrl} is not reachable`,
    fix: "Make sure your VL API server is running. Try: npx opencode-vision-paste doctor"
  }
  if (code === "ETIMEDOUT" || name === "AbortError" || name === "TimeoutError") return {
    cause: `VL API timed out after ${60}s`,
    fix: "Check network latency or increase timeout. Verify apiBaseUrl is correct."
  }
  const msg = e.message || ""
  const status = e.status || (msg.match(/vision API (\d+)/) ? parseInt(msg.match(/vision API (\d+)/)[1]) : null)
  if (status === 401 || status === 403) return {
    cause: `VL API returned ${status} (unauthorized)`,
    fix: "Check apiKey in vision-paste.config.jsonc. Run: npx opencode-vision-paste config"
  }
  if (status === 404) return {
    cause: `VL API returned 404 — endpoint not found at ${cfg.apiBaseUrl}`,
    fix: "The URL should end with /v1 for OpenAI-compatible APIs. Check apiBaseUrl in config."
  }
  if (status === 400 || msg.includes("model")) return {
    cause: `VL API error: ${msg}`,
    fix: `Verify apiModel "${cfg.apiModel}" is loaded on the server. Run: npx opencode-vision-paste doctor`
  }
  return { cause: e.message || "Unknown error", fix: "Run `npx opencode-vision-paste doctor` to diagnose" }
}

export default async function (input) {
  const cfg = await loadConfig(input.directory)
  await cleanOldTempFiles()
  log("INIT", { dir: input.directory, api: cfg.apiBaseUrl, model: cfg.apiModel })

  return {
    async event({ event }) {
      if (!cfg.healthCheckOnStart || event.type !== "session.created") return
      if (healthChecked) return
      healthChecked = true
      try {
        const url = cfg.apiBaseUrl.replace(/\/+$/, "") + "/models"
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        if (!res.ok) { apiUnreachable = true; log("HEALTH", { status: res.status }) }
        else log("HEALTH", { status: "ok" })
      } catch (e) {
        apiUnreachable = true
        log("HEALTH", { error: e.message })
      }
    },
    "experimental.chat.system.transform": async (input) => {
      currentModel = input.model
      log("MODEL", { id: currentModel?.id, providerID: currentModel?.providerID, imageCapability: currentModel?.capabilities?.input?.image })
    },
    "experimental.chat.messages.transform": async (_in, output) => {
      const tHook = performance.now()
      const msgs = output.messages
      log("HOOK", { msgCount: msgs.length })

      // Skip if current model natively supports image input
      if (cfg.skipIfModelSupportsVision && currentModel) {
        const modelId = (currentModel.id || "").toLowerCase()
        if (
          currentModel.capabilities?.input?.image ||
          cfg.visionModels.some(p => modelId.includes(p.toLowerCase()))
        ) {
          log("SKIP", { model: currentModel.id, reason: "model supports vision natively" })
          return
        }
      }

      // Health check warning — inject once if VL API was unreachable at startup
      if (cfg.healthCheckOnStart && apiUnreachable && !healthWarnInjected) {
        healthWarnInjected = true
        const lastUser = msgs.filter(m => m.info?.role === "user").pop()
        if (lastUser) {
          const parts = [...lastUser.parts]
          parts.push({ type: "text", text: `\n[opencode-vision-paste] VL API (${cfg.apiBaseUrl}) is unreachable. Images will not be analyzed. Run \`npx opencode-vision-paste doctor\` to diagnose.` })
          const idx = msgs.indexOf(lastUser)
          msgs[idx] = { ...lastUser, parts }
        }
      }

      const userMessages = []
      for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].info?.role === "user") userMessages.push({ msg: msgs[i], idx: i })
      }
      if (userMessages.length === 0) { log("HOOK exit: no user msg"); return }

      const last = userMessages[userMessages.length - 1]
      const userMsg = last.msg

      if (!userMsg.parts || userMsg.parts.length === 0) { log("HOOK exit: no parts"); return }

      log("USER_MSG", { role: userMsg.info?.role, partsCount: userMsg.parts.length })
      for (let i = 0; i < userMsg.parts.length; i++) {
        const p = userMsg.parts[i]
        log("PART", { i, type: p.type, mime: p.mime, url: (p.url||"").slice(0,50) })
      }

      const images = userMsg.parts.filter(isImageFile)
      log("IMAGES", { count: images.length })
      if (images.length === 0) { log("HOOK exit: no images"); return }

      // Dedup images by URL
      const seen = new Set()
      const uniqueImages = images.filter(img => {
        const url = getImageUrl(img)
        if (!url || seen.has(url)) return false
        seen.add(url)
        return true
      })
      if (uniqueImages.length < images.length) log("DEDUP", { from: images.length, to: uniqueImages.length })

      const tSave = performance.now()
      const saved = (await Promise.all(uniqueImages.map(saveImage))).filter(Boolean)
      log("SAVED", { ms: (performance.now() - tSave).toFixed(1), count: saved.length, paths: saved })
      if (saved.length === 0) { log("HOOK exit: no saved"); return }

      const textPart = userMsg.parts.find((p) => p.type === "text")
      const userText = textPart?.text ?? ""

      try {
        const results = []
        for (let i = 0; i < saved.length; i++) {
          log("API_CALL", { i, total: saved.length, imagePath: saved[i] })
          const tApi = performance.now()
          const result = await callVisionAPI(saved[i], userText, cfg)
          log("API_OK", { i, ms: (performance.now() - tApi).toFixed(1), len: result.length, preview: result.slice(0, 80) })
          results.push(saved.length > 1 ? `[图片 ${i + 1}/${saved.length}]\n${result}` : result)
        }

        const combined = results.join("\n\n---\n\n")
        const injectedText = userText
          ? `${combined}\n\n用户问题：${userText}\n\n请基于以上信息回答用户的问题。`
          : combined

        // Remove all image parts and inject result as user text
        const newParts = userMsg.parts.filter(p => !isImageFile(p))
        const textIdx = newParts.findIndex((p) => p.type === "text")
        if (textIdx !== -1) {
          newParts[textIdx] = { ...newParts[textIdx], text: injectedText }
        } else {
          newParts.push({ type: "text", text: injectedText })
        }
        msgs[last.idx] = { ...userMsg, parts: newParts }
        log("DONE replaced", { totalMs: (performance.now() - tHook).toFixed(1) })
      } catch (e) {
        log("API_ERR", { totalMs: (performance.now() - tHook).toFixed(1), message: e.message, code: e.code, cause: e.cause?.message, name: e.name, constructor: e.constructor?.name })

        const err = cfg.errorHints !== false ? classifyError(e, cfg) : { cause: e.message, fix: "" }
        const errorText = err.fix
          ? `[图片分析失败]\n原因：${err.cause}\n建议：${err.fix}`
          : `[图片分析失败] ${err.cause}`

        const newParts = userMsg.parts.filter(p => !isImageFile(p))
        const textIdx = newParts.findIndex((p) => p.type === "text")
        if (textIdx === -1) {
          newParts.push({ type: "text", text: errorText })
        } else {
          newParts[textIdx] = { ...newParts[textIdx], text: `${newParts[textIdx].text}\n\n${errorText}` }
        }
        msgs[last.idx] = { ...userMsg, parts: newParts }
        log("API_FALLBACK", { totalMs: (performance.now() - tHook).toFixed(1) })
      } finally {
        const tClean = performance.now()
        await Promise.all(saved.map(fp => unlink(fp).catch(() => {})))
        log("CLEANUP", { ms: (performance.now() - tClean).toFixed(1) })
      }
    },
  }
}

function isImageFile(part) {
  return (part.type === "file" && part.mime?.startsWith("image/")) || part.type === "image"
}

function getImageUrl(part) {
  return part.url || part.image_url?.url || null
}

function guessExt(url) {
  const m = url.match(/\.(\w+)(?:\?|#|$)/)
  return m && ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(m[1]) ? m[1] : null
}

async function writeTempFile(buf, ext) {
  if (!existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true })
  const fp = join(TEMP_DIR, `${randomUUID()}.${ext}`)
  await writeFile(fp, buf)
  return fp
}

async function saveImage(part) {
  try {
    const url = getImageUrl(part)
    if (!url) return null

    if (url.startsWith("data:")) {
      const m = url.match(/^data:([^;]+);base64,(.+)$/)
      if (!m) return null
      const ext = MIME_EXT[m[1]?.toLowerCase()] ?? "png"
      const buf = Buffer.from(m[2], "base64")
      return await writeTempFile(buf, ext)
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) return null
      const buf = Buffer.from(await res.arrayBuffer())
      const ct = res.headers.get("content-type") || ""
      const ext = MIME_EXT[ct?.toLowerCase()] ?? guessExt(url) ?? "png"
      return await writeTempFile(buf, ext)
    }

    return null
  } catch {
    return null
  }
}
