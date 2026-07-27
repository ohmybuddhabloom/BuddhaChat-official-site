import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SunyataAppPreviews from './SunyataAppPreviews.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'
import { submitDownloadLead } from '../../lib/siteApi.js'

vi.mock('../../lib/siteApi.js', () => ({
  submitDownloadLead: vi.fn(async () => ({
    ok: true,
    downloadUrl: 'https://example.com/download',
  })),
}))

describe('SunyataAppPreviews', () => {
  it('opens the email capture panel and records the lead from the primary CTA', async () => {
    const scene = createSceneSnapshot()

    render(<SunyataAppPreviews showcase={scene.appShowcase} />)

    fireEvent.click(
      screen.getByRole('button', { name: scene.appShowcase.primaryActionLabel }),
    )

    expect(screen.getByTestId('app-previews-reserve')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Leave your email to get the app link'), {
      target: { value: 'listener@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(submitDownloadLead).toHaveBeenCalledWith({
        email: 'listener@example.com',
      })
    })

    expect(screen.getByTestId('app-previews-reserve')).toContainElement(
      screen.getByRole('status'),
    )
    expect(screen.getByTestId('app-previews-reserve')).toContainElement(
      screen.getByRole('link', { name: 'Open download link' }),
    )
    expect(screen.getByRole('link', { name: 'Open download link' })).toHaveAttribute(
      'href',
      'https://example.com/download',
    )
  })

  it('keeps the reserve card in a success state when the lead endpoint fails', async () => {
    submitDownloadLead.mockRejectedValueOnce(new Error('Download submissions are not configured yet.'))

    const scene = createSceneSnapshot()

    render(<SunyataAppPreviews showcase={scene.appShowcase} />)

    fireEvent.click(
      screen.getByRole('button', { name: scene.appShowcase.primaryActionLabel }),
    )

    fireEvent.change(screen.getByLabelText('Leave your email to get the app link'), {
      target: { value: 'listener@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Email saved. We will send the app link soon.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('app-previews-reserve')).toContainElement(status)
  })
})
