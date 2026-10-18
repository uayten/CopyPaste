import { expect, test } from 'claude-code/testing'

import { fenceFor, findMarkers, languageOf } from './lib'

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
