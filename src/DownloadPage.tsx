import { Apple, Code2, Download, Monitor, Smartphone, Terminal } from 'lucide-react'
import packageJson from '../package.json'

const version = packageJson.version
const releases = 'https://github.com/samhcus/pixelpaper/releases/latest/download'
const releasePage = 'https://github.com/samhcus/pixelpaper/releases/latest'
const platforms = [
  { label: 'macOS · Apple silicon', detail: 'DMG · arm64', file: 'Pixelpaper-mac-arm64.dmg', icon: Apple },
  { label: 'macOS · Intel', detail: 'DMG · x64', file: 'Pixelpaper-mac-x64.dmg', icon: Apple },
  { label: 'Windows', detail: 'Installer · x64', file: 'Pixelpaper-win-x64.exe', icon: Monitor },
  { label: 'Linux', detail: 'AppImage · x64', file: 'Pixelpaper-linux-x86_64.AppImage', icon: Terminal },
]

export default function DownloadPage() {
  return <div className="download-page">
    <header className="download-nav">
      <a className="wordmark" href="/" aria-label="PixelPaper home"><span className="download-mark">✦</span><strong>PixelPaper</strong></a>
      <a className="source-link" href="https://github.com/samhcus/pixelpaper" target="_blank" rel="noopener noreferrer"><Code2 /> View source on GitHub</a>
    </header>
    <main className="download-main">
      <section className="download-intro" aria-labelledby="download-title">
        <p className="download-version">v{version}</p>
        <h1 id="download-title">PixelPaper</h1>
        <p className="download-subtitle">Pixel art studio. Offline.</p>
      </section>
      <section className="download-section" id="downloads" aria-labelledby="desktop-title">
        <div className="section-label"><h2 id="desktop-title">Desktop</h2><a href={releasePage} target="_blank" rel="noopener noreferrer">Release notes</a></div>
        <div className="platform-grid">
          {platforms.map(({ label, detail, file, icon: Icon }) => <a className="platform-card" key={label} href={`${releases}/${file}`} aria-label={`Download PixelPaper for ${label}`}><Icon aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><Download className="platform-download-icon" aria-hidden="true" /></a>)}
        </div>
      </section>
      <section className="download-section" aria-labelledby="mobile-title">
        <div className="section-label"><h2 id="mobile-title">Mobile</h2></div>
        <div className="platform-grid mobile-grid">
          {['iOS', 'Android'].map((label) => <div className="platform-card platform-card--soon" key={label}><Smartphone aria-hidden="true" /><span><strong>{label}</strong><small>Coming soon</small></span></div>)}
        </div>
      </section>
    </main>
    <footer className="download-footer">PixelPaper · v{version}</footer>
  </div>
}
