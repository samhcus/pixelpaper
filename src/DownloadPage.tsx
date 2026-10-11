import { ArrowDownToLine, Code2, Command, FileImage, MonitorDown, Package, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import galleryData from '@/data/gallery.json'
import packageJson from '../package.json'
import type { Wallpaper } from '@/types'

const version = packageJson.version
const releases = 'https://github.com/samhcus/pixelpaper/releases/latest/download'
const releasePage = 'https://github.com/samhcus/pixelpaper/releases/latest'
const examples = (galleryData as Wallpaper[]).filter((item) => item.id.startsWith('pixel-art-'))
const platforms = [
  { label: 'macOS · Apple silicon', detail: 'DMG installer · arm64', file: 'Pixelpaper-mac-arm64.dmg', icon: Command, available: true },
  { label: 'macOS · Intel', detail: 'DMG installer · x64', file: 'Pixelpaper-mac-x64.dmg', icon: Command, available: true },
  { label: 'Windows', detail: '64-bit installer', file: 'Pixelpaper-win-x64.exe', icon: MonitorDown, available: true },
  { label: 'Linux', detail: 'AppImage · 64-bit', file: 'Pixelpaper-linux-x86_64.AppImage', icon: Package, available: true },
  { label: 'iOS', detail: 'Mobile app in development', icon: Smartphone, available: false },
  { label: 'Android', detail: 'Mobile app in development', icon: Smartphone, available: false },
]
export default function DownloadPage() {
  return <div className="download-page">
    <header className="download-nav"><a className="wordmark" href="/"><span className="download-mark">✦</span><strong>PixelPaper</strong> <span>by Samuel</span></a><nav aria-label="Primary"><Button asChild variant="ghost"><a href="https://github.com/samhcus/pixelpaper" target="_blank" rel="noopener noreferrer"><Code2 data-icon="inline-start" /> View source</a></Button></nav></header>
    <main className="download-main">
      <section className="download-hero"><div className="hero-copy"><div className="hero-rail"><Badge variant="secondary"><Sparkles data-icon="inline-start" /> version {version}</Badge><span>Pixel art studio · offline first</span></div><h1>PixelPaper<br /><em>small worlds, one pixel at a time.</em></h1><p>Draw a tiny world from scratch, pixelate a photo, and export a clean PNG. Everything stays on your computer.</p><div className="download-actions"><a className="primary-download" href={`${releases}/${platforms[0].file}`}><ArrowDownToLine /> Download for macOS</a><a className="quiet-download" href="#downloads">See all downloads ↓</a></div></div><div className="download-scene" role="img" aria-label="A pixel art pond with ducks and an artist painting beside it"><div className="scene-sun" /><div className="scene-pond"><span className="scene-ripple scene-ripple-a" /><span className="scene-ripple scene-ripple-b" /><span className="scene-duck scene-duck-mother"><i /><b /><em /></span><span className="scene-duck scene-duck-one"><i /><b /><em /></span><span className="scene-duck scene-duck-two"><i /><b /><em /></span></div><div className="scene-artist"><span className="scene-easel"><i /></span><span className="scene-person"><i /><b /><em /></span></div><span className="scene-firefly scene-firefly-a" /><span className="scene-firefly scene-firefly-b" /><strong>PixelPaper</strong></div></section>
      <section className="download-preview" aria-label="PixelPaper preview"><div className="preview-window-bar"><span /><span /><span /><small>pixelpaper · local editor</small></div><div className="preview-window-body"><div className="preview-copy"><FileImage /> Pixelate a photo <span>128 × 72</span></div><div className="preview-mini-grid">{examples.slice(0, 4).map((item) => <img key={item.id} src={item.thumbnail} alt={item.title} />)}</div></div></section>
      <section className="principles"><div><span className="number">01</span><h2>Make from a blank grid.</h2><p>Desktop, phone, and square canvases. Pencil, eraser, fill, picker, undo, redo, and four small palettes.</p></div><div><span className="number">02</span><h2>Pixelate your own photos.</h2><p>A local canvas algorithm crops, downsamples, and reduces colors. Your photo never leaves the computer.</p></div><div><span className="number">03</span><h2>Export the thing.</h2><p>Save a wall to your shelf or download a PNG. No account, sync, subscription, or AI.</p></div></section>
      <section className="example-library"><div className="section-heading"><span>THE LIBRARY</span><h2>Examples from Samuel.</h2><p>A small set of pixel worlds to look at before you download. They are not copied into your app.</p></div><div className="example-grid">{examples.map((item) => <figure key={item.id}><img src={item.thumbnail} alt={item.title} loading="lazy" /><figcaption>{item.title}</figcaption></figure>)}</div></section>
      <section className="download-details" id="downloads"><div className="section-heading"><span>DOWNLOAD</span><h2>One clean install.</h2><p>Open Pixelpaper when you want to make a wall. Close it when you’re done.</p><a className="release-link" href={releasePage} target="_blank" rel="noopener noreferrer">Release notes and checksums</a></div><div className="platform-grid">{platforms.map(({ label, detail, file, icon: Icon, available }) => <article className={`platform-card ${available ? '' : 'platform-card--soon'}`} key={label}><div className="platform-icon"><Icon /></div><div><h3>{label}</h3><p>{detail}</p></div>{available ? <a className="platform-download" href={`${releases}/${file}`} aria-label={`Download Pixelpaper for ${label}`}><ArrowDownToLine /><span>Download</span></a> : <span className="platform-status" aria-label={`${label} coming soon`}>Coming soon</span>}</article>)}</div></section>
      <section className="download-notes"><div><ShieldCheck /><div><h3>Works offline</h3><p>Pixelpaper does not contact a generation service. Photos, drafts, and saved walls stay local to the app.</p></div></div><div><span className="checksum">SHA</span><div><h3>Checksums included</h3><p>Release downloads include SHA-256 checksums. macOS and Windows packages are currently unsigned.</p></div></div></section>
      <section className="source-note"><p>Prefer the source?</p><code>git clone https://github.com/samhcus/pixelpaper.git && cd pixelpaper && npm ci && npm run build:app</code></section>
    </main><footer className="download-footer"><span>PixelPaper · v{version}</span><span>Created with love by Samuel.</span></footer>
  </div>
}
