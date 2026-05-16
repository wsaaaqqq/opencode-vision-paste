// test/mock-server.mjs — Lightweight mock VL API server
import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, "fixtures")

export function createMockServer(options = {}) {
  const {
    port = 0, // 0 = auto-assign
    responseText = "这是一张测试图片，显示了一个简单的场景。",
    responseStatus = 200,
    responseDelay = 0,
    modelsResponse = { data: [{ id: "Qwen3VL-8B-Instruct-Q4_K_M.gguf" }] },
    shouldFail = false,
    failStatus = 500,
    failBody = "Internal Server Error",
    nonJsonResponse = false,
    emptyChoices = false,
    nullContent = false,
    serveImages = true, // Serve fixture images for HTTP URL tests
  } = options

  let requestCount = 0
  let lastRequestBody = null
  let requestHistory = []

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${server.address().port}`)
    requestCount++
    requestHistory.push({ method: req.method, url: url.pathname, headers: req.headers })

    // Read body
    let body = ""
    req.on("data", chunk => { body += chunk })
    req.on("end", () => {
      try {
        lastRequestBody = JSON.parse(body)
      } catch {
        lastRequestBody = body
      }
    })

    // Serve fixture images for HTTP URL tests
    if (serveImages && (url.pathname.endsWith(".png") || url.pathname.endsWith(".jpg") || url.pathname.endsWith(".webp") || url.pathname.endsWith(".gif") || url.pathname.endsWith(".bmp"))) {
      const filename = url.pathname.split("/").pop()
      const fixturePath = join(FIXTURES, filename)
      try {
        const buf = readFileSync(fixturePath)
        const ext = filename.split(".").pop().toLowerCase()
        const mimeMap = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", bmp: "image/bmp" }
        res.writeHead(200, { "Content-Type": mimeMap[ext] || "image/png" })
        res.end(buf)
      } catch {
        res.writeHead(404)
        res.end("Not found")
      }
      return
    }

    if (url.pathname === "/models" || url.pathname.endsWith("/models")) {
      if (shouldFail) {
        res.writeHead(failStatus, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: failBody }))
      } else {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(modelsResponse))
      }
      return
    }

    if (url.pathname.includes("/chat/completions")) {
      if (shouldFail) {
        res.writeHead(failStatus, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: { message: failBody } }))
        return
      }

      if (nonJsonResponse) {
        res.writeHead(200, { "Content-Type": "text/plain" })
        res.end("not json")
        return
      }

      setTimeout(() => {
        let content = responseText
        if (nullContent) content = null

        const response = {
          choices: emptyChoices
            ? []
            : [{
                index: 0,
                message: { role: "assistant", content },
                finish_reason: "stop",
              }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }

        res.writeHead(responseStatus, { "Content-Type": "application/json" })
        res.end(JSON.stringify(response))
      }, responseDelay)
      return
    }

    res.writeHead(404, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Not found" }))
  })

  return {
    server,
    start() {
      return new Promise((resolve) => {
        server.listen(port, "127.0.0.1", () => {
          resolve(server.address().port)
        })
      })
    },
    stop() {
      return new Promise((resolve) => {
        server.close(() => resolve())
      })
    },
    get url() {
      return `http://127.0.0.1:${server.address()?.port}`
    },
    get port() {
      return server.address()?.port
    },
    get requestCount() { return requestCount },
    get lastRequestBody() { return lastRequestBody },
    get requestHistory() { return [...requestHistory] },
    reset() {
      requestCount = 0
      lastRequestBody = null
      requestHistory = []
    },
  }
}
