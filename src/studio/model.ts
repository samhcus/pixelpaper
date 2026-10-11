/**
 * The small, dependency-free document model used by Pixelpaper's agent tools.
 *
 * A document is just a bounded pixel grid. Operations return new values and
 * never mutate their inputs, so the same functions can be used by the desktop
 * app, the JSONL agent bridge, and tests.
 */

export const AGENT_PROTOCOL_VERSION = 'pixelpaper.agent.v1'
export const DEFAULT_WIDTH = 16
export const DEFAULT_HEIGHT = 16
export const DEFAULT_BACKGROUND = '#000000'
export const MAX_DIMENSION = 1024
export const MAX_PIXELS = 1_048_576

export type PixelDocument = {
  id: string
  title: string
  width: number
  height: number
  background: string
  pixels: string[]
}

export type StudioState = {
  document: PixelDocument | null
  past: PixelDocument[]
  future: PixelDocument[]
}

export type ToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export class AgentToolError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AgentToolError'
    this.code = code
  }
}

function fail(code: string, message: string): never {
  throw new AgentToolError(code, message)
}

function assertObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_ARGUMENTS', 'arguments must be an object')
  return value as Record<string, unknown>
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail('INVALID_ARGUMENTS', `${name} must be a non-empty string`)
  return value.trim()
}

function optionalString(value: unknown, name: string, fallback: string): string {
  if (value === undefined) return fallback
  return requiredString(value, name)
}

function dimension(value: unknown, name: string, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_DIMENSION) {
    fail('INVALID_ARGUMENTS', `${name} must be an integer from 1 to ${MAX_DIMENSION}`)
  }
  return value
}

export function normalizeColor(value: unknown, name = 'color'): string {
  const color = requiredString(value, name)
  if (/^#[\da-f]{3}$/i.test(color)) {
    return `#${color.slice(1).split('').map((part) => part + part).join('').toLowerCase()}`
  }
  if (!/^#[\da-f]{6}$/i.test(color)) fail('INVALID_ARGUMENTS', `${name} must be a six-digit hex color such as #ffcc00`)
  return color.toLowerCase()
}

function indexFor(document: PixelDocument, x: unknown, y: unknown): number {
  if (typeof x !== 'number' || !Number.isInteger(x) || typeof y !== 'number' || !Number.isInteger(y)) {
    fail('INVALID_ARGUMENTS', 'x and y must be integers')
  }
  if (x < 0 || x >= document.width || y < 0 || y >= document.height) fail('OUT_OF_BOUNDS', `pixel (${x}, ${y}) is outside the ${document.width} × ${document.height} canvas`)
  return y * document.width + x
}

function cloneDocument(document: PixelDocument): PixelDocument {
  return { ...document, pixels: [...document.pixels] }
}

export function validateDocument(document: PixelDocument): PixelDocument {
  if (!document || typeof document !== 'object') fail('INVALID_DOCUMENT', 'document must be an object')
  if (typeof document.id !== 'string' || document.id.trim() === '') fail('INVALID_DOCUMENT', 'document.id must be a non-empty string')
  if (typeof document.title !== 'string') fail('INVALID_DOCUMENT', 'document.title must be a string')
  const width = dimension(document.width, 'document.width')
  const height = dimension(document.height, 'document.height')
  if (width * height > MAX_PIXELS) fail('INVALID_DOCUMENT', `canvas cannot exceed ${MAX_PIXELS} pixels`)
  const background = normalizeColor(document.background, 'document.background')
  if (!Array.isArray(document.pixels) || document.pixels.length !== width * height) fail('INVALID_DOCUMENT', `document.pixels must contain exactly ${width * height} colors`)
  const pixels = document.pixels.map((color, index) => normalizeColor(color, `document.pixels[${index}]`))
  return { id: document.id, title: document.title, width, height, background, pixels }
}

export function createDocument(options: Partial<Pick<PixelDocument, 'id' | 'title' | 'width' | 'height' | 'background'>> = {}): PixelDocument {
  const width = dimension(options.width, 'width', DEFAULT_WIDTH)
  const height = dimension(options.height, 'height', DEFAULT_HEIGHT)
  if (width * height > MAX_PIXELS) fail('INVALID_ARGUMENTS', `canvas cannot exceed ${MAX_PIXELS} pixels`)
  const background = options.background === undefined ? DEFAULT_BACKGROUND : normalizeColor(options.background, 'background')
  return {
    id: options.id === undefined ? `local-${crypto.randomUUID()}` : requiredString(options.id, 'id'),
    title: options.title === undefined ? 'Untitled' : String(options.title),
    width,
    height,
    background,
    pixels: Array.from({ length: width * height }, () => background),
  }
}

export function setPixels(document: PixelDocument, pixels: string[]): PixelDocument {
  const source = validateDocument(document)
  if (!Array.isArray(pixels) || pixels.length !== source.width * source.height) fail('INVALID_ARGUMENTS', `pixels must contain exactly ${source.width * source.height} colors`)
  return { ...source, pixels: pixels.map((color, index) => normalizeColor(color, `pixels[${index}]`)) }
}

export function setPixel(document: PixelDocument, x: number, y: number, color: string): PixelDocument {
  const source = validateDocument(document)
  const next = cloneDocument(source)
  next.pixels[indexFor(source, x, y)] = normalizeColor(color)
  return next
}

export function fillPixels(document: PixelDocument, x: number, y: number, color: string): PixelDocument {
  const source = validateDocument(document)
  const replacement = normalizeColor(color)
  const start = indexFor(source, x, y)
  const target = source.pixels[start]
  if (target === replacement) return cloneDocument(source)
  const pixels = [...source.pixels]
  const queue = [start]
  const seen = new Set<number>()
  while (queue.length > 0) {
    const index = queue.shift()!
    if (seen.has(index) || pixels[index] !== target) continue
    seen.add(index)
    pixels[index] = replacement
    const px = index % source.width
    const py = Math.floor(index / source.width)
    if (px > 0) queue.push(index - 1)
    if (px < source.width - 1) queue.push(index + 1)
    if (py > 0) queue.push(index - source.width)
    if (py < source.height - 1) queue.push(index + source.width)
  }
  return { ...source, pixels }
}

export function clearCanvas(document: PixelDocument, color?: string): PixelDocument {
  const source = validateDocument(document)
  const fill = color === undefined ? source.background : normalizeColor(color)
  return { ...source, background: fill, pixels: Array.from({ length: source.width * source.height }, () => fill) }
}

export function resizeDocument(document: PixelDocument, width: number, height: number, color?: string): PixelDocument {
  const source = validateDocument(document)
  const nextWidth = dimension(width, 'width')
  const nextHeight = dimension(height, 'height')
  if (nextWidth * nextHeight > MAX_PIXELS) fail('INVALID_ARGUMENTS', `canvas cannot exceed ${MAX_PIXELS} pixels`)
  const fill = color === undefined ? source.background : normalizeColor(color)
  const pixels = Array.from({ length: nextWidth * nextHeight }, () => fill)
  const copyWidth = Math.min(source.width, nextWidth)
  const copyHeight = Math.min(source.height, nextHeight)
  for (let y = 0; y < copyHeight; y += 1) {
    for (let x = 0; x < copyWidth; x += 1) pixels[y * nextWidth + x] = source.pixels[y * source.width + x]
  }
  return { ...source, width: nextWidth, height: nextHeight, background: fill, pixels }
}

export function setTitle(document: PixelDocument, title: string): PixelDocument {
  const source = validateDocument(document)
  if (typeof title !== 'string') fail('INVALID_ARGUMENTS', 'title must be a string')
  return { ...source, title: title.trim() || 'Untitled' }
}

export function createStudioState(): StudioState {
  return { document: null, past: [], future: [] }
}

function requireDocument(state: StudioState): PixelDocument {
  if (!state.document) fail('NO_DOCUMENT', 'create a document before using canvas tools')
  return state.document
}

function documentsEqual(left: PixelDocument, right: PixelDocument): boolean {
  return left.id === right.id && left.title === right.title && left.width === right.width && left.height === right.height && left.background === right.background && left.pixels.every((pixel, index) => pixel === right.pixels[index])
}

export function applyDocument(state: StudioState, document: PixelDocument): StudioState {
  const next = validateDocument(document)
  if (!state.document) return { document: next, past: [], future: [] }
  if (documentsEqual(state.document, next)) return state
  return { document: next, past: [...state.past.slice(-99), cloneDocument(state.document)], future: [] }
}

export function undo(state: StudioState): StudioState {
  const current = requireDocument(state)
  const previous = state.past.at(-1)
  if (!previous) return state
  return { document: cloneDocument(previous), past: state.past.slice(0, -1), future: [cloneDocument(current), ...state.future] }
}

export function redo(state: StudioState): StudioState {
  const current = requireDocument(state)
  const next = state.future[0]
  if (!next) return state
  return { document: cloneDocument(next), past: [...state.past, cloneDocument(current)], future: state.future.slice(1) }
}

export function documentSnapshot(state: StudioState): PixelDocument {
  return cloneDocument(requireDocument(state))
}

const emptySchema = { type: 'object', properties: {}, additionalProperties: false }

export const agentTools: ToolDefinition[] = [
  { name: 'tools.list', description: 'List the local Pixelpaper tools.', inputSchema: emptySchema },
  { name: 'studio.create', description: 'Create a new local pixel document.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, width: { type: 'integer', minimum: 1, maximum: MAX_DIMENSION }, height: { type: 'integer', minimum: 1, maximum: MAX_DIMENSION }, background: { type: 'string', pattern: '^#[0-9a-fA-F]{3,6}$' } }, additionalProperties: false } },
  { name: 'studio.get', description: 'Read the current local document.', inputSchema: emptySchema },
  { name: 'document.import', description: 'Load a previously exported Pixelpaper document.', inputSchema: { type: 'object', required: ['document'], properties: { document: { type: 'object' } }, additionalProperties: false } },
  { name: 'canvas.set_pixel', description: 'Set one pixel to a hex color.', inputSchema: { type: 'object', required: ['x', 'y', 'color'], properties: { x: { type: 'integer' }, y: { type: 'integer' }, color: { type: 'string' } }, additionalProperties: false } },
  { name: 'canvas.set_pixels', description: 'Replace every pixel in the current canvas.', inputSchema: { type: 'object', required: ['pixels'], properties: { pixels: { type: 'array', items: { type: 'string' } } }, additionalProperties: false } },
  { name: 'canvas.fill', description: 'Flood-fill one connected color region.', inputSchema: { type: 'object', required: ['x', 'y', 'color'], properties: { x: { type: 'integer' }, y: { type: 'integer' }, color: { type: 'string' } }, additionalProperties: false } },
  { name: 'canvas.clear', description: 'Fill the whole canvas with its background or a supplied color.', inputSchema: { type: 'object', properties: { color: { type: 'string' } }, additionalProperties: false } },
  { name: 'canvas.resize', description: 'Resize the canvas while keeping the top-left pixels.', inputSchema: { type: 'object', required: ['width', 'height'], properties: { width: { type: 'integer', minimum: 1, maximum: MAX_DIMENSION }, height: { type: 'integer', minimum: 1, maximum: MAX_DIMENSION }, color: { type: 'string' } }, additionalProperties: false } },
  { name: 'document.set_title', description: 'Set the document title.', inputSchema: { type: 'object', required: ['title'], properties: { title: { type: 'string' } }, additionalProperties: false } },
  { name: 'history.undo', description: 'Undo the latest document change.', inputSchema: emptySchema },
  { name: 'history.redo', description: 'Redo the latest undone document change.', inputSchema: emptySchema },
  { name: 'document.export', description: 'Return the current document as portable JSON data.', inputSchema: emptySchema },
]

export type ToolResult = { state: StudioState; result: unknown }

export function invokeTool(state: StudioState, name: string, rawArguments: unknown = {}): ToolResult {
  const args = assertObject(rawArguments)
  if (name === 'tools.list') return { state, result: { protocolVersion: AGENT_PROTOCOL_VERSION, tools: agentTools } }
  if (name === 'studio.create') {
    const document = createDocument({ id: args.id as string | undefined, title: args.title as string | undefined, width: args.width as number | undefined, height: args.height as number | undefined, background: args.background as string | undefined })
    return { state: { document, past: [], future: [] }, result: cloneDocument(document) }
  }
  if (name === 'studio.get') return { state, result: documentSnapshot(state) }
  if (name === 'document.import') {
    const document = validateDocument(args.document as PixelDocument)
    return { state: { document, past: [], future: [] }, result: cloneDocument(document) }
  }
  const current = requireDocument(state)
  if (name === 'canvas.set_pixel') {
    const next = setPixel(current, args.x as number, args.y as number, args.color as string)
    return { state: applyDocument(state, next), result: cloneDocument(next) }
  }
  if (name === 'canvas.set_pixels') {
    const next = setPixels(current, args.pixels as string[])
    return { state: applyDocument(state, next), result: cloneDocument(next) }
  }
  if (name === 'canvas.fill') {
    const next = fillPixels(current, args.x as number, args.y as number, args.color as string)
    return { state: applyDocument(state, next), result: cloneDocument(next) }
  }
  if (name === 'canvas.clear') {
    const next = clearCanvas(current, args.color as string | undefined)
    return { state: applyDocument(state, next), result: cloneDocument(next) }
  }
  if (name === 'canvas.resize') {
    const next = resizeDocument(current, args.width as number, args.height as number, args.color as string | undefined)
    return { state: applyDocument(state, next), result: cloneDocument(next) }
  }
  if (name === 'document.set_title') {
    const next = setTitle(current, args.title as string)
    return { state: applyDocument(state, next), result: cloneDocument(next) }
  }
  if (name === 'history.undo') {
    const next = undo(state)
    return { state: next, result: documentSnapshot(next) }
  }
  if (name === 'history.redo') {
    const next = redo(state)
    return { state: next, result: documentSnapshot(next) }
  }
  if (name === 'document.export') return { state, result: { format: 'pixelpaper-json', version: 1, document: documentSnapshot(state) } }
  fail('UNKNOWN_TOOL', `unknown tool: ${name}`)
}
