# opencode-vision-paste

**OpenCode プラグイン：ペーストされた画像をインターセプト → ローカル VL API で分析 → テキストに置換**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](../README.md) | [简体中文](zh-CN.md) | [繁體中文](zh-TW.md) | [日本語](ja.md) | [한국어](ko.md) | [Español](es.md) | [Français](fr.md) | [Deutsch](de.md) | [Русский](ru.md) | [Português](pt.md)

OpenCode セッションに画像をペーストしても、LLM には見えません。しかし、このプラグインには見えます。

opencode-vision-paste はペーストされた画像をインターセプトし、ローカルの VL API（llama.cpp で実行する Qwen3VL など）に送信し、LLM がメッセージを受信する前に画像を詳細なテキスト説明にシームレスに置き換えます。

クラウド依存なし。API キー不要。画像はローカルに残ります。

---

## 特徴

- **透過的** — 画像は自動的にテキストに変換され、LLM は画像の存在に気づきません
- **ゼロ依存** — 単一 ESM ファイル、ビルド不要、npm 依存なし
- **マルチ画像対応** — 複数画像を同時にペースト可能、各画像を個別に分析・番号付け
- **ローカル優先** — OpenAI 互換の VL API（llama.cpp、vLLM など）と連携
- **スマートキャッシュ** — 会話ターンをまたいで重複画像の分析結果を再利用
- **HTTP と data URL** — ペースト時の data URL と Web 上の画像の両方をサポート

## インストール

### 人間向け

以下のプロンプトをコピーして OpenCode エージェントにペーストしてください：

```
以下の手順に従って opencode-vision-paste をインストールして構成してください：
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### LLM エージェント向け

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

または[インストールガイド](INSTALL.md)を直接お読みください。

---

## クイックスタート

1. プラグインを**インストール**（上記[インストール](#インストール)参照）
2. VL API エンドポイントを**設定**（オプション、ローカルで llama.cpp が動作していればデフォルトで OK）
3. OpenCode チャットに画像を**ペースト** — 自動的にテキストに変換されます

---

## 設定

すべての設定はオプションです。プラグインは適切なデフォルト値で動作します。

| オプション | デフォルト値 | 説明 |
|-----------|-------------|------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | OpenAI 互換の VL API エンドポイント |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | VL API で使用するモデル名 |
| `apiKey` | `""` | API キー（不要な場合は空欄） |
| `promptTemplate` | `請用中文詳細描述這張圖片的內容。{userText}` | VL モデルに送信するプロンプト；`{userText}` はユーザーの元のメッセージに置換 |

**設定ファイルの場所**（最初に見つかったものが優先）：
1. `.opencode/vision-paste.config.jsonc`（プロジェクトレベル）
2. `~/.config/opencode/vision-paste.config.jsonc`（ユーザーレベル）

完全なリファレンス：[CONFIGURATION.md](../CONFIGURATION.md)

---

## 仕組み

```
ユーザーが画像をペースト
       ↓
opencode-vision-paste が `experimental.chat.messages.transform` をインターセプト
       ↓
画像をデコード (data URL または HTTP) → 一時ファイルに保存
       ↓
ローカル VL API に送信 (OpenAI 形式の chat completions)
       ↓
画像部分を分析テキストに置換
       ↓
一時ファイルを削除 — LLM はテキストのみを受信
```

プラグインは OpenCode の `experimental.chat.messages.transform` パイプラインにフックし、メッセージが LLM に送信される前に実行されます。

---

## 開発

```
npm test    # 構文チェック
npm pack    # ローカルパッケージング
```

プラグインは単一ファイル (`vision-paste.mjs`) で、ビルドは不要です。編集後にリロードするだけです。

ローカルテストでは、`.opencode/opencode.jsonc` に以下を追加：

```jsonc
{
  "plugin": ["./path/to/vision-paste.mjs"]
}
```

その後 OpenCode を再起動するか、`/model` でリロードをトリガーします。

---

## コントリビューション

PR 歓迎！ [CONTRIBUTING.md](../CONTRIBUTING.md) をご覧ください。

---

## ライセンス

[MIT](../LICENSE)
