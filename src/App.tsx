import { useRef, useState } from 'react'
import { ArrowRight, FileImage, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Editor } from '@/components/Editor'
import type { Wallpaper } from '@/types'
import './app.css'

const SAVED_KEY = 'pixelpaper.saved-walls'
function readSavedWalls(): Wallpaper[] { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] } }
function writeSavedWalls(walls: Wallpaper[]) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(walls)) } catch { /* Storage is optional. */ } }
function readFile(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('That image could not be opened.')); reader.readAsDataURL(file) }) }

export default function App() {
  const [savedWalls, setSavedWalls] = useState<Wallpaper[]>(readSavedWalls)
  const [editor, setEditor] = useState<{ initial?: Wallpaper | null; source?: string } | null>(null)
  const [fileError, setFileError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  function saveWall(wall: Wallpaper) { setSavedWalls((current) => { const next = [wall, ...current.filter((item) => item.id !== wall.id)]; writeSavedWalls(next); return next }); setEditor(null) }
  function deleteWall(id: string) { setSavedWalls((current) => { const next = current.filter((item) => item.id !== id); writeSavedWalls(next); return next }) }
  async function openPhoto(file?: File) {
    setFileError(''); if (!file) return
    if (!file.type.startsWith('image/')) { setFileError('Choose a PNG, JPG, WEBP, or GIF image.'); return }
    if (file.size > 15 * 1024 * 1024) { setFileError('Images must be 15 MB or smaller.'); return }
    try { setEditor({ source: await readFile(file) }) } catch (error) { setFileError(error instanceof Error ? error.message : 'Could not open that image.') }
  }
  if (editor) return <div className="pixelpaper-app"><Editor initial={editor.initial} source={editor.source} onSave={saveWall} onClose={() => setEditor(null)} /></div>
  return <div className="pixelpaper-app">
    <main className="app-shell">
      <header className="app-header"><a className="app-wordmark" href="/"><span className="brand-mark">✦</span><span>Pixelpaper</span></a><Badge variant="secondary">Offline by default</Badge></header>
      <section className="home-hero"><div className="hero-copy"><p className="eyebrow">PIXEL ART STUDIO</p><h1>Make pixel art.</h1><p>Draw on a grid or turn a photo into pixels. Files stay on this computer.</p><div className="hero-actions"><Button size="lg" onClick={() => setEditor({ initial: null })}><Plus /> New canvas</Button><Button size="lg" variant="outline" onClick={() => fileRef.current?.click()}><FileImage /> Pixelate a photo</Button><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Choose a photo to pixelate" className="sr-only" onChange={(event) => void openPhoto(event.target.files?.[0])} /></div>{fileError && <p className="home-error" role="alert">{fileError}</p>}</div><div className="hero-swatch" aria-hidden="true"><div className="hero-swatch-window"><span /><span /><span /></div><div className="hero-pixel-scene"><i /><i /><i /><i /><i /><i /><i /><i /></div><p>128 × 72 pixels</p></div></section>
      <section className="start-section"><div className="section-intro"><p className="eyebrow">START</p><h2>Choose a canvas.</h2><p>Draw, pick colors, undo, and export PNG.</p></div><div className="start-cards"><button type="button" className="start-card" onClick={() => setEditor({ initial: null })}><span className="start-icon"><Pencil /></span><span><strong>New canvas</strong><small>Desktop, phone, or square.</small></span><ArrowRight /></button><button type="button" className="start-card" onClick={() => fileRef.current?.click()}><span className="start-icon"><FileImage /></span><span><strong>Pixelate a photo</strong><small>Process it locally.</small></span><ArrowRight /></button></div></section>
      <section className="shelf-section"><div className="section-heading-row"><div><p className="eyebrow">SAVED</p><h2>Saved art <span>{savedWalls.length}</span></h2></div>{savedWalls.length > 0 && <Button variant="ghost" onClick={() => setEditor({ initial: null })}><Plus /> New</Button>}</div>{savedWalls.length ? <div className="wallpaper-grid">{savedWalls.map((wall) => <article className="saved-card" key={wall.id}><button type="button" className="wallpaper-card" onClick={() => setEditor({ initial: wall })} aria-label={`Edit ${wall.title}`}><img src={wall.thumbnail} alt="" /><span>{wall.title}</span></button><div className="saved-card-actions"><Button variant="ghost" size="sm" onClick={() => setEditor({ initial: wall })}><Pencil /> Edit</Button><Button variant="ghost" size="sm" onClick={() => deleteWall(wall.id)}><Trash2 /> Delete</Button></div></article>)}</div> : <Empty className="shelf-empty"><EmptyHeader><span className="empty-mark"><FolderOpen /></span><EmptyTitle>No saved art.</EmptyTitle><EmptyDescription>Saved canvases will live here.</EmptyDescription></EmptyHeader><Button variant="outline" onClick={() => setEditor({ initial: null })}>Make a canvas <ArrowRight /></Button></Empty>}
      </section>
    </main><footer className="app-footer"><span>Pixelpaper</span><span>Created with love by Samuel.</span></footer>
  </div>
}
