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
import { discoverVariants, isBuildKind, previewTaskName } from '../services/variants'
import { importJdk, listJdks, removeJdk, setDefaultJdk } from '../services/jdk'
import {
  buildSigningInjectArgs,
  clearProjectSigning,
  getProjectSigning,
  parseProjectSigningInput,
  upsertProjectSigning,
} from '../services/signing'
import { resolveBuildEnv } from '../services/env'
import { cancelBuild, startBuild } from '../services/buildRunner'
import {
  copyArtifactsToFolder,
  parseScanArtifactsInput,
  scanArtifacts,
} from '../services/artifacts'
import {
  showItemInFolder,
} from '../services/clipboardFiles'
import {
  getJdkState,
  getRecentProjects,
  getSettingsFromStore,
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

async function pickFile(): Promise<Result<string>> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const options = {
    title: '选择 keystore 文件',
    properties: ['openFile' as const],
    filters: [
      { name: 'Keystore', extensions: ['jks', 'keystore', 'p12', 'pfx'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  }
  const picked = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  if (picked.canceled || picked.filePaths.length === 0) {
    return ok('')
  }
  return ok(picked.filePaths[0])
}

type Handler = (...args: unknown[]) => Promise<Result<unknown>> | Result<unknown>

const handlers: Record<InvokeMethod, Handler> = {
  getSettings: () => ok(getSettingsFromStore()),
  setSettings: (partial) => ok(setSettingsInStore((partial ?? {}) as Parameters<typeof setSettingsInStore>[0])),
  pickDirectory,
  pickFile,
  validateProject: (projectPath) => validateProject(String(projectPath ?? '')),
  listRecentProjects: () => ok(getRecentProjects()),
  openProject: (projectPath) => {
    const validated = validateProject(String(projectPath ?? ''))
    if (!validated.ok) return validated
    setRecentProjects(upsertRecentProject(getRecentProjects(), validated.data))
    // 延迟导入避免循环依赖
    void import('../menu').then((m) => m.rebuildApplicationMenu())
    return validated
  },
  removeRecentProject: (id) => {
    setRecentProjects(removeRecentProjectFromList(getRecentProjects(), String(id ?? '')))
    void import('../menu').then((m) => m.rebuildApplicationMenu())
    return ok(undefined)
  },
  pinRecentProject: (id, pinned) => {
    setRecentProjects(pinRecentProjectInList(getRecentProjects(), String(id ?? ''), Boolean(pinned)))
    void import('../menu').then((m) => m.rebuildApplicationMenu())
    return ok(undefined)
  },
  listModules: (projectPath) => listModules(String(projectPath ?? '')),
  discoverVariants: (projectPath, module, jdkId) =>
    discoverVariants(
      String(projectPath ?? ''),
      String(module ?? ''),
      jdkId == null || jdkId === '' ? null : String(jdkId),
    ),
  previewTaskName: (req) => {
    const body = (req ?? {}) as Record<string, unknown>
    return previewTaskName({
      module: String(body.module ?? ''),
      kind: isBuildKind(body.kind) ? body.kind : 'assemble',
      flavorPart: String(body.flavorPart ?? ''),
      buildType: String(body.buildType ?? 'Release'),
    })
  },
  listJdks: () => listJdks(),
  importJdk: (homePath) => importJdk(String(homePath ?? '')),
  removeJdk: (id) => removeJdk(String(id ?? '')),
  setDefaultJdk: (id) => setDefaultJdk(id == null || id === '' ? null : String(id)),
  getProjectSigning: (projectPath) => getProjectSigning(String(projectPath ?? '')),
  upsertProjectSigning: (projectPath, input) =>
    upsertProjectSigning(String(projectPath ?? ''), parseProjectSigningInput(input)),
  clearProjectSigning: (projectPath) => clearProjectSigning(String(projectPath ?? '')),
  buildSigningInjectArgs: (projectPath) => buildSigningInjectArgs(String(projectPath ?? '')),
  resolveBuildEnv: (input) => {
    const body = (input ?? {}) as { projectPath?: unknown; jdkId?: unknown }
    const jdkRaw = body.jdkId
    const jdkId = jdkRaw == null || jdkRaw === '' ? null : String(jdkRaw)
    const settings = getSettingsFromStore()
    const jdkState = getJdkState()
    return resolveBuildEnv(
      {
        projectPath: String(body.projectPath ?? ''),
        jdkId,
      },
      {
        settingsAndroidSdkPath: settings.androidSdkPath,
        allowSystemJdkFallback: settings.allowSystemJdkFallback,
        jdkInstalls: jdkState.installs,
      },
    )
  },
  startBuild: (request) => startBuild(request),
  cancelBuild: (buildId) => cancelBuild(buildId),
  scanArtifacts: (input) => {
    const parsed = parseScanArtifactsInput(input)
    if (!parsed) return err(appError('E_ARTIFACT_NONE', '产物扫描参数不完整'))
    return scanArtifacts(parsed)
  },
  copyArtifactsToFolder: (paths, targetDir) =>
    copyArtifactsToFolder(
      Array.isArray(paths) ? paths.map((item) => String(item)) : [],
      String(targetDir ?? ''),
    ),
  showItemInFolder: (filePath) => showItemInFolder(String(filePath ?? '')),
  toggleDevTools: () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return err(appError('E_COPY_FAILED', '没有可调试的窗口'))
    win.webContents.toggleDevTools()
    return ok(undefined)
  },
}

export function registerIpcHandlers(): void {
  for (const method of INVOKE_METHODS) {
    ipcMain.handle(invokeChannel(method), async (_event, ...args: unknown[]) => {
      return handlers[method](...args)
    })
  }
}
