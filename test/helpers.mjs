// test/helpers.mjs — Test utilities for loading plugin, creating messages, etc.
import { tmpdir, homedir } from "node:os"
import { join, dirname } from "node:path"
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const FIXTURES = join(__dirname, "fixtures")

export function loadPlugin() {
  return import(`file://${join(ROOT, "vision-paste.mjs")}?t=${Date.now()}`)
}

export function createMessage(parts, role = "user") {
  return {
    info: { role },
    parts,
  }
}

export function createImageFilePart(dataUrl, mime = "image/png") {
  return { type: "file", mime, url: dataUrl }
}

export function createImageTypePart(dataUrl) {
  return { type: "image", url: dataUrl }
}

export function createTextPart(text) {
  return { type: "text", text }
}

export function createHttpImagePart(url, mime = "image/png") {
  return { type: "file", mime, url }
}

export function createMessages(input) {
  const { images = [], text = "", role = "user" } = input
  const parts = []
  if (text) parts.push(createTextPart(text))
  for (const img of images) {
    if (img.startsWith("http://") || img.startsWith("https://")) {
      parts.push(createHttpImagePart(img, img.mime || "image/png"))
    } else if (img.startsWith("data:")) {
      parts.push(createImageFilePart(img, img.mime || "image/png"))
    } else {
      parts.push(createImageFilePart(img))
    }
  }
  return [createMessage(parts, role)]
}

export function bufferToDataUrl(buffer, mime = "image/png") {
  return `data:${mime};base64,${buffer.toString("base64")}`
}

export function loadFixture(name) {
  return readFileSync(join(FIXTURES, name))
}

export function createTempConfig(content, level = "project", tempDir = null) {
  const baseDir = tempDir || join(tmpdir(), `vision-paste-test-${Date.now()}`)
  const configDir = level === "project"
    ? join(baseDir, ".opencode")
    : join(homedir(), ".config", "opencode")

  mkdirSync(configDir, { recursive: true })
  const configPath = join(configDir, "vision-paste.config.jsonc")
  writeFileSync(configPath, content)
  return { configPath, baseDir, configDir }
}

export function cleanupTempDir(dir) {
  if (dir && existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function createOpencodeJson(pluginList, tempDir = null) {
  const baseDir = tempDir || join(tmpdir(), `vision-paste-test-${Date.now()}`)
  const opencodeDir = join(baseDir, ".opencode")
  mkdirSync(opencodeDir, { recursive: true })
  const path = join(opencodeDir, "opencode.jsonc")
  writeFileSync(path, JSON.stringify({ plugin: pluginList }, null, 2))
  return { path, baseDir, opencodeDir }
}

export function getTempDir() {
  return join(tmpdir(), "vision-paste")
}

export function clearTempDir() {
  const dir = getTempDir()
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function getDebugLog() {
  return join(tmpdir(), "vision-paste", "debug.log")
}

export function readDebugLog() {
  const path = getDebugLog()
  if (!existsSync(path)) return ""
  return readFileSync(path, "utf-8")
}

export function clearDebugLog() {
  const path = getDebugLog()
  if (existsSync(path)) {
    rmSync(path, { force: true })
  }
}
