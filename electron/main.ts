import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { registerIpcHandlers } from './ipc/register'

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL) || !app.isPackaged

function resolveWindowIcon(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath, 'icon.png'),
    path.join(__dirname, '../../resources/icon.png'),
  ]
  return candidates.find((item) => existsSync(item))
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '匠包 — 本地 Android 打包工作台',
    ...(resolveWindowIcon() ? { icon: resolveWindowIcon() } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[preload-error] ${preloadPath}`, error)
  })

  if (isDev) {
    const url = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
    void win.loadURL(url)
  } else {
    void win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

void app.whenReady().then(() => {
  registerIpcHandlers()
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
