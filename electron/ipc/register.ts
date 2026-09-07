import { BrowserWindow, dialog, ipcMain } from 'electron'
import { appError } from '../../src/shared/errors'
import { INVOKE_METHODS, invokeChannel, type InvokeMethod } from '../../src/shared/channels'
import { err, ok, type Result } from '../../src/shared/result'
import { listModules } from '../services/modules'
import {
  pinRecentProjectInList,
  removeRecentProjectFromList,
  upsertRecentProject,
  validateProject,
} from '../services/project'
import {
  getJdkState,
  getRecentProjects,
  getSettingsFromStore,
  getSigningProfiles,
  setRecentProjects,
  setSettingsInStore,
} from '../services/store'

async function pickDirectory(): Promise<Result<string>> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const options = {
    title: '选择文件夹',
    properties: ['openDirectory' as const],
  }
  const picked = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  if (picked.canceled || picked.filePaths.length === 0) {
    return ok('')
  }
  return ok(picked.filePaths[0])
}

function notImplemented(method: string): Result<never> {
  return err(appError('E_NOT_IMPLEMENTED', `尚未实现：${method}`, method))
}

type Handler = (...args: unknown[]) => Promise<Result<unknown>> | Result<unknown>

const handlers: Record<InvokeMethod, Handler> = {
  getSettings: () => ok(getSettingsFromStore()),
  setSettings: (partial) => ok(setSettingsInStore((partial ?? {}) as Parameters<typeof setSettingsInStore>[0])),
  pickDirectory,
  validateProject: (projectPath) => validateProject(String(projectPath ?? '')),
  listRecentProjects: () => ok(getRecentProjects()),
  openProject: (projectPath) => {
    const validated = validateProject(String(projectPath ?? ''))
    if (!validated.ok) return validated
    setRecentProjects(upsertRecentProject(getRecentProjects(), validated.data))
    return validated
  },
  removeRecentProject: (id) => {
    setRecentProjects(removeRecentProjectFromList(getRecentProjects(), String(id ?? '')))
    return ok(undefined)
  },
  pinRecentProject: (id, pinned) => {
    setRecentProjects(pinRecentProjectInList(getRecentProjects(), String(id ?? ''), Boolean(pinned)))
    return ok(undefined)
  },
  listModules: (projectPath) => listModules(String(projectPath ?? '')),
  discoverVariants: () => notImplemented('discoverVariants'),
  previewTaskName: () => notImplemented('previewTaskName'),
  listJdks: () => ok(getJdkState()),
  importJdk: () => notImplemented('importJdk'),
  removeJdk: () => notImplemented('removeJdk'),
  setDefaultJdk: () => notImplemented('setDefaultJdk'),
  listSigningProfiles: () => ok(getSigningProfiles()),
  upsertSigningProfile: () => notImplemented('upsertSigningProfile'),
  deleteSigningProfile: () => notImplemented('deleteSigningProfile'),
  resolveBuildEnv: () => notImplemented('resolveBuildEnv'),
  startBuild: () => notImplemented('startBuild'),
  cancelBuild: () => notImplemented('cancelBuild'),
  scanArtifacts: () => notImplemented('scanArtifacts'),
  copyArtifactsToFolder: () => notImplemented('copyArtifactsToFolder'),
  copyPathsToClipboard: () => notImplemented('copyPathsToClipboard'),
  writeFilesToClipboard: () => notImplemented('writeFilesToClipboard'),
  showItemInFolder: () => notImplemented('showItemInFolder'),
}

export function registerIpcHandlers(): void {
  for (const method of INVOKE_METHODS) {
    ipcMain.handle(invokeChannel(method), async (_event, ...args: unknown[]) => {
      return handlers[method](...args)
    })
  }
}
