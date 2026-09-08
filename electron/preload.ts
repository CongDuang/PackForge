import { contextBridge, ipcRenderer } from 'electron'
import type { PackforgeApi } from '../src/shared/api'
import { EVENT_CHANNELS, INVOKE_METHODS, invokeChannel } from '../src/shared/channels'
import type { Result } from '../src/shared/result'

function invoke<T>(method: (typeof INVOKE_METHODS)[number], ...args: unknown[]): Promise<Result<T>> {
  return ipcRenderer.invoke(invokeChannel(method), ...args) as Promise<Result<T>>
}

const api: PackforgeApi = {
  getSettings: () => invoke('getSettings'),
  setSettings: (partial) => invoke('setSettings', partial),
  pickDirectory: () => invoke('pickDirectory'),
  pickFile: () => invoke('pickFile'),
  validateProject: (projectPath) => invoke('validateProject', projectPath),
  listRecentProjects: () => invoke('listRecentProjects'),
  openProject: (projectPath) => invoke('openProject', projectPath),
  removeRecentProject: (id) => invoke('removeRecentProject', id),
  pinRecentProject: (id, pinned) => invoke('pinRecentProject', id, pinned),
  listModules: (projectPath) => invoke('listModules', projectPath),
  discoverVariants: (projectPath, module, jdkId) => invoke('discoverVariants', projectPath, module, jdkId),
  previewTaskName: (req) => invoke('previewTaskName', req),
  listJdks: () => invoke('listJdks'),
  importJdk: (homePath) => invoke('importJdk', homePath),
  removeJdk: (id) => invoke('removeJdk', id),
  setDefaultJdk: (id) => invoke('setDefaultJdk', id),
  getProjectSigning: (projectPath) => invoke('getProjectSigning', projectPath),
  upsertProjectSigning: (projectPath, input) => invoke('upsertProjectSigning', projectPath, input),
  clearProjectSigning: (projectPath) => invoke('clearProjectSigning', projectPath),
  buildSigningInjectArgs: (projectPath) => invoke('buildSigningInjectArgs', projectPath),
  resolveBuildEnv: (input) => invoke('resolveBuildEnv', input),
  startBuild: (request) => invoke('startBuild', request),
  cancelBuild: (buildId) => invoke('cancelBuild', buildId),
  onBuildLog: (cb) => {
    const listener = (_event: unknown, payload: Parameters<typeof cb>[0]) => cb(payload)
    ipcRenderer.on(EVENT_CHANNELS.buildLog, listener)
    return () => {
      ipcRenderer.removeListener(EVENT_CHANNELS.buildLog, listener)
    }
  },
  onBuildStatus: (cb) => {
    const listener = (_event: unknown, payload: Parameters<typeof cb>[0]) => cb(payload)
    ipcRenderer.on(EVENT_CHANNELS.buildStatus, listener)
    return () => {
      ipcRenderer.removeListener(EVENT_CHANNELS.buildStatus, listener)
    }
  },
  onMenuPickProject: (cb) => {
    const listener = () => cb()
    ipcRenderer.on(EVENT_CHANNELS.menuPickProject, listener)
    return () => {
      ipcRenderer.removeListener(EVENT_CHANNELS.menuPickProject, listener)
    }
  },
  onMenuOpenRecent: (cb) => {
    const listener = (_event: unknown, projectPath: string) => cb(String(projectPath ?? ''))
    ipcRenderer.on(EVENT_CHANNELS.menuOpenRecent, listener)
    return () => {
      ipcRenderer.removeListener(EVENT_CHANNELS.menuOpenRecent, listener)
    }
  },
  scanArtifacts: (input) => invoke('scanArtifacts', input),
  copyArtifactsToFolder: (paths, targetDir) => invoke('copyArtifactsToFolder', paths, targetDir),
  showItemInFolder: (path) => invoke('showItemInFolder', path),
  toggleDevTools: () => invoke('toggleDevTools'),
}

contextBridge.exposeInMainWorld('packforge', api)
