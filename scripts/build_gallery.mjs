import { readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
const root = fileURLToPath(new URL('../', import.meta.url))
const categories = { 'pixel-art': 'Pixel art', 'space': 'Space', 'ascii-art': 'ASCII art', 'ai-generated': 'AI generated' }
await mkdir(path.join(root, 'public/thumbnails'), { recursive: true })
await mkdir(path.join(root, 'public/icons'), { recursive: true })
await mkdir(path.join(root, 'src/data'), { recursive: true })
const gallery = []
for (const [folder, category] of Object.entries(categories)) {
  for (const file of (await readdir(path.join(root, folder))).sort()) {
    if (!/\.(png|jpe?g|webp|gif)$/i.test(file)) continue
    const id = `${folder}-${file.replace(/\.[^.]+$/, '')}`
    const input = path.join(root, folder, file)
    const metadata = await sharp(input).metadata()
    const thumbnail = `/thumbnails/${id}.webp`
    await sharp(input).resize(600, 750, { fit: 'cover' }).webp({ quality: 83 }).toFile(path.join(root, 'public', thumbnail))
    const subject = file.replace(/\.[^.]+$/, '').replace(/-\d+$/, '').replace(/^(blue|green|teal|purple|dark|navy|amber|rose|red|mono|multi|neon|nqita)-/, '')
    const title = subject.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    gallery.push({ id, title, category, src: `/wallpapers/${folder}/${file}`, thumbnail, width: metadata.width, height: metadata.height })
  }
}
const featured = ['teal-ancient-treehouse','blue-japan-shopfront','green-capybara','purple-moon','teal-planet-orbit','blue-cat-pool','amber-sunset','rose-tokyo','blue-seattle','green-waterfall']
const rank = item => { const index = featured.findIndex(name => item.id.includes(name)); return index < 0 ? 100 : index }
gallery.sort((a,b) => rank(a)-rank(b))
await writeFile(path.join(root, 'src/data/gallery.json'), JSON.stringify(gallery, null, 2) + '\n')
const iconSource = path.join(root, 'pixel-art/teal-ancient-treehouse-01.png')
await sharp(iconSource).resize(192, 192, { fit: 'cover' }).png().toFile(path.join(root, 'public/icons/icon-192.png'))
await sharp(iconSource).resize(512, 512, { fit: 'cover' }).png().toFile(path.join(root, 'public/icons/icon-512.png'))
console.log(`Prepared ${gallery.length} wallpapers and optimized thumbnails.`)
