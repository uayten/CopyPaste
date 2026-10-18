# Privacy Policy

Copy & Paste is a Claude Code plugin that runs only on your computer. It
collects nothing and sends nothing anywhere.

## What it reads

- **Files Claude names in a `{{show: <path>}}` line**, to draw their text on
  your screen. The text is shown to you only; it isn't added to the
  conversation or sent to the model.
- **The conversation's transcript file** in `~/.claude/projects/`, when Claude
  runs `chatclip`, to copy a code block that is already in the conversation.

## What it writes

- **A file you or Claude choose**, when `chatclip` is run with `-o`. Nothing
  else.

## What it sends

Nothing. The plugin makes no network requests, calls no model, and has no
analytics or telemetry. It stores no data of its own.

## Questions

Open an issue at <https://github.com/uayten/CopyPaste/issues>.
