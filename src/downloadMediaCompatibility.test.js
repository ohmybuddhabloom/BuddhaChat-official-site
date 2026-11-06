import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const documentTemplate = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const vercelConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'))

describe('download media compatibility', () => {
  it('uses broadly decodable hero images in CSS and the preload', () => {
    expect(stylesheet).not.toContain('buddhachat-download-hero-mobile-v3.avif')
    expect(stylesheet).not.toContain('buddhachat-download-hero-desktop-v3.avif')
    expect(stylesheet).toContain('buddhachat-download-hero-mobile-v3.jpg')
    expect(stylesheet).toContain('buddhachat-download-hero-desktop-v3.jpg')

    expect(documentTemplate).not.toContain('buddhachat-download-hero-mobile-v3.avif')
    expect(documentTemplate).not.toContain('buddhachat-download-hero-desktop-v3.avif')
    expect(documentTemplate).toContain('buddhachat-download-hero-mobile-v3.jpg')
    expect(documentTemplate).toContain('buddhachat-download-hero-desktop-v3.jpg')
  })

  it('redirects video static assets to the origin that can negotiate compression', () => {
    expect(vercelConfig.redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/videos/assets/:path*',
          destination: 'https://zentube.buddhachat.online/assets/:path*',
          permanent: false,
        }),
        expect.objectContaining({
          source: '/videos/locales/:path*',
          destination: 'https://zentube.buddhachat.online/locales/:path*',
          permanent: false,
        }),
      ]),
    )
  })
})
