# opencode-vision-paste

**Плагин OpenCode: перехват вставленных изображений → анализ через локальный VL API → замена текстом**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](../README.md) | [简体中文](zh-CN.md) | [繁體中文](zh-TW.md) | [日本語](ja.md) | [한국어](ko.md) | [Español](es.md) | [Français](fr.md) | [Deutsch](de.md) | [Русский](ru.md) | [Português](pt.md)

Вы вставляете изображение в сеанс OpenCode. LLM не может его увидеть. Но плагин может.

opencode-vision-paste перехватывает вставленные изображения, отправляет их в локальный VL API (например, Qwen3VL, запущенный через llama.cpp) и незаметно заменяет изображение подробным текстовым описанием — до того, как LLM увидит сообщение.

Без облачных зависимостей. Без ключей API. Ваши изображения остаются локальными.

---

## Возможности

- **Прозрачно** — изображения незаметно преобразуются в текст. LLM никогда не узнает, что было изображение
- **Ноль зависимостей** — один ESM-файл, без шага сборки, без npm-зависимостей
- **Поддержка нескольких изображений** — вставляйте несколько изображений сразу; каждое анализируется и нумеруется
- **Локально прежде всего** — работает с любым VL API, совместимым с OpenAI (llama.cpp, vLLM и др.)
- **Умное кэширование** — повторно использует результаты анализа для дублирующихся изображений между витками диалога
- **HTTP и data URL** — обрабатывает как вставленные изображения (data: URL), так и изображения из интернета

## Установка

### Для людей

Скопируйте и вставьте этот промпт вашему агенту OpenCode:

```
Установите и настройте opencode-vision-paste, следуя инструкциям здесь:
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### Для LLM-агентов

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

Или прочитайте [Руководство по установке](INSTALL.md) напрямую.

---

## Быстрый старт

1. **Установите** плагин (см. [Установка](#установка) выше)
2. **Настройте** endpoint вашего VL API в `.opencode/vision-paste.config.jsonc` (опционально — значения по умолчанию работают, если llama.cpp запущен локально)
3. **Вставьте изображение** в любой чат OpenCode — наблюдайте, как оно превращается в текст

---

## Конфигурация

Все настройки опциональны. Плагин работает с разумными значениями по умолчанию.

| Опция | По умолчанию | Описание |
|-------|-------------|----------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | Endpoint VL API, совместимый с OpenAI |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | Имя модели для VL API |
| `apiKey` | `""` | Ключ API (оставьте пустым, если не требуется) |
| `promptTemplate` | `请用中文详细描述这张图片的内容。{userText}` | Промпт, отправляемый VL-модели; `{userText}` заменяется на исходное сообщение пользователя |

**Расположение файлов конфигурации** (приоритет у первого найденного):
1. `.opencode/vision-paste.config.jsonc` (уровень проекта)
2. `~/.config/opencode/vision-paste.config.jsonc` (уровень пользователя)

Полная справка: [CONFIGURATION.md](../CONFIGURATION.md)

---

## Как это работает

```
Пользователь вставляет изображение
       ↓
opencode-vision-paste перехватывает `experimental.chat.messages.transform`
       ↓
Декодирует изображение (data URL или HTTP) → сохраняет временный файл
       ↓
Отправляет в локальный VL API (chat completions, совместимый с OpenAI)
       ↓
Заменяет часть изображения текстом анализа
       ↓
Временный файл удалён — LLM видит только текст
```

Плагин подключается к конвейеру `experimental.chat.messages.transform` OpenCode, выполняясь до отправки сообщения LLM.

---

## Разработка

```
npm test    # проверка синтаксиса
npm pack    # локальная упаковка
```

Плагин — это один файл (`vision-paste.mjs`). Без шага сборки. Редактируйте и перезагружайте.

Для локального тестирования добавьте его в `.opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["./путь/к/vision-paste.mjs"]
}
```

Затем перезапустите OpenCode или используйте `/model` для перезагрузки.

---

## Участие

PR приветствуются! См. [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Лицензия

[MIT](../LICENSE)
