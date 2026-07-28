import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const pages = ['privacy.html', 'terms.html', 'account-deletion.html']

describe('legal social metadata', () => {
  it.each(pages)('%s has one complete card', (page) => {
    const html = readFileSync(
      path.join(process.cwd(), 'legal-site', page),
      'utf8',
    )

    expect(html.match(/property="og:title"/g)).toHaveLength(1)
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
    expect(html).toContain('property="og:image:width" content="1200"')
    expect(html).toContain('property="og:image:height" content="630"')
    expect(html).toContain('property="og:image:alt"')
    expect(html).not.toMatch(/vercel\.app|zentube/)
  })
})
