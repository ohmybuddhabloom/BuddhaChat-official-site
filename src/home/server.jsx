import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import HomePage from './HomePage.jsx'

// 构建时用：把首页渲染成 HTML 字符串，写进 dist/home.html。
export function renderHome() {
  return renderToString(
    <StrictMode>
      <HomePage />
    </StrictMode>,
  )
}
