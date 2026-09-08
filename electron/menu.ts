import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'
import { PRODUCT_NAME, PRODUCT_SLOGAN, PRIVACY_POINTS } from '../src/shared/about.ts'
import { EVENT_CHANNELS } from '../src/shared/channels.ts'
import { getRecentProjects } from './services/store.ts'

const APP_MENU_NAME = 'PackForge'

function focusedWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

function sendToRenderer(channel: string, ...args: unknown[]): void {
  const win = focusedWindow()
  if (!win) return
  win.webContents.send(channel, ...args)
}

function recentSubmenu(): MenuItemConstructorOptions[] {
  const recent = getRecentProjects()
  if (recent.length === 0) {
    return [{ label: '暂无最近项目', enabled: false }]
  }
  return recent.slice(0, 12).map((item) => ({
    label: item.pinned ? `★ ${item.displayName}` : item.displayName,
    toolTip: item.path,
    click: () => sendToRenderer(EVENT_CHANNELS.menuOpenRecent, item.path),
  }))
}

function buildTemplate(): MenuItemConstructorOptions[] {
  const isMac = process.platform === 'darwin'

  const fileMenu: MenuItemConstructorOptions = {
    label: '文件',
    submenu: [
      {
        label: '选择项目…',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendToRenderer(EVENT_CHANNELS.menuPickProject),
      },
      {
        label: '最近打开',
        submenu: recentSubmenu(),
      },
      ...(!isMac
        ? ([{ type: 'separator' }, { role: 'quit', label: '退出' }] as MenuItemConstructorOptions[])
        : []),
    ],
  }

  const editMenu: MenuItemConstructorOptions = {
    label: '编辑',
    submenu: [
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' },
      { role: 'selectAll', label: '全选' },
    ],
  }

  const windowMenu: MenuItemConstructorOptions = {
    label: '窗口',
    submenu: [
      { role: 'minimize', label: '最小化' },
      { role: 'zoom', label: '缩放' },
      ...(isMac
        ? ([{ type: 'separator' }, { role: 'front', label: '前置全部窗口' }] as MenuItemConstructorOptions[])
        : []),
    ],
  }

  const helpMenu: MenuItemConstructorOptions = {
    label: '帮助',
    submenu: [
      {
        label: '产品主页（本地应用，无出站遥测）',
        enabled: false,
      },
      {
        label: PRODUCT_SLOGAN,
        enabled: false,
      },
      { type: 'separator' },
      {
        // 不在菜单中展示；通过快捷键 / 设置页连点版本号打开
        label: '切换开发者工具',
        accelerator: 'CmdOrCtrl+Alt+Shift+D',
        visible: false,
        click: () => {
          const win = focusedWindow()
          win?.webContents.toggleDevTools()
        },
      },
    ],
  }

  if (isMac) {
    return [
      {
        label: APP_MENU_NAME,
        submenu: [
          { role: 'about', label: `关于 ${APP_MENU_NAME}` },
          { type: 'separator' },
          { role: 'services', label: '服务' },
          { type: 'separator' },
          { role: 'hide', label: `隐藏 ${APP_MENU_NAME}` },
          { role: 'hideOthers', label: '隐藏其他' },
          { role: 'unhide', label: '显示全部' },
          { type: 'separator' },
          { role: 'quit', label: `退出 ${APP_MENU_NAME}` },
        ],
      },
      fileMenu,
      editMenu,
      windowMenu,
      helpMenu,
    ]
  }

  return [fileMenu, editMenu, windowMenu, helpMenu]
}

export function configureAppIdentity(): void {
  app.setName(APP_MENU_NAME)
  app.setAboutPanelOptions({
    applicationName: PRODUCT_NAME,
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: PRODUCT_SLOGAN,
    credits: PRIVACY_POINTS.join('\n'),
  })
}

export function installApplicationMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildTemplate()))
}

export function rebuildApplicationMenu(): void {
  installApplicationMenu()
}
