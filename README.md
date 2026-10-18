# Copy & Paste

[Português](README.pt-BR.md) · **English**

A Claude Code plugin that makes Claude copy and paste text instead of typing
it again. Text Claude doesn't retype is tokens you don't pay for and time you
don't wait.

- [What it does](#what-it-does)
  - [Show a file with `{{show:}}`](#show-a-file-with-show)
  - [Copy a block from the chat with `chatclip`](#copy-a-block-from-the-chat-with-chatclip)
- [Install](#install)
- [How it works](#how-it-works)
- [Limitations](#limitations)
- [Development](#development)
- [License](#license)

## What it does

### Show a file with `{{show:}}`

When Claude writes long text for you to reuse (a prompt, a commit message, a
pull request description), it saves the text to a file and puts a single line
in its reply:

```text
{{show: docs/pr-description.md}}
```

On your screen, that line becomes the file's current text, in a code block.
Claude doesn't type the text twice (once in the file, once in the chat), and
the conversation keeps only the marker. To change the text,
Claude edits the file and shows it again: older replies show the new version
too.

The marker counts only when it's alone on its line and outside code. Files
over 60,000 characters are cut, with a note saying how many lines are shown.

### Copy a block from the chat with `chatclip`

`chatclip` is a command Claude runs in the terminal to move a code block that
is already in the conversation to a file or another command, without
retyping it:

| Command | What it does |
|---|---|
| `chatclip` | Lists the recent blocks (the newest is 1) |
| `chatclip 1` | Prints block 1 |
| `chatclip 2 -o out.md` | Writes block 2 to a file |
| `chatclip -g "word"` | Prints the newest block containing the word |
| `chatclip -u` | Reads your messages instead of Claude's |
| `chatclip -h` | Lists every option |

A `{{show:}}` marker counts as the block it draws.

The plugin teaches Claude to use both: you don't need to write anything in
your `CLAUDE.md`.

## Install

In Claude Code, in the terminal or the desktop app, type:

```text
/plugin install copy-paste --marketplace uayten/CopyPaste
```

In two steps, or on versions before 2.1.275:

```text
/plugin marketplace add uayten/CopyPaste
/plugin install copy-paste@fofuxo-copy-paste
```

Requirements:

- Claude Code 2.1.287 or later in the terminal, or 2.1.286 in the desktop app.
- [Node.js](https://nodejs.org) for `chatclip`. `{{show:}}` works without it.

## How it works

The plugin is a [mod](https://code.claude.com/docs/en/plugins/mods/overview):
code Claude Code runs inside itself, on events. It uses three official
extension points:

| Part | How |
|---|---|
| Drawing `{{show:}}` | A `ui.render` hook on Claude's reply (`AssistantMessage`). It swaps the marker line for the file on screen only; the stored conversation doesn't change. |
| Teaching Claude | A `prompt.context` hook: a short block of instructions goes with the first message of each conversation. The text is `INSTRUCTIONS` in `hooks/lib.ts`. |
| `chatclip` | The plugin's `bin/` folder, which Claude Code puts on the Bash tool's PATH. The script (`scripts/chatclip.mjs`) reads the blocks from the conversation's file in `~/.claude/projects/`. |

The plugin doesn't call the model, doesn't reach the network, and doesn't
change the conversation. See the [privacy policy](PRIVACY.md).

## Limitations

- **The mods API is in early access.** It can change between Claude Code
  releases, and an update may need a new version of the plugin.
- **Claude Code managed by an organization** (Team and Enterprise plans with
  managed settings): the `prompt.context` hook of a plugin the user installs
  doesn't run. `{{show:}}` still draws on screen, but Claude doesn't get the
  instructions. To work around it, copy the `INSTRUCTIONS` text (in
  `hooks/lib.ts`) into your `CLAUDE.md`.
- **Where nothing draws** (`claude -p`, the Agent SDK, cloud sessions), the
  marker shows as plain text.
- **`chatclip` reads the conversation's file**, whose format isn't
  documented. If it changes, `chatclip` may stop finding blocks. It only reads
  that file and never changes it.
- **`chatclip` is on the PATH of Claude's Bash tool only**, not your own
  terminal.
- **Claude Code only.** claude.ai and Cowork don't install plugins that have a
  `bin/` folder.

## Development

- `hooks/register.tsx`: the hooks.
- `hooks/lib.ts`: the pure logic (markers, blocks, instructions), tested in
  `hooks/lib.test.ts`.
- `scripts/chatclip.mjs`: `chatclip`; `bin/` holds its launchers for sh and
  Windows.

To try it without installing, load the folder for one session:

```bash
claude --plugin-dir .
```

To validate and run the tests:

```bash
claude plugin validate --strict .
```

```bash
claude plugin test .
```

## License

[MIT](LICENSE)
