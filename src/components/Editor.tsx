import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import { Download, Eraser, FileImage, FilePlus2, PaintBucket, Palette, Pencil, Redo2, Save, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { canvasSizes, canvasToDataUrl, blankPixels, palettes, pixelateImage, type CanvasSize, type PaletteName } from '@/pixel'
import type { Wallpaper } from '@/types'
import './editor.css'

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker'
const paletteNames = Object.keys(palettes) as PaletteName[]
const MAX_FILE_BYTES = 15 * 1024 * 1024

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('That image could not be opened.')); reader.readAsDataURL(file) })
}

export function Editor({ initial, source, onSave, onClose }: { initial?: Wallpaper | null; source?: string; onSave: (wallpaper: Wallpaper) => void; onClose: () => void }) {
  const startingSize = initial?.width && initial.height && initial.width > initial.height ? 'desktop' : initial?.height && initial.height > initial.width ? 'phone' : 'square'
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(startingSize)
  const dimensions = canvasSizes[canvasSize]
  const [paletteName, setPaletteName] = useState<PaletteName>('peach')
  const colors: string[] = useMemo(() => [...palettes[paletteName].colors], [paletteName])
  const [pixels, setPixels] = useState(() => blankPixels(dimensions.width, dimensions.height, colors[0]))
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState<string>(colors[5])
  const [zoom, setZoom] = useState(7)
  const [title, setTitle] = useState(initial?.title || (source ? 'Pixel study' : 'Untitled pixel wall'))
  const [history, setHistory] = useState<string[][]>([])
  const [future, setFuture] = useState<string[][]>([])
  const [dirty, setDirty] = useState(false)
  const [processing, setProcessing] = useState(Boolean(source))
  const [notice, setNotice] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const strokeStart = useRef<string[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = source || initial?.src
    if (!input) return
    let cancelled = false
    setProcessing(true)
    pixelateImage(input, dimensions, paletteName, 10, Boolean(source)).then((next) => { if (!cancelled) { setPixels(next); setHistory([]); setFuture([]); setDirty(Boolean(source)); setNotice('Pixelated locally in your browser.') } }).catch((error) => { if (!cancelled) setNotice(error instanceof Error ? error.message : 'Could not pixelate that image.') }).finally(() => { if (!cancelled) setProcessing(false) })
    return () => { cancelled = true }
  }, [source, initial?.src, dimensions.width, dimensions.height, paletteName])

  useEffect(() => { setColor((current) => colors.includes(current) ? current : colors[5]) }, [colors])
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.width = dimensions.width; canvas.height = dimensions.height
    const context = canvas.getContext('2d')!; context.imageSmoothingEnabled = false
    pixels.forEach((fill, index) => { context.fillStyle = fill; context.fillRect(index % dimensions.width, Math.floor(index / dimensions.width), 1, 1) })
  }, [pixels, dimensions.width, dimensions.height])

  function commit(next: string[], previous = pixels) { setHistory((items) => [...items.slice(-39), previous]); setFuture([]); setPixels(next); setDirty(true) }
  function applyAt(index: number, value = pixels) {
    if (index < 0 || index >= value.length) return value
    if (tool === 'picker') { setColor(value[index]); setTool('pencil'); return value }
    if (tool === 'fill') {
      const target = value[index]; if (target === color) return value
      const next = [...value]; const queue = [index]; const seen = new Set<number>()
      while (queue.length) { const current = queue.shift()!; if (seen.has(current) || next[current] !== target) continue; seen.add(current); next[current] = color; const x = current % dimensions.width; const y = Math.floor(current / dimensions.width); if (x) queue.push(current - 1); if (x < dimensions.width - 1) queue.push(current + 1); if (y) queue.push(current - dimensions.width); if (y < dimensions.height - 1) queue.push(current + dimensions.width) }
      commit(next); return next
    }
    const next = [...value]; next[index] = tool === 'eraser' ? colors[0] : color; return next
  }
  function pointer(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!; const bounds = canvas.getBoundingClientRect(); const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * dimensions.width); const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * dimensions.height); const index = y * dimensions.width + x
    if (event.type === 'pointerdown') { drawing.current = true; canvas.setPointerCapture(event.pointerId); strokeStart.current = pixels; const next = applyAt(index); if (tool !== 'fill' && tool !== 'picker') setPixels(next) }
    else if (drawing.current && tool !== 'fill' && tool !== 'picker') setPixels((current) => applyAt(index, current))
    if (event.type === 'pointerup' || event.type === 'pointercancel') { drawing.current = false; if (strokeStart.current && tool !== 'picker') { setHistory((items) => [...items.slice(-39), strokeStart.current!]); setFuture([]); setDirty(true); strokeStart.current = null } }
  }
  function undo() { if (!history.length) return; const previous = history.at(-1)!; setHistory((items) => items.slice(0, -1)); setFuture((items) => [pixels, ...items]); setPixels(previous); setDirty(true) }
  function redo() { if (!future.length) return; const next = future[0]; setFuture((items) => items.slice(1)); setHistory((items) => [...items, pixels]); setPixels(next); setDirty(true) }
  function clear() { commit(blankPixels(dimensions.width, dimensions.height, colors[0])) }
  async function importPhoto(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setNotice('Choose an image file.'); return }
    if (file.size > MAX_FILE_BYTES) { setNotice('Images must be 15 MB or smaller.'); return }
    try { const data = await readFile(file); setProcessing(true); const next = await pixelateImage(data, dimensions, paletteName, 10, true); commit(next); setTitle(file.name.replace(/\.[^.]+$/, '') || 'Pixel study'); setNotice('Pixelated locally in your browser.'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not pixelate that image.') } finally { setProcessing(false) }
  }
  function saveWall() { const src = canvasToDataUrl(pixels, dimensions); onSave({ id: initial?.id || `local-${crypto.randomUUID()}`, title: title.trim() || 'Untitled pixel wall', category: 'Pixel art', src, thumbnail: src, width: dimensions.width, height: dimensions.height, createdAt: new Date().toISOString() }) }
  function exportPng() { const link = document.createElement('a'); link.download = `${title.trim() || 'pixelpaper-wall'}.png`; link.href = canvasToDataUrl(pixels, dimensions, 16); link.click() }
  function close() { if (dirty && !window.confirm('Leave this wall? Your unsaved pixels will be lost.')) return; onClose() }

  useEffect(() => { function key(event: KeyboardEvent) { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo() }; if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo() }; if (event.key.toLowerCase() === 'b') setTool('pencil'); if (event.key.toLowerCase() === 'e') setTool('eraser'); if (event.key.toLowerCase() === 'f') setTool('fill'); if (event.key.toLowerCase() === 'i') setTool('picker') }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) })

  return <section className="editor-view" aria-label="Pixelpaper editor">
    <header className="editor-topbar"><div className="editor-brand"><span className="brand-mark">✦</span><span>Pixelpaper</span><Badge variant="secondary">Local editor</Badge></div><Button variant="ghost" onClick={close}>Close</Button></header>
    <div className="editor-heading"><div><p className="eyebrow">MAKE A WALLPAPER</p><h1>{initial ? 'Tune your pixels.' : source ? 'Turn a photo into pixels.' : 'Draw it one pixel at a time.'}</h1><p>Small canvas. Clear tools. No cloud, no account, no AI.</p></div><label className="editor-title"><span className="sr-only">Wallpaper title</span><input value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true) }} aria-label="Wallpaper title" /></label></div>
    <div className="editor-layout">
      <div className="canvas-panel"><div className="canvas-toolbar"><div className="canvas-meta"><strong>{dimensions.label}</strong><span>{dimensions.detail}</span></div><div className="canvas-actions"><Button variant="ghost" size="icon" onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 /></Button><Button variant="ghost" size="icon" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 /></Button></div></div><div className="canvas-wrap" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void importPhoto(event.dataTransfer.files[0]) }}>{processing && <div className="canvas-processing">Pixelating locally…</div>}{!processing && <div className="canvas-drop-hint">Drop a photo here to pixelate it</div>}<canvas ref={canvasRef} className="pixel-canvas" role="application" aria-label={`Pixel canvas, ${dimensions.width} by ${dimensions.height} pixels`} style={{ width: `${dimensions.width * zoom}px`, height: `${dimensions.height * zoom}px` }} onPointerDown={pointer} onPointerMove={pointer} onPointerUp={pointer} onPointerCancel={pointer} /></div><div className="zoom-row"><span>Nearest-neighbor pixels · PNG export scales to {dimensions.width * 16} × {dimensions.height * 16}</span><label>Zoom <input type="range" min="3" max="12" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label></div></div>
      <aside className="editor-tools"><div className="tool-section"><p className="tool-label">Canvas</p><div className="segmented">{(Object.keys(canvasSizes) as CanvasSize[]).map((name) => <Button key={name} type="button" variant={canvasSize === name ? 'secondary' : 'ghost'} onClick={() => { setCanvasSize(name); setPixels(blankPixels(canvasSizes[name].width, canvasSizes[name].height, colors[0])); setHistory([]); setFuture([]); setDirty(true) }}>{canvasSizes[name].label}</Button>)}</div></div><div className="tool-section"><p className="tool-label">Bring in a photo</p><Button variant="outline" className="import-photo" onClick={() => fileRef.current?.click()}><FileImage /> Pixelate a photo</Button><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Choose a photo to pixelate" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => void importPhoto(event.target.files?.[0])} /><p className="tool-help">The image is resized, reduced to a palette, and saved only on this device.</p></div><div className="tool-section"><p className="tool-label">Palette</p><Select value={paletteName} onValueChange={(value) => setPaletteName(value as PaletteName)}><SelectTrigger aria-label="Color palette"><SelectValue /></SelectTrigger><SelectContent>{paletteNames.map((name) => <SelectItem key={name} value={name}>{palettes[name].label}</SelectItem>)}</SelectContent></Select><div className="palette-grid">{colors.map((swatch) => <button type="button" key={swatch} className={`swatch ${color === swatch ? 'selected' : ''}`} style={{ backgroundColor: swatch }} onClick={() => { setColor(swatch); setTool('pencil') }} aria-label={`Use ${swatch}`} />)}</div></div><div className="tool-section"><p className="tool-label">Tools <span className="tool-shortcuts">B E F I</span></p><div className="tool-buttons">{([['pencil', Pencil, 'Pencil (B)'], ['eraser', Eraser, 'Eraser (E)'], ['fill', PaintBucket, 'Fill (F)'], ['picker', Palette, 'Color picker (I)']] as const).map(([name, Icon, label]) => <Button key={name} type="button" variant={tool === name ? 'secondary' : 'ghost'} size="icon" onClick={() => setTool(name)} aria-label={label}><Icon /></Button>)}</div></div><div className="editor-footer-actions"><Button onClick={saveWall}><Save /> Save to shelf</Button><Button variant="outline" onClick={exportPng}><Download /> Export PNG</Button><Button variant="ghost" onClick={clear}><FilePlus2 /> Clear</Button></div>{notice && <p className="editor-notice" role="status">{notice}</p>}</aside>
    </div>
  </section>
}
