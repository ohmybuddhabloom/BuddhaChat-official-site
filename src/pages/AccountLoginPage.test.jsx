import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AccountLoginPage from './AccountLoginPage.jsx'

afterEach(() => vi.unstubAllGlobals())

describe('shared account entry', () => {
  it('uses the shared OTP API and keeps verification failures recoverable', async () => {
    const fetchMock = vi.fn(async (url) => ({ ok: !String(url).endsWith('/verify'), json: async () => ({ success: !String(url).endsWith('/verify'), user: null }) }))
    vi.stubGlobal('fetch', fetchMock)
    render(<AccountLoginPage />)
    fireEvent.change(screen.getByTestId('account-email'), { target: { value: 'reader@example.test' } })
    fireEvent.submit(screen.getByTestId('account-submit').closest('form'))
    await screen.findByTestId('account-code')
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/otp/send', expect.objectContaining({ method: 'POST', credentials: 'include', body: JSON.stringify({ email: 'reader@example.test' }) }))
    fireEvent.change(screen.getByTestId('account-code'), { target: { value: 'invalid-code' } })
    fireEvent.submit(screen.getByTestId('account-submit').closest('form'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Unable|未完成/))
    expect(screen.getByTestId('account-email').value).toBe('reader@example.test')
    expect(screen.getByTestId('account-submit').disabled).toBe(false)
  })
})
