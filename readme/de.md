# opencode-vision-paste

**OpenCode-Plugin: eingefügte Bilder abfangen → lokale VL-API-Analyse → durch Text ersetzen**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](../README.md) | [简体中文](zh-CN.md) | [繁體中文](zh-TW.md) | [日本語](ja.md) | [한국어](ko.md) | [Español](es.md) | [Français](fr.md) | [Deutsch](de.md) | [Русский](ru.md) | [Português](pt.md)

Du fügst ein Bild in deine OpenCode-Sitzung ein. Das LLM kann es nicht sehen. Aber das Plugin kann es.

opencode-vision-paste fängt eingefügte Bilder ab, sendet sie an eine lokale VL-API (z. B. Qwen3VL, ausgeführt mit llama.cpp) und ersetzt das Bild nahtlos durch eine detaillierte Textbeschreibung — bevor das LLM die Nachricht überhaupt sieht.

Keine Cloud-Abhängigkeiten. Keine API-Schlüssel erforderlich. Deine Bilder bleiben lokal.

---

## Funktionen

- **Transparent** — Bilder werden stillschweigend in Text umgewandelt. Das LLM erfährt nie von ihrer Existenz
- **Keine Abhängigkeiten** — einzelne ESM-Datei, kein Build-Schritt, keine npm-Abhängigkeiten
- **Mehrfachbild-Unterstützung** — mehrere Bilder gleichzeitig einfügbar; jedes wird einzeln analysiert und nummeriert
- **Lokal zuerst** — funktioniert mit jeder OpenAI-kompatiblen VL-API (llama.cpp, vLLM, usw.)
- **Intelligenter Cache** — wiederverwendet Analyseergebnisse für doppelte Bilder über Gesprächsrunden hinweg
- **HTTP- und data-URLs** — verarbeitet sowohl eingefügte Bilder (data:-URLs) als auch im Web gehostete Bilder

## Installation

### Für Menschen

Kopiere und füge diesen Prompt in deinen OpenCode-Agenten ein:

```
Installiere und konfiguriere opencode-vision-paste gemäß der Anleitung hier:
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### Für LLM-Agenten

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

Oder lies direkt die [Installationsanleitung](INSTALL.md).

---

## Schnellstart

1. **Installiere** das Plugin (siehe [Installation](#installation) oben)
2. **Konfiguriere** deinen VL-API-Endpunkt in `.opencode/vision-paste.config.jsonc` (optional — die Standardeinstellungen funktionieren, wenn llama.cpp lokal läuft)
3. **Füge ein Bild** in einen beliebigen OpenCode-Chat ein — beobachte, wie es in Text umgewandelt wird

---

## Konfiguration

Alle Einstellungen sind optional. Das Plugin funktioniert mit sinnvollen Standardwerten.

| Option | Standard | Beschreibung |
|--------|----------|-------------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | OpenAI-kompatibler VL-API-Endpunkt |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | Modellname für die VL-API |
| `apiKey` | `""` | API-Schlüssel (leer lassen, falls nicht erforderlich) |
| `promptTemplate` | `请用中文详细描述这张图片的内容。{userText}` | Prompt, der an das VL-Modell gesendet wird; `{userText}` wird durch die ursprüngliche Nachricht des Benutzers ersetzt |

**Konfigurationsdatei-Speicherorte** (erste gefundene gewinnt):
1. `.opencode/vision-paste.config.jsonc` (Projektebene)
2. `~/.config/opencode/vision-paste.config.jsonc` (Benutzerebene)

Vollständige Referenz: [CONFIGURATION.md](../CONFIGURATION.md)

---

## Funktionsweise

```
Benutzer fügt Bild ein
       ↓
opencode-vision-paste fängt `experimental.chat.messages.transform` ab
       ↓
Dekodiert das Bild (data-URL oder HTTP) → speichert temporäre Datei
       ↓
Sendet an lokale VL-API (OpenAI-kompatible Chat-Completions)
       ↓
Ersetzt Bildanteil durch Analysetext
       ↓
Temporäre Datei gelöscht — LLM sieht nur Text
```

Das Plugin hakt in die `experimental.chat.messages.transform`-Pipeline von OpenCode ein und wird ausgeführt, bevor die Nachricht an das LLM gesendet wird.

---

## Entwicklung

```
npm test    # Syntaxprüfung
npm pack    # lokales Paketieren
```

Das Plugin ist eine einzelne Datei (`vision-paste.mjs`). Kein Build-Schritt. Bearbeiten und neu laden.

Für lokale Tests füge es zu deiner `.opencode/opencode.jsonc` hinzu:

```jsonc
{
  "plugin": ["./pfad/zu/vision-paste.mjs"]
}
```

Dann starte OpenCode neu oder verwende `/model`, um ein Neuladen auszulösen.

---

## Beitragen

PRs willkommen! Siehe [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Lizenz

[MIT](../LICENSE)
