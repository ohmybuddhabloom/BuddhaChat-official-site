import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import AppFaqGuidePage from './AppFaqGuidePage.jsx'

it('shows six highlights and ten native questions without linking to the flow guide', () => {
  const { container } = render(<AppFaqGuidePage />)

  expect(container.querySelectorAll('.app-faq-features article')).toHaveLength(6)
  expect(container.querySelectorAll('.app-faq-questions details')).toHaveLength(10)
  expect(screen.getByRole('link', { name: '下载 BuddhaChat APP' })).toHaveAttribute(
    'href',
    '/download?ch=yuanhuidaochang',
  )
  expect(container.querySelector('a[href="/guide/yuanhui"]')).not.toBeInTheDocument()
})
