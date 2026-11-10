import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import '../index.css'
import HomePage from './HomePage.jsx'

// 网页内容在构建时已生成（scripts/prerender-home.mjs），这里只接上交互。
hydrateRoot(
  document.getElementById('root'),
  <StrictMode>
    <HomePage />
  </StrictMode>,
)
