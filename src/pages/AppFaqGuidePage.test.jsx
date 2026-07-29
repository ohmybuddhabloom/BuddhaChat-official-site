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
  expect(screen.getAllByText(/匹配你的守护佛/)).toHaveLength(2)
  expect(screen.queryByText(/选择不同佛菩萨角色/)).not.toBeInTheDocument()
  expect(container.querySelector('a[href="/guide/yuanhui"]')).not.toBeInTheDocument()
})
