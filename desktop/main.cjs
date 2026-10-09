const { app, BrowserWindow, shell } = require('electron')
const { spawn } = require('node:child_process')
const net = require('node:net')
const fs = require('node:fs')
const path = require('node:path')
let child
let port
function freePort() { return new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const chosen = server.address().port; server.close(() => resolve(chosen)) }) }) }
async function waitForServer(url, timeout = 30000) { const start = Date.now(); while (Date.now() - start < timeout) { try { if ((await fetch(`${url}/api/health`)).ok) return true } catch {} await new Promise((resolve) => setTimeout(resolve, 250)) } throw new Error('The local Pixelpaper service did not start.') }
async function start() {
  port = await freePort()
  const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'index.mjs')
  const serverPath = app.isPackaged && fs.existsSync(unpacked) ? unpacked : path.join(app.getAppPath(), 'server', 'index.mjs')
  child = spawn(process.execPath, [serverPath], { env: { ELECTRON_RUN_AS_NODE: '1', PATH: process.env.PATH, HOST: '127.0.0.1', PORT: String(port), DATA_DIR: path.join(app.getPath('userData'), 'data') }, stdio: 'ignore' })
  await waitForServer(`http://127.0.0.1:${port}`)
  const window = new BrowserWindow({ width: 1440, height: 940, minWidth: 900, minHeight: 650, backgroundColor: '#254d52', title: 'Pixelpaper', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } })
  window.webContents.setWindowOpenHandler(({ url }) => { if (url === 'https://aihorde.net/' || url.startsWith('https://github.com/samhcus/wallpapers')) shell.openExternal(url); return { action: 'deny' } })
  window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(`http://127.0.0.1:${port}/`)) event.preventDefault() })
  await window.loadURL(`http://127.0.0.1:${port}`)
}
app.whenReady().then(start).catch((error) => { console.error(error); app.quit() })
app.on('window-all-closed', () => { if (child && !child.killed) child.kill(); app.quit() })
app.on('before-quit', () => { if (child && !child.killed) child.kill() })
