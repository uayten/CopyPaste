import type { EngineInterface, Register } from 'claude-code'

import { INSTRUCTIONS, block, candidates, clip, findMarkers, languageOf } from './lib'

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

// The first candidate that reads; the error names every place tried.
async function readMarker($: EngineInterface, path: string): Promise<string> {
  const tried = candidates(path, await $.session.root(), await $.session.cwd())
  for (const file of tried) {
    try {
      return await readFile($, file)
    } catch {}
  }
  throw new Error(tried.join(' or '))
}

async function draw($: EngineInterface, text: string): Promise<string> {
  const markers = findMarkers(text)
  if (markers.length === 0) return text
  const lines = text.split('\n')
  for (const { line, path } of markers) {
    try {
      const { body, note } = clip(await readMarker($, path))
      lines[line] = block(body, languageOf(path)) + (note ? `\n\n${note}` : '')
    } catch (err) {
      lines[line] = `*(copy-paste: could not read ${(err as Error).message})*`
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
