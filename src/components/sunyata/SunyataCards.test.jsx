import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SunyataCards from './SunyataCards.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'

describe('SunyataCards', () => {
  it('renders the app showcase section below the three cards', () => {
    const scene = createSceneSnapshot()

    render(<SunyataCards cards={scene.cards} showcase={scene.appShowcase} />)

    expect(screen.getByTestId('app-previews-section')).toBeInTheDocument()
    expect(screen.getByText('The Digital Sanctuary.')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Download Now' }),
    ).toHaveAttribute('href', '/download')
  })
})
