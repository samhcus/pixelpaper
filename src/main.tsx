import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import DownloadPage from './DownloadPage'
import './index.css'
import './download.css'

const downloadHome = import.meta.env.MODE === 'site' || import.meta.env.VITE_DOWNLOAD_HOME === 'true'
const root = downloadHome || window.location.pathname === '/download' ? <DownloadPage /> : <App />

if ('serviceWorker' in navigator && downloadHome) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))
}

createRoot(document.getElementById('root')!).render(<StrictMode>{root}</StrictMode>)
