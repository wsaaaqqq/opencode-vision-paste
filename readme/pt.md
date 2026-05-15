# opencode-vision-paste

**Plugin OpenCode: intercepta imagens coladas → análise com API VL local → substitui por texto**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](../README.md) | [简体中文](zh-CN.md) | [繁體中文](zh-TW.md) | [日本語](ja.md) | [한국어](ko.md) | [Español](es.md) | [Français](fr.md) | [Deutsch](de.md) | [Русский](ru.md) | [Português](pt.md)

Você cola uma imagem na sua sessão do OpenCode. O LLM não consegue vê-la. Mas o plugin consegue.

opencode-vision-paste intercepta imagens coladas, envia-as para uma API VL local (ex.: Qwen3VL rodando via llama.cpp) e substitui a imagem por uma descrição textual detalhada — de forma transparente, antes que o LLM veja a mensagem.

Sem dependências de nuvem. Sem chaves de API necessárias. Suas imagens permanecem locais.

---

## Funcionalidades

- **Transparente** — imagens são silenciosamente convertidas em texto. O LLM nunca sabe que havia uma imagem
- **Zero dependências** — arquivo ESM único, sem etapa de build, sem dependências npm
- **Suporte a múltiplas imagens** — cole várias imagens de uma vez; cada uma é analisada e numerada
- **Local primeiro** — funciona com qualquer API VL compatível com OpenAI (llama.cpp, vLLM, etc.)
- **Cache inteligente** — reutiliza resultados de análise para imagens duplicadas entre turnos de conversa
- **HTTP e data URL** — lida tanto com imagens coladas (data: URLs) quanto com imagens hospedadas na web

## Instalação

### Para humanos

Copie e cole este prompt no seu agente OpenCode:

```
Instale e configure o opencode-vision-paste seguindo as instruções aqui:
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### Para agentes LLM

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

Ou leia o [Guia de instalação](INSTALL.md) diretamente.

---

## Início rápido

1. **Instale** o plugin (veja [Instalação](#instalação) acima)
2. **Configure** seu endpoint da API VL em `.opencode/vision-paste.config.jsonc` (opcional — os padrões funcionam se você tiver llama.cpp rodando localmente)
3. **Cole uma imagem** em qualquer chat do OpenCode — veja-a se transformar em texto

---

## Configuração

Todas as configurações são opcionais. O plugin funciona com padrões sensatos.

| Opção | Padrão | Descrição |
|-------|--------|-----------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | Endpoint da API VL compatível com OpenAI |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | Nome do modelo para a API VL |
| `apiKey` | `""` | Chave da API (deixe vazio se não for necessário) |
| `promptTemplate` | `请用中文详细描述这张图片的内容。{userText}` | Prompt enviado ao modelo VL; `{userText}` é substituído pela mensagem original do usuário |

**Locais do arquivo de configuração** (o primeiro encontrado tem prioridade):
1. `.opencode/vision-paste.config.jsonc` (nível do projeto)
2. `~/.config/opencode/vision-paste.config.jsonc` (nível do usuário)

Referência completa: [CONFIGURATION.md](../CONFIGURATION.md)

---

## Como funciona

```
Usuário cola uma imagem
       ↓
opencode-vision-paste intercepta `experimental.chat.messages.transform`
       ↓
Decodifica a imagem (data URL ou HTTP) → salva arquivo temporário
       ↓
Envia para API VL local (chat completions compatível com OpenAI)
       ↓
Substitui a parte da imagem pelo texto de análise
       ↓
Arquivo temporário excluído — LLM vê apenas texto
```

O plugin se conecta ao pipeline `experimental.chat.messages.transform` do OpenCode, executando antes que a mensagem seja enviada ao LLM.

---

## Desenvolvimento

```
npm test    # verificação de sintaxe
npm pack    # empacotamento local
```

O plugin é um único arquivo (`vision-paste.mjs`). Sem etapa de build. Edite e recarregue.

Para testar localmente, adicione-o ao seu `.opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["./caminho/para/vision-paste.mjs"]
}
```

Em seguida, reinicie o OpenCode ou use `/model` para acionar um recarregamento.

---

## Contribuição

PRs são bem-vindos! Veja [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Licença

[MIT](../LICENSE)
