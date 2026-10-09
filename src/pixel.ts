export type PixelDimensions = { width: number; height: number }

export const canvasSizes = {
  desktop: { width: 128, height: 72, label: 'Desktop', detail: '16:9 · 128 × 72' },
  phone: { width: 72, height: 128, label: 'Phone', detail: '9:16 · 72 × 128' },
  square: { width: 96, height: 96, label: 'Square', detail: '1:1 · 96 × 96' },
} as const
export type CanvasSize = keyof typeof canvasSizes

export const palettes = {
  peach: { label: 'Peach room', colors: ['#193c43', '#2f6468', '#6f9690', '#d4ddc0', '#fff0d5', '#f6c773', '#ef9a7b', '#c95f5a', '#854d67', '#303650'] },
  dusk: { label: 'Blue hour', colors: ['#111b31', '#1b3150', '#315c72', '#5b8c96', '#aec8bd', '#f3d18b', '#e69b76', '#b65a62', '#714766', '#352f55'] },
  moss: { label: 'Moss light', colors: ['#182f2a', '#315447', '#55775c', '#8eaa78', '#c8d39c', '#f0d99d', '#d79069', '#a9554b', '#664458', '#263946'] },
  mono: { label: 'Ink & paper', colors: ['#1c2025', '#303943', '#46545b', '#67777a', '#9eaaa0', '#d4d2bb', '#eee3c9', '#bc8f7a', '#785e68', '#4e4657'] },
} as const
export type PaletteName = keyof typeof palettes

export function blankPixels(width: number, height: number, color: string) {
  return Array.from({ length: width * height }, () => color)
}

function hexRgb(hex: string) { const value = hex.slice(1); return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)] as const }
function distance(a: readonly number[], b: readonly number[]) { return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 }

function medianCut(samples: number[][], count: number) {
  let boxes = [samples]
  while (boxes.length < count) {
    const index = boxes.reduce((winner, box, current) => {
      const ranges = [0, 1, 2].map((channel) => Math.max(...box.map((sample) => sample[channel])) - Math.min(...box.map((sample) => sample[channel])))
      const score = Math.max(...ranges) * Math.log2(box.length + 1)
      const previous = boxes[winner]; const previousRanges = [0, 1, 2].map((channel) => Math.max(...previous.map((sample) => sample[channel])) - Math.min(...previous.map((sample) => sample[channel])))
      return score > Math.max(...previousRanges) * Math.log2(previous.length + 1) ? current : winner
    }, 0)
    const box = boxes[index]
    if (box.length < 2) break
    const ranges = [0, 1, 2].map((channel) => Math.max(...box.map((sample) => sample[channel])) - Math.min(...box.map((sample) => sample[channel])))
    const channel = ranges.indexOf(Math.max(...ranges))
    box.sort((a, b) => a[channel] - b[channel])
    const midpoint = Math.floor(box.length / 2)
    boxes = [...boxes.slice(0, index), box.slice(0, midpoint), box.slice(midpoint), ...boxes.slice(index + 1)]
  }
  return boxes.map((box) => box.reduce((sum, sample) => [sum[0] + sample[0], sum[1] + sample[1], sum[2] + sample[2]], [0, 0, 0]).map((channel) => Math.round(channel / box.length)))
}

export async function pixelateImage(source: string, dimensions: PixelDimensions, paletteName: PaletteName, colorCount = 10, quantizePhoto = false): Promise<string[]> {
  const image = new Image()
  image.src = source
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('That file could not be read as an image.')) })
  const canvas = document.createElement('canvas'); canvas.width = dimensions.width; canvas.height = dimensions.height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.imageSmoothingEnabled = false
  const scale = Math.max(dimensions.width / image.naturalWidth, dimensions.height / image.naturalHeight)
  const width = image.naturalWidth * scale; const height = image.naturalHeight * scale
  context.drawImage(image, (dimensions.width - width) / 2, (dimensions.height - height) / 2, width, height)
  const data = context.getImageData(0, 0, dimensions.width, dimensions.height).data
  const samples: number[][] = []
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 8) samples.push([data[i], data[i + 1], data[i + 2]])
  const fixed = palettes[paletteName].colors.map(hexRgb)
  const paletteRgb = quantizePhoto && samples.length ? medianCut(samples, colorCount) : fixed
  return Array.from({ length: dimensions.width * dimensions.height }, (_, index) => {
    const color = [data[index * 4], data[index * 4 + 1], data[index * 4 + 2]]
    let best = 0; let bestDistance = Number.POSITIVE_INFINITY
    paletteRgb.forEach((candidate, candidateIndex) => { const next = distance(color, candidate); if (next < bestDistance) { best = candidateIndex; bestDistance = next } })
    const rgb = paletteRgb[best]
    return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
  })
}

export function canvasToDataUrl(pixels: string[], dimensions: PixelDimensions, scale = 1) {
  const canvas = document.createElement('canvas'); canvas.width = dimensions.width * scale; canvas.height = dimensions.height * scale
  const context = canvas.getContext('2d')!; pixels.forEach((fill, index) => { context.fillStyle = fill; context.fillRect((index % dimensions.width) * scale, Math.floor(index / dimensions.width) * scale, scale, scale) })
  return canvas.toDataURL('image/png')
}
