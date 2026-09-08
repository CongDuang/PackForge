import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// 首屏前按系统偏好设置，避免无 data-theme 时无色板
document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)')
  .matches
  ? 'dark'
  : 'light'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element #root not found')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
