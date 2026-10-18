// Pure helpers for copy-paste: marker scanning, fences, languages, and the
// instructions Claude reads. No engine calls here, so the test can exercise
// them directly.

export type Marker = { line: number; path: string }

// Sent once per conversation with the first message, as a context block of
// its own: without it Claude would not know the marker or chatclip exist.
export const INSTRUCTIONS = `\
The copy-paste plugin lets you paste text instead of typing it again:

- Long text meant for reuse (a prompt, a commit message, a pull request description, a document) goes straight into a file. To show it to the user, write a line holding only \`{{show: <path>}}\` in your reply: the user sees the file's current text in a code block, while the transcript, and so you, keeps the marker. A relative path resolves from the working directory. Inside inline code or a fenced block the marker is not drawn.
- To show a file, write only the marker line. Never type the file's content, not even right after writing the file or to test the plugin. Put the marker in your final reply, not in text between tool calls. To change the text, edit the file, say what changed, and show it again with the marker.
- A marker in the history is the plugin working: do not read the file to check it. It always draws the file's current version, in older replies too.
- To copy a code block already in this chat to a file or to another command, run \`chatclip\` in the Bash tool instead of retyping it. \`chatclip\` lists the recent blocks (newest = 1), \`chatclip 1 -o out.md\` writes block 1 to a file, \`chatclip -g "word"\` prints the newest block containing the word, and \`-u\` reads the user's messages instead of yours. A \`{{show:}}\` marker counts as the block it draws. \`chatclip -h\` lists every option. chatclip needs Node.js: if it is missing, tell the user.`

const MARKER_LINE = /^\s*\{\{show:\s*([^}\n]+?)\s*\}\}\s*$/
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/

// Text above this size is cut at a line boundary, with a note after the block.
export const MAX_CHARS = 60_000

const LANGUAGES: Record<string, string> = {
  md: 'markdown', py: 'python', ts: 'typescript', tsx: 'tsx', js: 'javascript',
  mjs: 'javascript', json: 'json', cs: 'csharp', cpp: 'cpp', hpp: 'cpp', h: 'cpp',
  c: 'c', sh: 'bash', ps1: 'powershell', yml: 'yaml', yaml: 'yaml', toml: 'toml',
  html: 'html', css: 'css', lua: 'lua', gd: 'gdscript', xml: 'xml', sql: 'sql',
}

// A marker counts only when it is alone on its line and outside fenced code,
// so `{{show: x}}` in inline code or inside an example block stays as written.
export function findMarkers(text: string): Marker[] {
  const found: Marker[] = []
  let fence: string | null = null
  text.split('\n').forEach((line, i) => {
    if (fence !== null) {
      const close = line.match(FENCE_CLOSE)
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null
      return
    }
    const open = line.match(FENCE_OPEN)
    if (open) {
      fence = open[1]
      return
    }
    const marker = line.match(MARKER_LINE)
    if (marker) found.push({ line: i, path: marker[1] })
  })
  return found
}

// One backtick more than the longest run in the body, never fewer than three,
// so no line of the body can close the block early.
export function fenceFor(body: string): string {
  let longest = 0
  for (const run of body.match(/`+/g) ?? []) longest = Math.max(longest, run.length)
  return '`'.repeat(Math.max(3, longest + 1))
}

export function languageOf(path: string): string {
  const ext = path.match(/\.([^.\\/]+)$/)?.[1]?.toLowerCase() ?? ''
  return LANGUAGES[ext] ?? 'text'
}

export function clip(body: string): { body: string; note?: string } {
  if (body.length <= MAX_CHARS) return { body }
  const cut = body.lastIndexOf('\n', MAX_CHARS)
  const kept = body.slice(0, cut > 0 ? cut : MAX_CHARS)
  const total = body.split('\n').length
  const shown = kept.split('\n').length
  return { body: kept, note: `*(copy-paste: showing ${shown} of ${total} lines)*` }
}

export function block(body: string, lang: string): string {
  const fence = fenceFor(body)
  return `${fence}${lang}\n${body}\n${fence}`
}
