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
  expect(screen.getByText(/佛经阅读、佛教视频与佛乐/)).toBeInTheDocument()
  expect(screen.getByText(/日常修学功能可免费使用/)).toBeInTheDocument()
  expect(screen.queryByText(/现阶段免费/)).not.toBeInTheDocument()
  expect(screen.getByText(/打开 App Store，搜索“BuddhaChat”/)).toBeInTheDocument()
  expect(screen.getByText(/在 Google Play 搜索“BuddhaChat”/)).toBeInTheDocument()
  expect(screen.queryByText(/不需要自己在商店里搜索/)).not.toBeInTheDocument()
  expect(container.querySelector('a[href="/guide/yuanhui"]')).not.toBeInTheDocument()
})
