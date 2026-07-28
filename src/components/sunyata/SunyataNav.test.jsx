import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SunyataNav from './SunyataNav.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'
import { SACRED_STORIES } from '../../content/sacredStories.js'

describe('SunyataNav', () => {
  it('renders the story dropdown with all three sacred stories', () => {
    const scene = createSceneSnapshot()

    render(<SunyataNav nav={scene.nav} stories={SACRED_STORIES} />)

    expect(screen.getByText('Story')).toBeInTheDocument()
    expect(screen.getByText('Children of Scripture')).toBeInTheDocument()
    expect(screen.getByText('Journey of Amethyst')).toBeInTheDocument()
    expect(screen.getByText('A Life in Thangka')).toBeInTheDocument()
    const trigger = screen.getByRole('button', { name: 'Open story menu' })
    const menu = screen.getByRole('menu', { hidden: true })
    expect(menu).not.toBeVisible()
    fireEvent.click(trigger)
    expect(menu).toBeVisible()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(menu).not.toBeVisible()
    expect(trigger).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      'https://www.buddhachat.online/videos/auth/login?returnUrl=https%3A%2F%2Fwww.buddhachat.online%2F',
    )
  })
})
