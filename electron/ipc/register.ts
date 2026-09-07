import { ipcMain } from 'electron'
import { appError } from '../../src/shared/errors'
import { INVOKE_METHODS, invokeChannel, type InvokeMethod } from '../../src/shared/channels'
import { err, ok, type Result } from '../../src/shared/result'
import {
  getJdkState,
  getRecentProjects,
  getSettingsFromStore,
  getSigningProfiles,
  setSettingsInStore,
} from '../services/store'

function notImplemented(method: string): Result<never> {
  return err(appError('E_NOT_IMPLEMENTED', `尚未实现：${method}`, method))
}

type Handler = (...args: unknown[]) => Promise<Result<unknown>> | Result<unknown>

const handlers: Record<InvokeMethod, Handler> = {
  getSettings: () => ok(getSettingsFromStore()),
  setSettings: (partial) => ok(setSettingsInStore((partial ?? {}) as Parameters<typeof setSettingsInStore>[0])),
  pickDirectory: () => notImplemented('pickDirectory'),
  validateProject: () => notImplemented('validateProject'),
  listRecentProjects: () => ok(getRecentProjects()),
  openProject: () => notImplemented('openProject'),
  removeRecentProject: () => notImplemented('removeRecentProject'),
  pinRecentProject: () => notImplemented('pinRecentProject'),
  listModules: () => notImplemented('listModules'),
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
