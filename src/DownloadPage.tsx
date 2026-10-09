import { ArrowDownToLine, Check, Code2, Command, MonitorDown, Package, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const version = '1.0.1'
const releases = 'https://github.com/samhcus/wallpapers/releases/latest/download'

const platforms = [
  { key: 'mac', label: 'macOS', detail: 'Apple silicon · universal', file: 'Wallpapers-mac-arm64.dmg', icon: Command },
  { key: 'windows', label: 'Windows', detail: '64-bit installer', file: 'Wallpapers-win-x64.exe', icon: MonitorDown },
  { key: 'linux', label: 'Linux', detail: 'AppImage · 64-bit', file: 'Wallpapers-linux-x86_64.AppImage', icon: Package },
]

export default function DownloadPage() {
  return <div className="download-page">
    <header className="download-nav">
      <a className="wordmark" href="/">Wallpapers <span>by Samuel</span></a>
      <Button asChild variant="ghost"><a href="https://github.com/samhcus/wallpapers" target="_blank" rel="noreferrer"><Code2 data-icon="inline-start" /> Source</a></Button>
    </header>
    <main className="download-main">
      <section className="download-hero">
        <Badge variant="secondary"><Sparkles data-icon="inline-start" /> version {version}</Badge>
        <h1>Your next wallpaper<br /><em>starts here.</em></h1>
        <p>Wallpapers is a small, calm desktop app for collecting and creating backgrounds. It runs on your computer, keeps your creations there, and stays out of the way.</p>
        <div className="download-actions">
          <a className="primary-download" href={`${releases}/${platforms[0].file}`}><ArrowDownToLine /> Download for macOS</a>
          <a className="quiet-download" href="#downloads">Choose another platform <span>↓</span></a>
        </div>
      </section>
      <section className="download-preview" aria-label="App preview">
        <div className="preview-window-bar"><span /><span /><span /><small>wallpapers</small></div>
        <div className="preview-window-body"><div className="preview-copy">Describe a new image <span>↑</span></div><div className="preview-mini-grid">{['teal-ancient-treehouse-01','blue-japan-shopfront-01','green-capybara-hotspring-01','purple-moon-cloudscape-01'].map((name) => <img key={name} src={`/thumbnails/pixel-art-${name}.webp`} alt="" />)}</div></div>
      </section>
      <section className="download-details" id="downloads">
        <div className="section-heading"><span>DOWNLOAD</span><h2>Made for your desktop.</h2><p>Open the app when you want a new background. Close it when you’re done.</p></div>
        <div className="platform-grid">{platforms.map(({ label, detail, file, icon: Icon }) => <article className="platform-card" key={label}><div className="platform-icon"><Icon /></div><div><h3>{label}</h3><p>{detail}</p></div><a className="platform-download" href={`${releases}/${file}`} aria-label={`Download Wallpapers for ${label}`}><ArrowDownToLine /></a></article>)}</div>
      </section>
      <section className="download-notes">
        <div><ShieldCheck /><div><h3>Local by default</h3><p>The app stores your saved wallpapers on your computer. Generation uses the free AI Horde service only when you ask for an image.</p></div></div>
        <div><Check /><div><h3>One clean install</h3><p>Download it once, open it like any other app, and start describing what you want.</p></div></div>
      </section>
      <section className="source-note"><p>Prefer to run it yourself?</p><code>git clone https://github.com/samhcus/wallpapers.git && cd wallpapers/app && npm install && npm start</code></section>
    </main>
    <footer className="download-footer"><span>Wallpapers · v{version}</span><span>Created by Samuel</span></footer>
  </div>
}
