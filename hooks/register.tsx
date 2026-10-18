import type { EngineInterface, Register } from 'claude-code'

import { INSTRUCTIONS, block, clip, findMarkers, languageOf } from './lib'

// A line holding only {{show: path}} is drawn as the file's current text in a
// code block, on screen only. The stored reply keeps the marker as written, so
// the model never reads the file back; chatclip reads the file the same way.

// While a reply streams the drawing runs many times; reuse a read this recent.
const READ_TTL_MS = 1500

const reads = new Map<string, { body: string; at: number }>()

async function readFile($: EngineInterface, path: string): Promise<string> {
  const now = await $.clock.now()
  const hit = reads.get(path)
  if (hit && now - hit.at < READ_TTL_MS) return hit.body
  const body = (await $.fs.read(path)).trimEnd()
  reads.set(path, { body, at: now })
  return body
}

async function draw($: EngineInterface, text: string): Promise<string> {
  const markers = findMarkers(text)
  if (markers.length === 0) return text
  const lines = text.split('\n')
  for (const { line, path } of markers) {
    try {
      const { body, note } = clip(await readFile($, path))
      lines[line] = block(body, languageOf(path)) + (note ? `\n\n${note}` : '')
    } catch {
      lines[line] = `*(copy-paste: could not read ${path})*`
    }
  }
  return lines.join('\n')
}

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!e.props.text.includes('{{show:')) return next(e)
    return next({ ...e, props: { ...e.props, text: await draw($, e.props.text) } })
  })

  // Tell Claude about the marker and chatclip, once per conversation.
  on('prompt.context', async ($, e, next) =>
    next({ ...e, blocks: [...e.blocks, { name: 'copy-paste', text: INSTRUCTIONS }] }),
  )
}
