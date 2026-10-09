const { app, BrowserWindow } = require('electron')
const path = require('node:path')

async function start() {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#f7eddf',
    title: 'Pixelpaper',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  await window.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
}
app.whenReady().then(start).catch((error) => { console.error(error); app.quit() })
app.on('window-all-closed', () => app.quit())
