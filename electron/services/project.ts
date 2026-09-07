import { accessSync, chmodSync, constants, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import type { ProjectRef, ProjectValidation } from '../../src/shared/types.ts'

export const MAX_RECENT_PROJECTS = 20

export type ValidateProjectOptions = {
  platform?: NodeJS.Platform
}

export function normalizePastedPath(raw: string): string {
  let value = raw.trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }
  return value
}

function isWindows(platform: NodeJS.Platform): boolean {
  return platform === 'win32'
}

function isExecutable(filePath: string): boolean {
  try {
    accessSync(filePath, constants.X_OK)
    return true
  } catch {
    return false
  }
}

export function validateProject(
  projectPath: string,
  options: ValidateProjectOptions = {},
): Result<ProjectValidation> {
  const platform = options.platform ?? process.platform
  const pasted = normalizePastedPath(projectPath)
  if (!pasted) {
    return err(appError('E_NO_SETTINGS', '请选择或粘贴 Android 工程目录'))
  }

  const abs = path.resolve(pasted)
  if (!existsSync(abs)) {
    return err(appError('E_NO_SETTINGS', '目录不存在', abs))
  }

  let stat
  try {
    stat = statSync(abs)
  } catch {
    return err(appError('E_NO_SETTINGS', '无法读取该目录', abs))
  }
  if (!stat.isDirectory()) {
    return err(appError('E_NO_SETTINGS', '路径不是文件夹', abs))
  }

  const settingsGradle = path.join(abs, 'settings.gradle')
  const settingsKts = path.join(abs, 'settings.gradle.kts')
  let settingsFile: ProjectValidation['settingsFile'] | null = null
  if (existsSync(settingsGradle) && statSync(settingsGradle).isFile()) {
    settingsFile = 'settings.gradle'
  } else if (existsSync(settingsKts) && statSync(settingsKts).isFile()) {
    settingsFile = 'settings.gradle.kts'
  }
  if (!settingsFile) {
    return err(appError('E_NO_SETTINGS', '目录不像 Gradle 工程', abs))
  }

  if (isWindows(platform)) {
    const bat = path.join(abs, 'gradlew.bat')
    if (!existsSync(bat) || !statSync(bat).isFile()) {
      return err(appError('E_NO_WRAPPER', '请选择含 Wrapper 的 Android 工程目录', abs))
    }
    return ok({
      path: abs,
      wrapperCommand: bat,
      wrapperKind: 'gradlew.bat',
      settingsFile,
    })
  }

  const unixWrapper = path.join(abs, 'gradlew')
  if (!existsSync(unixWrapper) || !statSync(unixWrapper).isFile()) {
    return err(appError('E_NO_WRAPPER', '请选择含 Wrapper 的 Android 工程目录', abs))
  }

  if (!isExecutable(unixWrapper)) {
    try {
      chmodSync(unixWrapper, 0o755)
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause)
      return err(appError('E_NO_WRAPPER', 'gradlew 没有执行权限，且无法自动 chmod +x', detail))
    }
    if (!isExecutable(unixWrapper)) {
      return err(appError('E_NO_WRAPPER', 'gradlew 没有执行权限，请检查文件权限', unixWrapper))
    }
  }

  return ok({
    path: abs,
    wrapperCommand: unixWrapper,
    wrapperKind: 'gradlew',
    settingsFile,
  })
}

export function sortRecentProjects(items: ProjectRef[]): ProjectRef[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.lastOpenedAt - a.lastOpenedAt
  })
}

export function upsertRecentProject(items: ProjectRef[], validation: ProjectValidation, now = Date.now()): ProjectRef[] {
  const existing = items.find((item) => item.path === validation.path)
  const next: ProjectRef = existing
    ? { ...existing, lastOpenedAt: now, displayName: path.basename(validation.path) }
    : {
        id: validation.path,
        path: validation.path,
        displayName: path.basename(validation.path),
        lastOpenedAt: now,
        pinned: false,
      }
  const others = items.filter((item) => item.path !== validation.path)
  return capRecentProjects(sortRecentProjects([next, ...others]), next.path)
}

function capRecentProjects(items: ProjectRef[], keepPath: string): ProjectRef[] {
  if (items.length <= MAX_RECENT_PROJECTS) return items
  const keep = items.filter((item) => item.path === keepPath)
  const rest = items.filter((item) => item.path !== keepPath)
  const pinned = rest.filter((item) => item.pinned)
  const unpinned = rest.filter((item) => !item.pinned)
  const budget = MAX_RECENT_PROJECTS - keep.length
  const pinnedTake = pinned.slice(0, budget)
  const unpinnedTake = unpinned.slice(0, budget - pinnedTake.length)
  return sortRecentProjects([...keep, ...pinnedTake, ...unpinnedTake])
}

export function pinRecentProjectInList(items: ProjectRef[], id: string, pinned: boolean): ProjectRef[] {
  return sortRecentProjects(items.map((item) => (item.id === id ? { ...item, pinned } : item)))
}

export function removeRecentProjectFromList(items: ProjectRef[], id: string): ProjectRef[] {
  return items.filter((item) => item.id !== id)
}
