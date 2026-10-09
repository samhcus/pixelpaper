import { ArrowDownToLine, Check, Code2, Command, ExternalLink, MonitorDown, Package, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import galleryData from '@/data/gallery.json'
import type { Wallpaper } from '@/types'

const version = '1.1.0'
const releases = 'https://github.com/samhcus/wallpapers/releases/latest/download'
const examples = (galleryData as Wallpaper[]).filter((item) => item.id.startsWith('pixel-art-'))
const platforms = [
  { label: 'macOS', detail: 'Apple silicon · universal', file: 'Pixelpaper-mac-arm64.dmg', icon: Command },
  { label: 'Windows', detail: '64-bit installer', file: 'Pixelpaper-win-x64.exe', icon: MonitorDown },
  { label: 'Linux', detail: 'AppImage · 64-bit', file: 'Pixelpaper-linux-x86_64.AppImage', icon: Package },
]
export default function DownloadPage() {
  return <div className="download-page">
    <header className="download-nav"><a className="wordmark" href="/">Pixelpaper <span>by Samuel</span></a><Button asChild variant="ghost"><a href="https://github.com/samhcus/wallpapers" target="_blank" rel="noreferrer"><Code2 data-icon="inline-start" /> Source</a></Button></header>
    <main className="download-main">
      <section className="download-hero"><Badge variant="secondary"><Sparkles data-icon="inline-start" /> version {version}</Badge><h1>Your next pixel art<br /><em>wallpaper starts here.</em></h1><p>Pixelpaper is a small, cozy desktop studio for artists who want to make tiny worlds: rainy streets, warm interiors, night markets, and whatever you can fit into a grid.</p><div className="download-actions"><a className="primary-download" href={`${releases}/${platforms[0].file}`}><ArrowDownToLine /> Download for macOS</a><a className="quiet-download" href="#downloads">Choose another platform <span>↓</span></a></div></section>
      <section className="download-preview" aria-label="Pixelpaper preview"><div className="preview-window-bar"><span /><span /><span /><small>pixelpaper</small></div><div className="preview-window-body"><div className="preview-copy">Describe a new pixel art wallpaper <span>↑</span></div><div className="preview-mini-grid">{examples.slice(0, 4).map((item) => <img key={item.id} src={item.thumbnail} alt={item.title} />)}</div></div></section>
      <section className="example-library"><div className="section-heading"><span>MADE BY SAMUEL</span><h2>A few made with Pixelpaper.</h2><p>These are examples from Samuel’s studio. Every downloaded app starts with a clean shelf for your own work.</p></div><div className="example-grid">{examples.map((item) => <figure key={item.id}><img src={item.thumbnail} alt={item.title} loading="lazy" /><figcaption>{item.title}</figcaption></figure>)}</div></section>
      <section className="download-details" id="downloads"><div className="section-heading"><span>DOWNLOAD</span><h2>Make your own.</h2><p>Open the app when you want a new pixel wall. Close it when you’re done.</p></div><div className="platform-grid">{platforms.map(({ label, detail, file, icon: Icon }) => <article className="platform-card" key={label}><div className="platform-icon"><Icon /></div><div><h3>{label}</h3><p>{detail}</p></div><a className="platform-download" href={`${releases}/${file}`} aria-label={`Download Pixelpaper for ${label}`}><ArrowDownToLine /></a></article>)}</div></section>
      <section className="download-notes"><div><ShieldCheck /><div><h3>Local by default</h3><p>Your shelf and editor work stay on your computer. Generation uses the free AI Horde service only when you ask for an image.</p></div></div><div><Check /><div><h3>Checksums included</h3><p>Each release includes SHA-256 checksums. macOS and Windows packages are currently unsigned, so your system may ask you to confirm the first launch.</p></div></div></section>
      <section className="source-note"><p>Prefer to run it yourself?</p><code>git clone https://github.com/samhcus/wallpapers.git && cd wallpapers/app && npm install && npm start</code><a href="https://github.com/samhcus/wallpapers/releases" target="_blank" rel="noreferrer">View release checksums <ExternalLink /></a></section>
    </main><footer className="download-footer"><span>Pixelpaper · v{version}</span><span>Created with love by Samuel.</span></footer>
  </div>
}
