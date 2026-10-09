import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Download, Info, LoaderCircle, Monitor, Pencil, Plus, Smartphone, Sparkles, Square, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InputGroup, InputGroupAddon, InputGroupTextarea } from '@/components/ui/input-group'
import { Field, FieldLabel } from '@/components/ui/field'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Editor } from '@/components/Editor'
import type { GenerationJob, Orientation, Wallpaper } from '@/types'
import './app.css'

const ACTIVE_KEY = 'pixelpaper.active-generation'
const DRAFT_KEY = 'pixelpaper.prompt-draft'
const SAVED_KEY = 'pixelpaper.saved-walls'
const chips = ['cozy interior', 'rainy city', 'night market', 'tiny shop', 'sunset skyline']
function read(key: string) { try { return localStorage.getItem(key) || '' } catch { return '' } }
function readSavedWalls(): Wallpaper[] { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] } }
function write(key: string, value: string) { try { localStorage.setItem(key, value) } catch { /* optional storage */ } }
class ApiError extends Error { constructor(message: string, public status: number, public job?: GenerationJob) { super(message) } }
async function api<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(path, init); const data = await response.json().catch(() => null); if (!response.ok) throw new ApiError(data?.message || `Request failed (${response.status})`, response.status, data?.job); return data as T }
function waitLabel(seconds: number) { const minutes = Math.ceil(seconds / 60); return seconds < 60 ? 'under a minute' : `about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` }

export default function App() {
  const [tab, setTab] = useState('walls')
  const [prompt, setPrompt] = useState(() => read(DRAFT_KEY))
  const [orientation, setOrientation] = useState<Orientation>('desktop')
  const [savedWalls, setSavedWalls] = useState<Wallpaper[]>(readSavedWalls)
  const [creations, setCreations] = useState<Wallpaper[]>([])
  const [job, setJob] = useState<GenerationJob | null>(null)
  const [activeId, setActiveId] = useState(() => read(ACTIVE_KEY))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [providerOpen, setProviderOpen] = useState(false)
  const [editor, setEditor] = useState<{ initial?: Wallpaper | null } | null>(null)
  const [selected, setSelected] = useState<Wallpaper | null>(null)
  const [pollError, setPollError] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const submittingRef = useRef(false)
  const pending = submitting || Boolean(activeId)

  useEffect(() => write(DRAFT_KEY, prompt), [prompt])
  useEffect(() => write(ACTIVE_KEY, activeId), [activeId])
  useEffect(() => { write(SAVED_KEY, JSON.stringify(savedWalls)) }, [savedWalls])
  useEffect(() => { const controller = new AbortController(); void api<Wallpaper[]>('/api/creations', { signal: controller.signal }).then(setCreations).catch(() => undefined); return () => controller.abort() }, [])

  useEffect(() => {
    if (!activeId) return
    let stopped = false; let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const next = await api<GenerationJob>(`/api/generations/${encodeURIComponent(activeId)}`)
        if (stopped) return
        setJob(next); setPollError(false)
        if (['complete', 'failed', 'cancelled'].includes(next.status)) {
          setActiveId('')
          if (next.status === 'complete' && next.result) { setCreations((items) => [next.result!, ...items.filter((item) => item.id !== next.result!.id)]); setEditor({ initial: next.result }); setTab('walls') }
          if (next.status === 'failed') setError(next.message || 'The volunteer queue could not finish this wallpaper.')
          return
        }
      } catch { if (!stopped) setPollError(true) }
      if (!stopped) timer = setTimeout(poll, 5000)
    }
    void poll(); return () => { stopped = true; clearTimeout(timer) }
  }, [activeId])

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending || submittingRef.current) return
    const value = prompt.trim(); if (value.length < 3) { setError('Describe your pixel wallpaper in at least 3 characters.'); promptRef.current?.focus(); return }
    submittingRef.current = true; setSubmitting(true); setError(''); setJob(null)
    try { const next = await api<GenerationJob>('/api/generations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: value, orientation }) }); setJob(next); setActiveId(next.id) }
    catch (cause) { if (cause instanceof ApiError && cause.job) { setJob(cause.job); setActiveId(cause.job.id) } else setError(cause instanceof Error ? cause.message : 'Could not start generation.') }
    finally { submittingRef.current = false; setSubmitting(false) }
  }
  function saveWall(wall: Wallpaper) { setSavedWalls((items) => [wall, ...items.filter((item) => item.id !== wall.id)]); setEditor(null); setTab('walls') }
  function deleteWall(id: string) { setSavedWalls((items) => items.filter((item) => item.id !== id)) }
  const status = submitting ? 'Sending your description…' : activeId && !job ? 'Reconnecting to your generation…' : activeId && job?.status === 'processing' ? 'Painting your pixels…' : activeId ? 'Waiting for a volunteer pixel artist…' : ''

  if (editor) return <div className="pixelpaper-app"><Editor initial={editor.initial} onSave={saveWall} onClose={() => setEditor(null)} /></div>
  return <div className="pixelpaper-app">
    <main className="app-shell">
      <header className="page-header"><div><p className="eyebrow">PIXELPAPER · BY SAMUEL</p><h1>Your next pixel art wallpaper</h1></div><Button variant="ghost" className="about-button" onClick={() => setProviderOpen(true)}><Info /> About</Button></header>
      <section className="intro-row"><p>A peachy little studio for making city lights, cozy rooms, and tiny worlds. Your shelf starts empty and stays on your computer.</p><Button onClick={() => setEditor({ initial: null })}><Plus /> Draw from scratch</Button></section>
      <Tabs value={tab} onValueChange={setTab}><TabsList className="app-tabs" aria-label="Pixelpaper sections"><TabsTrigger value="walls">My pixel walls <span className="tab-count">{savedWalls.length}</span></TabsTrigger><TabsTrigger value="create">Create</TabsTrigger></TabsList><TabsContent value="walls" className="tab-content">
        {savedWalls.length ? <div className="wallpaper-grid">{savedWalls.map((wall) => <article className="saved-card" key={wall.id}><button type="button" className="wallpaper-card" onClick={() => setEditor({ initial: wall })} aria-label={`Edit ${wall.title}`}><img src={wall.thumbnail} alt="" /><span>{wall.title}</span></button><div className="saved-card-actions"><Button variant="ghost" size="sm" onClick={() => setEditor({ initial: wall })}><Pencil /> Edit</Button><Button variant="ghost" size="sm" onClick={() => deleteWall(wall.id)}><Trash2 /> Delete</Button></div></article>)}</div> : <Empty className="shelf-empty"><EmptyHeader><Badge variant="secondary"><Sparkles /> Fresh shelf</Badge><EmptyTitle>Your pixel shelf is empty</EmptyTitle><EmptyDescription>Describe a wallpaper or draw one from scratch. Your examples will stay private on this device.</EmptyDescription></EmptyHeader><div className="empty-actions"><Button onClick={() => setTab('create')}>Describe a wallpaper</Button><Button variant="outline" onClick={() => setEditor({ initial: null })}><Pencil /> Draw from scratch</Button></div></Empty>}
        {creations.length > 0 && !savedWalls.length && <p className="generation-hint">A generated image opens in the editor. Save it to your shelf when it feels right.</p>}
      </TabsContent><TabsContent value="create" className="tab-content"><section className="create-panel"><p className="eyebrow">MAKE A NEW WALL</p><h2>Give a tiny world a place to live.</h2><p>Keep the description visual and pixel-minded. Try one of the cozy starts below, then make every pixel yours in the editor.</p><div className="chip-row">{chips.map((chip) => <button type="button" className="prompt-chip" key={chip} onClick={() => { setPrompt(chip); promptRef.current?.focus() }}>{chip}</button>)}</div></section></TabsContent></Tabs>
    </main>
    <section className="composer-dock" aria-label="Create a pixel art wallpaper">{(status || error || pollError) && <div className="generation-feedback">{error && <Alert variant="destructive"><AlertDescription><span>{error}</span><Button variant="ghost" size="icon" aria-label="Dismiss error" onClick={() => setError('')}><X /></Button></AlertDescription></Alert>}{status && <div className="generation-status" role="status" aria-live="polite"><LoaderCircle className="spinner" /><span>{status}{job?.queuePosition != null && <small>Queue position {job.queuePosition}{job.waitTime ? ` · ${waitLabel(job.waitTime)}` : ''}</small>}</span></div>}{pollError && <p className="connection-note">Connection interrupted. We’ll keep checking.</p>}</div>}
      <form onSubmit={generate} className="composer-form"><Field><FieldLabel className="sr-only" htmlFor="pixel-prompt">Describe a new pixel art wallpaper</FieldLabel><InputGroup className="composer-input"><InputGroupTextarea id="pixel-prompt" ref={promptRef} placeholder="Describe a new pixel art wallpaper" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} rows={1} aria-describedby="prompt-note prompt-shortcut" onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} /><InputGroupAddon align="inline-end" className="composer-actions"><Select value={orientation} onValueChange={(value) => setOrientation(value as Orientation)} disabled={pending}><SelectTrigger aria-label="Pixel wallpaper format"><SelectValue /></SelectTrigger><SelectContent side="top"><SelectGroup><SelectItem value="desktop"><Monitor /> Desktop</SelectItem><SelectItem value="phone"><Smartphone /> Phone</SelectItem><SelectItem value="square"><Square /> Square</SelectItem></SelectGroup></SelectContent></Select><Button className="generate-button" type="submit" size="icon" disabled={prompt.trim().length < 3 || pending} aria-label="Generate pixel art wallpaper">{pending ? <LoaderCircle className="spinner" /> : <ArrowUp />}</Button></InputGroupAddon></InputGroup></Field><span id="prompt-shortcut" className="sr-only">Press Control or Command and Enter to generate.</span></form>
      <p className="provider-note" id="prompt-note">Free with AI Horde · Anonymous queue, local shelf <button type="button" onClick={() => setProviderOpen(true)} aria-label="Learn about generation privacy"><Info /></button></p>
    </section>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}><DialogContent>{selected && <><DialogHeader><DialogTitle>{selected.title}</DialogTitle><DialogDescription>{selected.width} × {selected.height} · Pixel art</DialogDescription></DialogHeader><img className="preview-image" src={selected.src} alt={selected.prompt || selected.title} /><div className="preview-actions"><Button onClick={() => { setSelected(null); setEditor({ initial: selected }) }}>Edit pixels</Button><Button asChild variant="outline"><a href={selected.src} download={`${selected.title}.png`}><Download /> Download</a></Button></div></>}</DialogContent></Dialog>
    <Dialog open={providerOpen} onOpenChange={setProviderOpen}><DialogContent><DialogHeader><DialogTitle>Made for pixel artists</DialogTitle><DialogDescription>Pixelpaper is local-first and uses the free AI Horde volunteer queue only when you ask for a generated image.</DialogDescription></DialogHeader><div className="provider-details"><p>Your prompt leaves this device for generation. Saved walls and editor work stay in this app’s local data folder.</p><p>The server accepts pixel-art descriptions only and runs on loopback. Downloads include SHA-256 checksums; the macOS and Windows installers are currently unsigned.</p><a href="https://aihorde.net/" target="_blank" rel="noreferrer">About AI Horde ↗</a></div></DialogContent></Dialog>
  </div>
}
