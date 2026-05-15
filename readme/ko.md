# opencode-vision-paste

**OpenCode 플러그인: 붙여넣은 이미지 가로채기 → 로컬 VL API 분석 → 텍스트로 대체**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](../README.md) | [简体中文](zh-CN.md) | [繁體中文](zh-TW.md) | [日本語](ja.md) | [한국어](ko.md) | [Español](es.md) | [Français](fr.md) | [Deutsch](de.md) | [Русский](ru.md) | [Português](pt.md)

OpenCode 세션에 이미지를 붙여넣어도 LLM은 볼 수 없습니다. 하지만 이 플러그인은 볼 수 있습니다.

opencode-vision-paste는 붙여넣은 이미지를 가로채서 로컬 VL API(llama.cpp로 실행하는 Qwen3VL 등)로 보내고, LLM이 메시지를 받기 전에 이미지를 상세한 텍스트 설명으로 매끄럽게 대체합니다.

클라우드 의존성 없음. API 키 불필요. 이미지는 항상 로컬에 남습니다.

---

## 기능

- **투명한 처리** — 이미지가 자동으로 텍스트로 변환되며 LLM은 이미지 존재를 인지하지 못합니다
- **제로 의존성** — 단일 ESM 파일, 빌드 불필요, npm 의존성 없음
- **다중 이미지 지원** — 여러 이미지를 동시에 붙여넣기 가능, 각각 독립적으로 분석 및 번호 매기기
- **로컬 우선** — OpenAI 호환 VL API(llama.cpp, vLLM 등)와 연동
- **스마트 캐싱** — 대화 턴을 넘어 중복 이미지 분석 결과 재사용
- **HTTP 및 data URL** — 붙여넣기 시 data URL과 웹 이미지 모두 지원

## 설치

### 인간 사용자용

다음 프롬프트를 복사하여 OpenCode 에이전트에 붙여넣으세요：

```
다음 지침에 따라 opencode-vision-paste를 설치하고 구성하세요：
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### LLM 에이전트용

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

또는 [설치 가이드](INSTALL.md)를 직접 읽어보세요.

---

## 빠른 시작

1. 플러그인 **설치** (위 [설치](#설치) 참조)
2. VL API 엔드포인트 **구성** (선택 사항, 로컬에서 llama.cpp가 실행 중이면 기본값으로 OK)
3. OpenCode 채팅에 이미지 **붙여넣기** — 자동으로 텍스트로 변환됩니다

---

## 구성

모든 설정은 선택 사항입니다. 플러그인은 합리적인 기본값으로 작동합니다.

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | OpenAI 호환 VL API 엔드포인트 |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | VL API에서 사용할 모델명 |
| `apiKey` | `""` | API 키 (필요하지 않으면 빈칸) |
| `promptTemplate` | `請用中文詳細描述這張圖片的內容。{userText}` | VL 모델에 보낼 프롬프트; `{userText}`는 사용자 원본 메시지로 대체 |

**설정 파일 위치** (먼저 발견된 것이 우선):
1. `.opencode/vision-paste.config.jsonc` (프로젝트 레벨)
2. `~/.config/opencode/vision-paste.config.jsonc` (사용자 레벨)

전체 참조: [CONFIGURATION.md](../CONFIGURATION.md)

---

## 작동 원리

```
사용자가 이미지 붙여넣기
       ↓
opencode-vision-paste가 `experimental.chat.messages.transform` 가로채기
       ↓
이미지 디코딩 (data URL 또는 HTTP) → 임시 파일 저장
       ↓
로컬 VL API로 전송 (OpenAI 형식의 chat completions)
       ↓
이미지 부분을 분석 텍스트로 대체
       ↓
임시 파일 삭제 — LLM은 텍스트만 수신
```

플러그인은 OpenCode의 `experimental.chat.messages.transform` 파이프라인에 후크되어 메시지가 LLM으로 전송되기 전에 실행됩니다.

---

## 개발

```
npm test    # 문법 검사
npm pack    # 로컬 패키징
```

플러그인은 단일 파일(`vision-paste.mjs`)이며 빌드가 필요 없습니다. 편집 후 리로드하면 됩니다.

로컬 테스트 시 `.opencode/opencode.jsonc`에 다음을 추가:

```jsonc
{
  "plugin": ["./path/to/vision-paste.mjs"]
}
```

그런 다음 OpenCode를 재시작하거나 `/model`로 리로드를 트리거하세요.

---

## 기여

PR 환영합니다! [CONTRIBUTING.md](../CONTRIBUTING.md)를 참조하세요.

---

## 라이선스

[MIT](../LICENSE)
