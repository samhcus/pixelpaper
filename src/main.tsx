import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './download.css'

async function bootstrap() {
  let root = <App />
  if (import.meta.env.MODE === 'site') {
    const { default: DownloadPage } = await import('./DownloadPage')
    root = <DownloadPage />
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))
  }
  createRoot(document.getElementById('root')!).render(<StrictMode>{root}</StrictMode>)
}
void bootstrap()
