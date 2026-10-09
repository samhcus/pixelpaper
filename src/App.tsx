import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Check, Download, Info, LoaderCircle, Monitor, Smartphone, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InputGroup, InputGroupAddon, InputGroupTextarea } from '@/components/ui/input-group'
import { Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import galleryData from '@/data/gallery.json'
import type { GenerationJob, Orientation, Wallpaper } from '@/types'
import './app.css'

const gallery: Wallpaper[] = galleryData
const categories = ['All wallpapers', ...new Set(gallery.map((item) => item.category))]
const ACTIVE_KEY = 'wallpapers.active-generation'
const DRAFT_KEY = 'wallpapers.prompt-draft'
const templates = [
  { wallpaperId: 'pixel-art-teal-ancient-treehouse-01', title: 'Hidden treehouse', prompt: 'A secret treehouse deep in an ancient forest, glowing windows, hanging lanterns, lush teal foliage, detailed pixel art, peaceful atmosphere, wallpaper composition with no text' },
  { wallpaperId: 'pixel-art-blue-japan-shopfront-01', title: 'Quiet shopfront', prompt: 'A tiny Japanese shop on a quiet blue evening, warm light spilling onto the street, rain reflections, detailed pixel art, cinematic wallpaper, no text' },
  { wallpaperId: 'pixel-art-green-capybara-hotspring-01', title: 'A slower afternoon', prompt: 'A capybara resting in a steaming forest hot spring, soft sunlight through green leaves, cozy pixel art, tranquil wallpaper with no text' },
  { wallpaperId: 'pixel-art-purple-moon-cloudscape-01', title: 'Above the clouds', prompt: 'A crescent moon rising over a sea of lavender clouds, distant stars, soft purple and pink palette, dreamy pixel art wallpaper, no text' },
  { wallpaperId: 'pixel-art-teal-planet-orbit-01', title: 'Distant planet', prompt: 'A luminous teal planet with delicate orbital rings against a deep blue star field, retro pixel art, atmospheric space wallpaper, no text' },
  { wallpaperId: 'pixel-art-amber-sunset-river-01', title: 'Last light', prompt: 'A winding river reflecting a golden sunset, dark pine trees and distant mountain silhouettes, warm orange and purple pixel art wallpaper, no text' },
  { wallpaperId: 'pixel-art-green-waterfall-rainbow-01', title: 'Rainbow falls', prompt: 'A tall waterfall flowing into a turquoise pool, a rainbow in the mist, lush green jungle, detailed pixel art landscape wallpaper, no text' },
  { wallpaperId: 'pixel-art-teal-island-cabin-01', title: 'Island retreat', prompt: 'A little wooden cabin on a secluded island, calm water and distant mountains, warm window light at dusk, detailed cozy pixel art wallpaper, no text' },
]

function readSaved(key: string) {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}
function save(key: string, value: string) {
  try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key) } catch { /* Storage is optional. */ }
}
class ApiError extends Error {
  constructor(message: string, public status: number, public job?: GenerationJob) { super(message) }
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(data?.message || `Request failed (${response.status}). Please try again.`, response.status, data?.job)
  return data as T
}
function formatWait(seconds: number) {
  if (seconds < 60) return 'under a minute'
  const minutes = Math.ceil(seconds / 60)
  return `about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}

export default function App() {
  const [tab, setTab] = useState('collection')
  const [category, setCategory] = useState('All wallpapers')
  const [prompt, setPrompt] = useState(() => readSaved(DRAFT_KEY))
  const [orientation, setOrientation] = useState<Orientation>('desktop')
  const [selected, setSelected] = useState<Wallpaper | null>(null)
  const [providerOpen, setProviderOpen] = useState(false)
  const [creations, setCreations] = useState<Wallpaper[]>([])
  const [creationsLoading, setCreationsLoading] = useState(true)
  const [creationsError, setCreationsError] = useState('')
  const [job, setJob] = useState<GenerationJob | null>(null)
  const [activeId, setActiveId] = useState(() => readSaved(ACTIVE_KEY))
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [pollError, setPollError] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const wallpaperOpener = useRef<HTMLButtonElement | null>(null)
  const providerOpener = useRef<HTMLElement | null>(null)
  const focusPromptAfterClose = useRef(false)
  const submittingRef = useRef(false)
  const pending = submitting || Boolean(activeId)

  useEffect(() => { save(DRAFT_KEY, prompt) }, [prompt])
  useEffect(() => { save(ACTIVE_KEY, activeId) }, [activeId])

  async function loadCreations(signal?: AbortSignal) {
    setCreationsLoading(true)
    setCreationsError('')
    try { setCreations(await api<Wallpaper[]>('/api/creations', { signal })) }
    catch (cause) { if (!signal?.aborted) setCreationsError(cause instanceof Error ? cause.message : 'Could not load creations.') }
    finally { if (!signal?.aborted) setCreationsLoading(false) }
  }
  useEffect(() => {
    const controller = new AbortController()
    void loadCreations(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!activeId) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    const poll = async () => {
      try {
        const next = await api<GenerationJob>(`/api/generations/${encodeURIComponent(activeId)}`, { signal: controller.signal })
        if (stopped) return
        setJob(next)
        setPollError(false)
        if (next.status === 'complete' || next.status === 'failed' || next.status === 'cancelled') {
          setActiveId('')
          if (next.status === 'complete' && next.result) {
            const result = next.result
            setCreations((items) => [result, ...items.filter((item) => item.id !== result.id)])
          }
          if (next.status === 'failed') setError(next.message || 'The provider could not generate this wallpaper. Please try again.')
          return
        }
      } catch (cause) {
        if (stopped) return
        if (cause instanceof ApiError && cause.status === 404) {
          setActiveId('')
          setError('This generation is no longer available. Your description is saved; you can try again.')
          return
        }
        setPollError(true)
      }
      if (!stopped) timer = setTimeout(poll, 5000)
    }
    void poll()
    return () => { stopped = true; controller.abort(); clearTimeout(timer) }
  }, [activeId])

  function useDescription(description: string) {
    setPrompt(description)
    setError('')
    focusPromptAfterClose.current = Boolean(selected)
    setSelected(null)
    requestAnimationFrame(() => promptRef.current?.focus())
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || submittingRef.current) return
    const description = prompt.trim()
    if (description.length < 3) { setError('Describe your wallpaper in at least 3 characters.'); promptRef.current?.focus(); return }
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setPollError(false)
    setJob(null)
    try {
      const next = await api<GenerationJob>('/api/generations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: description, orientation }),
      })
      setJob(next)
      setActiveId(next.id)
      setTab('creations')
    } catch (cause) {
      if (cause instanceof ApiError && cause.job) { setJob(cause.job); setActiveId(cause.job.id); setTab('creations') }
      else setError(cause instanceof Error ? cause.message : 'Could not start generation. Please try again.')
    }
    finally { setSubmitting(false); submittingRef.current = false }
  }

  async function cancel() {
    if (!activeId || cancelling) return
    setCancelling(true)
    try {
      const cancelled = await api<GenerationJob>(`/api/generations/${encodeURIComponent(activeId)}`, { method: 'DELETE' })
      setJob(cancelled)
      if (cancelled.status === 'complete' && cancelled.result) {
        const result = cancelled.result
        setCreations((items) => [result, ...items.filter((item) => item.id !== result.id)])
        setTab('creations')
      }
      setActiveId('')
      setPollError(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not cancel. Please try again.') }
    finally { setCancelling(false) }
  }

  const filtered = category === 'All wallpapers' ? gallery : gallery.filter((item) => item.category === category)
  const status = submitting ? 'Sending your description…'
    : activeId && !job ? 'Reconnecting to your generation…'
    : activeId && job?.message ? job.message
    : activeId && job?.status === 'processing' ? 'Creating your wallpaper…'
    : activeId ? 'Waiting for a free worker…'
    : job?.status === 'complete' ? 'Your wallpaper is ready in Creations.'
    : job?.status === 'cancelled' ? 'Generation cancelled. Your description is saved.' : ''

  function renderWallpapers(items: Wallpaper[]) {
    return <div className="wallpaper-grid">{items.map((item, index) => <button
      className="wallpaper-card" key={item.id} type="button" onClick={(event) => { wallpaperOpener.current = event.currentTarget; setSelected(item) }}
      aria-label={`Preview ${item.title}`}>
      <img src={item.thumbnail} alt="" loading={index < 5 ? 'eager' : 'lazy'} decoding="async" />
      <span className="wallpaper-caption">{item.title}</span>
    </button>)}</div>
  }

  return <div className="wallpapers-app">
    <main className="gallery-shell">
      <header className="page-header"><h1>Wallpapers</h1><div className="page-header-actions"><Button asChild variant="ghost" className="get-app-link"><a href="/download">Get the app</a></Button><Button variant="ghost" size="icon" aria-label="About free image generation" onClick={(event) => { providerOpener.current = event.currentTarget; setProviderOpen(true) }}><Info /></Button></div></header>
      <Tabs value={tab} onValueChange={setTab} className="gallery-tabs">
        <div className="gallery-toolbar">
          <TabsList className="gallery-tab-list" aria-label="Wallpaper views">
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="creations">Creations{creations.length > 0 && <span className="tab-count">{creations.length}</span>}</TabsTrigger>
          </TabsList>
          {tab === 'collection' && <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="category-select" aria-label="Filter wallpapers by category"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>{categories.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>}
        </div>
        <TabsContent value="collection">{renderWallpapers(filtered)}</TabsContent>
        <TabsContent value="templates">
          <p className="view-description">Choose a starting point, then make it yours.</p>
          <div className="wallpaper-grid">{templates.map((template) => <button type="button" className="wallpaper-card template-card" key={template.title} onClick={() => useDescription(template.prompt)} aria-label={`Use ${template.title} template`}>
            <img src={gallery.find((item) => item.id === template.wallpaperId)?.thumbnail} alt="" loading="lazy" decoding="async" />
            <span className="wallpaper-caption">{template.title}<span className="template-action">Use template <ArrowUp /></span></span>
          </button>)}</div>
        </TabsContent>
        <TabsContent value="creations">
          {pending && <div className="pending-creation" aria-busy="true"><div className="pending-image"><Skeleton className="pending-skeleton" /><LoaderCircle className="spinner" /></div><div><h2>{status}</h2><p>{job?.prompt || prompt}</p>{job?.queuePosition != null && <small>Queue position {job.queuePosition}{job.waitTime != null && job.waitTime > 0 ? ` · Estimated wait ${formatWait(job.waitTime)}` : ''}</small>}</div></div>}
          {creationsLoading ? <div className="wallpaper-grid" aria-label="Loading creations" aria-busy="true">{[0, 1, 2].map((id) => <Skeleton className="wallpaper-skeleton" key={id} />)}</div>
            : creationsError ? <Alert className="creations-error"><AlertDescription>{creationsError}<Button variant="secondary" onClick={() => void loadCreations()}>Try again</Button></AlertDescription></Alert>
            : creations.length ? renderWallpapers(creations)
            : !pending ? <Empty className="creations-empty"><EmptyHeader><EmptyTitle>Your next wallpaper starts here</EmptyTitle><EmptyDescription>Describe an image below, or choose a template to get started.</EmptyDescription></EmptyHeader><Button variant="secondary" onClick={() => setTab('templates')}>Browse templates</Button></Empty> : null}
        </TabsContent>
      </Tabs>
    </main>

    <section className="composer-dock" aria-label="Create a wallpaper">
      {(status || pollError || error) && <div className="generation-feedback">
        {error && <Alert variant="destructive" className="generation-error"><AlertDescription><span>{error}</span>{!pending && <Button type="submit" form="wallpaper-composer" variant="secondary" disabled={prompt.trim().length < 3}>Retry</Button>}<Button variant="ghost" size="icon" aria-label="Dismiss error" onClick={() => setError('')}><X /></Button></AlertDescription></Alert>}
        {status && <div className="generation-status"><div className="status-copy" role="status" aria-live="polite">{pending ? <LoaderCircle className="spinner" /> : job?.status === 'complete' ? <Check /> : null}<span>{status}{activeId && job?.queuePosition != null && job.status !== 'processing' && <small>Queue position {job.queuePosition}{job.waitTime != null && job.waitTime > 0 ? ` · Estimated wait ${formatWait(job.waitTime)}` : ''}</small>}</span></div>{activeId && <Button variant="ghost" size="sm" onClick={() => void cancel()} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Cancel'}</Button>}</div>}
        {pollError && <p className="connection-note" role="status">Connection interrupted. We’ll keep checking your generation automatically.</p>}
      </div>}
      <form id="wallpaper-composer" onSubmit={generate} className="composer-form">
        <Field className="composer-field">
          <FieldLabel className="sr-only" htmlFor="wallpaper-prompt">Describe a new image</FieldLabel>
          <InputGroup className="composer-input">
            <InputGroupTextarea id="wallpaper-prompt" ref={promptRef} placeholder="Describe a new image" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} rows={1} aria-describedby="provider-note prompt-keyboard" onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} />
            <InputGroupAddon align="inline-end" className="composer-actions">
              <Select value={orientation} onValueChange={(value) => setOrientation(value as Orientation)} disabled={pending}>
                <SelectTrigger className="orientation-select" aria-label="Wallpaper format"><SelectValue /></SelectTrigger>
                <SelectContent side="top" align="end"><SelectGroup><SelectItem value="desktop"><Monitor /> Desktop <span className="format-dimensions">768 × 512</span></SelectItem><SelectItem value="phone"><Smartphone /> Phone <span className="format-dimensions">512 × 768</span></SelectItem><SelectItem value="square"><Square /> Square <span className="format-dimensions">512 × 512</span></SelectItem></SelectGroup></SelectContent>
              </Select>
              <Button className="generate-button" type="submit" size="icon" disabled={prompt.trim().length < 3 || pending} aria-label={pending ? 'Generation in progress' : error ? 'Retry wallpaper generation' : 'Generate wallpaper'}>{pending ? <LoaderCircle className="spinner" /> : <ArrowUp />}</Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <span id="prompt-keyboard" className="sr-only">Press Control or Command and Enter to generate. Enter adds a new line.</span>
      </form>
      <p className="provider-note" id="provider-note">Free with AI Horde <span aria-hidden="true">·</span> Queue times vary <button type="button" onClick={(event) => { providerOpener.current = event.currentTarget; setProviderOpen(true) }} aria-label="Learn about AI Horde and image privacy"><Info /></button></p>
    </section>

    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}>
      <DialogContent className="wallpaper-dialog" onCloseAutoFocus={(event) => { event.preventDefault(); if (focusPromptAfterClose.current) { focusPromptAfterClose.current = false; promptRef.current?.focus() } else if (wallpaperOpener.current?.isConnected) wallpaperOpener.current.focus(); else promptRef.current?.focus() }}>{selected && <>
        <DialogHeader><DialogTitle>{selected.title}</DialogTitle><DialogDescription>{selected.width} × {selected.height} <span aria-hidden="true">·</span> {selected.category}</DialogDescription></DialogHeader>
        <div className="preview-image-wrap"><img src={selected.src} alt={selected.prompt || selected.title} className="preview-image" /></div>
        {selected.prompt && <p className="preview-prompt">{selected.prompt}</p>}
        <div className="preview-actions"><Button variant="secondary" onClick={() => useDescription(selected.prompt || `${selected.title}, ${selected.category.toLowerCase()} wallpaper, atmospheric composition, no text`)}>Use description</Button><Button asChild><a href={selected.src} download><Download /> Download</a></Button></div>
      </>}</DialogContent>
    </Dialog>
    <Dialog open={providerOpen} onOpenChange={setProviderOpen}><DialogContent className="provider-dialog" onCloseAutoFocus={(event) => { event.preventDefault(); providerOpener.current?.focus() }}><DialogHeader><DialogTitle>Free image generation</DialogTitle><DialogDescription>Powered by AI Horde’s community of volunteer workers.</DialogDescription></DialogHeader><div className="provider-details"><p>No account, API key, or payment is needed. Generation can take several minutes when the queue is busy, and availability depends on volunteer workers.</p><p>Your description is sent to AI Horde. Anonymous generations are shared by the provider, so avoid private or sensitive information.</p><p>Desktop: 768 × 512 · Phone: 512 × 768 · Square: 512 × 512. Original collection wallpapers download at their full resolution.</p><a href="https://aihorde.net/" target="_blank" rel="noreferrer">About AI Horde ↗</a></div></DialogContent></Dialog>
  </div>
}
