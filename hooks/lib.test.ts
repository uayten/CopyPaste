import { expect, test } from 'claude-code/testing'

import { candidates, fenceFor, findMarkers, languageOf } from './lib'

test('markers count only alone on their line and outside fences', () => {
  const text = [
    '{{show: a.md}}',
    'see `{{show: inline.md}}` here',
    '```text',
    '{{show: inside.md}}',
    '```',
    '  {{show: b.md}}  ',
  ].join('\n')
  expect(findMarkers(text)).toEqual([
    { line: 0, path: 'a.md' },
    { line: 5, path: 'b.md' },
  ])
})

test('fence outgrows the longest backtick run', () => {
  expect(fenceFor('plain')).toBe('```')
  expect(fenceFor('has ``` inside')).toBe('````')
  expect(fenceFor('has ````` and ~~~~')).toBe('``````')
})

test('language follows the extension', () => {
  expect(languageOf('C:\\x\\prompt.md')).toBe('markdown')
  expect(languageOf('notes')).toBe('text')
})

test('absolute paths stay, relative ones try the root before the cwd', () => {
  expect(candidates('C:\\x\\a.md', 'C:\\p', 'C:\\p\\sub')).toEqual(['C:\\x\\a.md'])
  expect(candidates('/c/x/a.md', 'C:\\p', 'C:\\p')).toEqual(['/c/x/a.md'])
  expect(candidates('\\\\srv\\a.md', 'C:\\p', 'C:\\p')).toEqual(['\\\\srv\\a.md'])
  expect(candidates('Docs/a.md', 'C:\\p\\', 'C:\\p\\sub')).toEqual(['C:\\p/Docs/a.md', 'C:\\p\\sub/Docs/a.md'])
  expect(candidates('./a.md', 'C:\\p', 'C:\\p')).toEqual(['C:\\p/a.md'])
})
