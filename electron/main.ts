import { app, BrowserWindow } from 'electron'
import path from 'node:path'

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL) || !app.isPackaged

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '匠包 — 本地 Android 打包工作台',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    const url = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
    void win.loadURL(url)
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

void app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
