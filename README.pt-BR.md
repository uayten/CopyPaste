# Copy & Paste

**Português** · [English](README.md)

Plugin do Claude Code que faz o Claude copiar e colar texto em vez de
digitá-lo de novo. Texto que o Claude não reescreve é token que você não paga
e espera que você não tem.

- [O que ele faz](#o-que-ele-faz)
  - [Mostrar um arquivo com `{{show:}}`](#mostrar-um-arquivo-com-show)
  - [Copiar um bloco do chat com `chatclip`](#copiar-um-bloco-do-chat-com-chatclip)
- [Instalação](#instalação)
- [Como funciona](#como-funciona)
- [Limitações](#limitações)
- [Desenvolvimento](#desenvolvimento)
- [Licença](#licença)

## O que ele faz

### Mostrar um arquivo com `{{show:}}`

Quando o Claude escreve um texto longo para você reusar (um prompt, uma
mensagem de commit, a descrição de um PR), ele grava o texto num arquivo e põe
na resposta só uma linha:

```text
{{show: docs/pr-description.md}}
```

Na sua tela, essa linha vira o conteúdo atual do arquivo, num bloco de código.
O Claude não digita o texto duas vezes (uma no arquivo, outra no chat), e a
conversa guarda só o marcador. Para mudar o texto, o
Claude edita o arquivo e mostra de novo: as respostas antigas também passam a
mostrar a versão nova.

O marcador só vale sozinho na linha e fora de código. Arquivos acima de 60 mil
caracteres aparecem cortados, com um aviso de quantas linhas foram mostradas.

### Copiar um bloco do chat com `chatclip`

`chatclip` é um comando que o Claude roda no terminal para levar um bloco de
código que já está na conversa até um arquivo ou outro comando, sem
reescrever:

| Comando | O que faz |
|---|---|
| `chatclip` | Lista os blocos recentes (o mais novo é o 1) |
| `chatclip 1` | Imprime o bloco 1 |
| `chatclip 2 -o saida.md` | Grava o bloco 2 num arquivo |
| `chatclip -g "palavra"` | Imprime o bloco mais novo que contém a palavra |
| `chatclip -u` | Lê as suas mensagens em vez das do Claude |
| `chatclip -h` | Lista todas as opções |

Um marcador `{{show:}}` conta como o bloco que ele desenha.

O plugin já ensina o Claude a usar as duas coisas: você não precisa escrever
nada no seu `CLAUDE.md`.

## Instalação

Num terminal com o Claude Code, ou no app desktop, digite:

```text
/plugin install copy-paste --marketplace uayten/CopyPaste
```

Em duas etapas, ou em versões anteriores à 2.1.275:

```text
/plugin marketplace add uayten/CopyPaste
/plugin install copy-paste@fofuxo-copy-paste
```

Requisitos:

- Claude Code 2.1.287 ou mais novo no terminal, ou 2.1.286 no app desktop.
- [Node.js](https://nodejs.org) para o `chatclip`. O `{{show:}}` funciona sem
  ele.

## Como funciona

O plugin é um [mod](https://code.claude.com/docs/en/plugins/mods/overview):
código que o Claude Code roda nele mesmo, em eventos. Ele usa três pontos de
extensão oficiais:

| Parte | Como |
|---|---|
| Desenhar o `{{show:}}` | Hook `ui.render` na resposta do Claude (`AssistantMessage`). Troca a linha do marcador pelo arquivo só na tela; a conversa salva não muda. |
| Ensinar o Claude | Hook `prompt.context`: um bloco curto de instruções vai junto com a primeira mensagem de cada conversa. O texto está em `INSTRUCTIONS`, em `hooks/lib.ts`. |
| `chatclip` | Pasta `bin/` do plugin, que o Claude Code põe no PATH da ferramenta Bash. O script (`scripts/chatclip.mjs`) lê os blocos do arquivo da conversa, em `~/.claude/projects/`. |

O plugin não chama o modelo, não acessa a rede e não altera a conversa.

## Limitações

- **API de mods em early access.** Ela pode mudar entre versões do Claude
  Code, e uma atualização pode exigir uma versão nova do plugin.
- **Claude Code gerenciado por uma organização** (planos Team e Enterprise com
  configurações gerenciadas): o hook `prompt.context` de plugins instalados
  pelo usuário não roda. O `{{show:}}` continua aparecendo na tela, mas o
  Claude não recebe as instruções. Para contornar, copie o texto de
  `INSTRUCTIONS` (em `hooks/lib.ts`) para o seu `CLAUDE.md`.
- **Onde nada é desenhado** (`claude -p`, Agent SDK, sessões na nuvem), o
  marcador aparece como texto.
- **O `chatclip` lê o arquivo da conversa**, cujo formato não é documentado. Se
  ele mudar, o `chatclip` pode deixar de achar os blocos. Ele só lê esse
  arquivo, nunca o altera.
- **O `chatclip` está no PATH só da ferramenta Bash** do Claude, não no seu
  terminal.
- **Só no Claude Code.** O claude.ai e o Cowork não instalam plugins com a
  pasta `bin/`.

## Desenvolvimento

- `hooks/register.tsx`: os hooks.
- `hooks/lib.ts`: a lógica pura (marcadores, blocos, instruções), testada em
  `hooks/lib.test.ts`.
- `scripts/chatclip.mjs`: o `chatclip`; `bin/` tem os atalhos para sh e
  Windows.

Para testar sem instalar, carregue a pasta numa sessão:

```bash
claude --plugin-dir .
```

Para validar e rodar os testes:

```bash
claude plugin validate --strict .
```

```bash
claude plugin test .
```

## Licença

[MIT](LICENSE)
