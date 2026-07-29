import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, it } from 'vitest'

const stylesheet = readFileSync(
  resolve(process.cwd(), 'src/index.css'),
  'utf8',
)

it('restores the system cursor on both guide pages', () => {
  expect(stylesheet).toMatch(/\.user-guide-page \*[\s\S]*?cursor: auto;/)
  expect(stylesheet).toMatch(/\.app-faq-page \*[\s\S]*?cursor: auto;/)
  expect(stylesheet).toMatch(/\.user-guide-page a,[\s\S]*?cursor: pointer;/)
  expect(stylesheet).toMatch(/\.app-faq-page summary[\s\S]*?cursor: pointer;/)
})
