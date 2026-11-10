import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SunyataFooter from './SunyataFooter.jsx'
import { FOOTER_CONTACT_EMAIL, FOOTER_LEGAL_LINKS } from '../../content/footerLinks.js'
import { createSceneSnapshot } from '../../content/sunyata.js'

describe('SunyataFooter', () => {
  it('renders the footer heading and a download cta', () => {
    const scene = createSceneSnapshot()

    render(<SunyataFooter footer={scene.footer} />)

    expect(
      screen.getByRole('heading', {
        name: /Seek and\s*it is given/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: scene.footer.ctaLabel }),
    ).toHaveAttribute('href', '/download')
  })

  it('links every legal page, the contact email and an accurate copyright', () => {
    const scene = createSceneSnapshot()

    render(<SunyataFooter footer={scene.footer} />)

    for (const link of FOOTER_LEGAL_LINKS) {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href)
      expect(link.href).toMatch(/^https:\/\/legal\.buddhachat\.online\//)
    }
    expect(screen.getByRole('link', { name: FOOTER_CONTACT_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${FOOTER_CONTACT_EMAIL}`,
    )
    expect(screen.getByText(/© 2026 BuddhaChat\./)).toBeInTheDocument()
    expect(screen.queryByText(/SŪNYATĀ|IN THE VOID/i)).not.toBeInTheDocument()
  })
})
