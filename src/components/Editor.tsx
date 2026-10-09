import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Download, Eraser, FilePlus2, PaintBucket, Palette, Pencil, Redo2, Save, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Wallpaper } from '@/types'

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker'
type Orientation = 'desktop' | 'phone' | 'square'
const sizes: Record<Orientation, { width: number; height: number; label: string }> = {
  desktop: { width: 96, height: 64, label: 'Desktop' },
  phone: { width: 64, height: 96, label: 'Phone' },
  square: { width: 80, height: 80, label: 'Square' },
}
const palette = ['#173c43', '#285b62', '#6f9292', '#c6d9c2', '#fff3dc', '#f6c773', '#e99a79', '#c75b5b', '#8f5369', '#30354d', '#172331', '#f4e3c1']

function blankPixels(width: number, height: number) { return Array.from({ length: width * height }, () => palette[0]) }
function nearest(color: [number, number, number]) {
  let winner = palette[0]; let distance = Number.POSITIVE_INFINITY
  for (const candidate of palette) {
    const value = candidate.slice(1).match(/../g)!.map((part) => parseInt(part, 16)) as [number, number, number]
    const next = (value[0] - color[0]) ** 2 + (value[1] - color[1]) ** 2 + (value[2] - color[2]) ** 2
    if (next < distance) { distance = next; winner = candidate }
  }
  return winner
}

export function Editor({ initial, onSave, onClose }: { initial?: Wallpaper | null; onSave: (wallpaper: Wallpaper) => void; onClose: () => void }) {
  const [orientation, setOrientation] = useState<Orientation>(() => initial?.width && initial.height && initial.width > initial.height ? 'desktop' : initial?.height && initial.height > initial.width ? 'phone' : 'square')
  const grid = sizes[orientation]
  const [pixels, setPixels] = useState(() => blankPixels(grid.width, grid.height))
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState(palette[6])
  const [zoom, setZoom] = useState(7)
  const [history, setHistory] = useState<string[][]>([])
  const [future, setFuture] = useState<string[][]>([])
  const [title, setTitle] = useState(initial?.title || 'Untitled pixel wall')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    if (!initial?.src) return
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const offscreen = document.createElement('canvas'); offscreen.width = grid.width; offscreen.height = grid.height
      const context = offscreen.getContext('2d')!; context.imageSmoothingEnabled = false; context.drawImage(image, 0, 0, grid.width, grid.height)
      const data = context.getImageData(0, 0, grid.width, grid.height).data
      const next = Array.from({ length: grid.width * grid.height }, (_, index) => nearest([data[index * 4], data[index * 4 + 1], data[index * 4 + 2]]))
      setPixels(next); setHistory([]); setFuture([])
    }
    image.src = initial.src
  }, [initial?.src, grid.width, grid.height])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.width = grid.width; canvas.height = grid.height
    const context = canvas.getContext('2d')!; context.imageSmoothingEnabled = false
    pixels.forEach((fill, index) => { context.fillStyle = fill; context.fillRect(index % grid.width, Math.floor(index / grid.width), 1, 1) })
  }, [pixels, grid.width, grid.height])

  function commit(next: string[]) { setHistory((items) => [...items.slice(-40), pixels]); setFuture([]); setPixels(next) }
  function applyAt(index: number) {
    if (index < 0 || index >= pixels.length) return
    if (tool === 'picker') { setColor(pixels[index]); setTool('pencil'); return }
    if (tool === 'fill') {
      const target = pixels[index]; if (target === color) return
      const next = [...pixels]; const queue = [index]; const seen = new Set<number>()
      while (queue.length) { const current = queue.shift()!; if (seen.has(current) || next[current] !== target) continue; seen.add(current); next[current] = color; const x = current % grid.width; const y = Math.floor(current / grid.width); if (x) queue.push(current - 1); if (x < grid.width - 1) queue.push(current + 1); if (y) queue.push(current - grid.width); if (y < grid.height - 1) queue.push(current + grid.width) }
      commit(next); return
    }
    const next = [...pixels]; next[index] = tool === 'eraser' ? palette[0] : color; if (next[index] !== pixels[index]) commit(next)
  }
  function pointer(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!; const bounds = canvas.getBoundingClientRect(); const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * grid.width); const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * grid.height); const index = y * grid.width + x
    if (event.type === 'pointerdown') { drawing.current = true; canvas.setPointerCapture(event.pointerId); applyAt(index) } else if (drawing.current && tool !== 'fill' && tool !== 'picker') applyAt(index)
    if (event.type === 'pointerup' || event.type === 'pointercancel') drawing.current = false
  }
  function undo() { if (!history.length) return; const previous = history.at(-1)!; setHistory((items) => items.slice(0, -1)); setFuture((items) => [pixels, ...items]); setPixels(previous) }
  function redo() { if (!future.length) return; const next = future[0]; setFuture((items) => items.slice(1)); setHistory((items) => [...items, pixels]); setPixels(next) }
  function exportPng() { const link = document.createElement('a'); link.download = `${title.trim() || 'pixelpaper-wall'}.png`; link.href = canvasRef.current!.toDataURL('image/png'); link.click() }
  function saveWall() { const src = canvasRef.current!.toDataURL('image/png'); onSave({ id: initial?.id || `local-${crypto.randomUUID()}`, title: title.trim() || 'Untitled pixel wall', category: 'Pixel art', src, thumbnail: src, width: grid.width, height: grid.height, prompt: initial?.prompt, createdAt: new Date().toISOString() }) }

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo() }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo() }
      if (event.key.toLowerCase() === 'b') setTool('pencil'); if (event.key.toLowerCase() === 'e') setTool('eraser'); if (event.key.toLowerCase() === 'f') setTool('fill'); if (event.key.toLowerCase() === 'i') setTool('picker')
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  })

  return <section className="editor-view" aria-label="Pixel editor">
    <div className="editor-header"><div><p className="eyebrow">EDITOR</p><h2>{initial ? 'Tune your wallpaper' : 'Draw from scratch'}</h2><p>Every mark is a pixel. Keep it small, warm, and yours.</p></div><Button variant="ghost" onClick={onClose}>Close</Button></div>
    <div className="editor-layout">
      <div className="canvas-panel"><div className="canvas-toolbar"><label className="editor-title"><span className="sr-only">Wallpaper title</span><input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Wallpaper title" /></label><div className="canvas-actions"><Button variant="ghost" size="icon" onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 /></Button><Button variant="ghost" size="icon" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 /></Button></div></div><div className="canvas-wrap"><canvas ref={canvasRef} className="pixel-canvas" role="application" aria-label={`Pixel canvas, ${grid.width} by ${grid.height} pixels`} style={{ width: `${grid.width * zoom}px`, height: `${grid.height * zoom}px` }} onPointerDown={pointer} onPointerMove={pointer} onPointerUp={pointer} onPointerCancel={pointer} /></div><div className="zoom-row"><span>{sizes[orientation].label} · {grid.width} × {grid.height}</span><label>Zoom <input type="range" min="3" max="12" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label></div></div>
      <aside className="editor-tools"><div className="tool-group"><p className="tool-label">Canvas</p><div className="orientation-buttons">{(Object.keys(sizes) as Orientation[]).map((name) => <Button key={name} type="button" variant={orientation === name ? 'secondary' : 'ghost'} onClick={() => { setOrientation(name); setPixels(blankPixels(sizes[name].width, sizes[name].height)); setHistory([]); setFuture([]) }}>{sizes[name].label}</Button>)}</div></div><div className="tool-group"><p className="tool-label">Tools</p><div className="tool-buttons">{([['pencil', Pencil, 'Pencil (B)'], ['eraser', Eraser, 'Eraser (E)'], ['fill', PaintBucket, 'Fill (F)'], ['picker', Palette, 'Color picker (I)']] as const).map(([name, Icon, label]) => <Button key={name} type="button" variant={tool === name ? 'secondary' : 'ghost'} size="icon" onClick={() => setTool(name)} aria-label={label}><Icon /></Button>)}</div></div><div className="tool-group"><p className="tool-label">Palette</p><div className="palette-grid">{palette.map((swatch) => <button type="button" key={swatch} className={`swatch ${color === swatch ? 'selected' : ''}`} style={{ backgroundColor: swatch }} onClick={() => { setColor(swatch); setTool('pencil') }} aria-label={`Use ${swatch}`} />)}</div></div><div className="editor-footer-actions"><Button onClick={saveWall}><Save /> Save to shelf</Button><Button variant="outline" onClick={exportPng}><Download /> Export PNG</Button><Button variant="ghost" onClick={() => { setPixels(blankPixels(grid.width, grid.height)); setHistory([]); setFuture([]) }}><FilePlus2 /> Clear canvas</Button></div></aside>
    </div>
  </section>
}
