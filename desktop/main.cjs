const { app, BrowserWindow, shell } = require('electron')
const { spawn } = require('node:child_process')
const net = require('node:net')
const path = require('node:path')

let child
let port

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const chosen = server.address().port
      server.close(() => resolve(chosen))
    })
  })
}

async function waitForServer(url, timeout = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try { if ((await fetch(`${url}/api/health`)).ok) return true } catch { /* startup */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('The local Wallpapers service did not start.')
}

async function start() {
  port = await freePort()
  const serverPath = path.join(app.getAppPath(), 'server', 'index.mjs')
  child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', HOST: '127.0.0.1', PORT: String(port), DATA_DIR: path.join(app.getPath('userData'), 'data') },
    stdio: 'ignore',
  })
  await waitForServer(`http://127.0.0.1:${port}`)
  const window = new BrowserWindow({ width: 1440, height: 940, minWidth: 900, minHeight: 650, backgroundColor: '#19434c', title: 'Wallpapers', webPreferences: { contextIsolation: true, sandbox: true } })
  window.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('http')) shell.openExternal(url); return { action: 'deny' } })
  await window.loadURL(`http://127.0.0.1:${port}`)
}

app.whenReady().then(start).catch((error) => { console.error(error); app.quit() })
app.on('window-all-closed', () => { if (child && !child.killed) child.kill(); app.quit() })
app.on('before-quit', () => { if (child && !child.killed) child.kill() })
