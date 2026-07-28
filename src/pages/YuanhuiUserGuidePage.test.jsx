import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import YuanhuiUserGuidePage from './YuanhuiUserGuidePage.jsx'

it('uses clickable buttons without the removed wording or exposed URLs', () => {
  render(<YuanhuiUserGuidePage />)

  expect(screen.getByRole('link', { name: '下载 BuddhaChat APP' })).toHaveAttribute(
    'href',
    '/download?ch=yuanhuidaochang',
  )
  expect(screen.getByRole('link', { name: '进入源慧法师专区' })).toHaveAttribute(
    'href',
    'https://yuanhui.buddhachat.online',
  )
  expect(document.body).not.toHaveTextContent('现阶段免费')
  expect(document.body).not.toHaveTextContent('微信扫一扫')
  expect(document.body).not.toHaveTextContent('buddhachat.online/download?')
})
