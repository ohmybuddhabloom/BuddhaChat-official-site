import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSceneSnapshot } from './sunyata.js'

// The live homepage renders public/editor-state/scene.json; the defaults back the editor reset.
const liveScene = JSON.parse(readFileSync(resolve(process.cwd(), 'public/editor-state/scene.json'), 'utf8'))

describe.each([
  ['live scene', liveScene],
  ['default scene', createSceneSnapshot()],
])('homepage trust copy (%s)', (_name, scene) => {
  const text = JSON.stringify(scene)

  it('carries no template placeholder, old brand or unverifiable proof', () => {
    expect(text).not.toMatch(/Foshuo/)
    expect(text).not.toMatch(/she whispers the ancient mantras/)
    expect(text).not.toMatch(/The second screen should stay mostly empty/)
    expect(text).not.toMatch(/12,000\+/)
    expect(text).not.toMatch(/SŪNYATĀ COLLECTIVE|IN THE VOID/)
    expect(scene.appShowcase.proofAvatars).toEqual([])
    expect(scene.appShowcase.secondaryActionLabel).toBe('')
  })

  it('does not present a canned answer as the Buddha replying', () => {
    expect(scene.interlude.responseLabel).not.toMatch(/Buddha replies/i)
    expect(scene.interlude.responseLinkHref).toBe('/download')
    expect(scene.interlude.note).toBe('')
  })

  it('points the footer cta at the download page', () => {
    expect(scene.footer.ctaHref).toBe('/download')
  })
})

describe('legal redirects', () => {
  const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'))

  it.each(['privacy', 'terms', 'support', 'account-deletion', 'child-safety'])('/%s goes to the legal site', (page) => {
    expect(config.redirects).toEqual(
      expect.arrayContaining([
        { source: `/${page}`, destination: `https://legal.buddhachat.online/${page}`, permanent: true },
      ]),
    )
  })
})
