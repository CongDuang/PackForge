import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import type { JdkInstall } from '../../src/shared/types.ts'

export function resolveJdkHome(homePath: string, platform: NodeJS.Platform = process.platform): string | null {
  const trimmed = homePath.trim()
  if (!trimmed) return null
  const abs = path.resolve(trimmed)
  const javaName = platform === 'win32' ? 'java.exe' : 'java'
  const candidates = [abs, path.join(abs, 'Contents', 'Home')]
  for (const home of candidates) {
    const binary = path.join(home, 'bin', javaName)
    if (existsSync(binary) && statSync(binary).isFile()) return home
  }
  return null
}

export function parseJavaVersion(output: string): string {
  const quoted = /version\s+"([^"]+)"/i.exec(output)
  if (quoted?.[1]) return quoted[1]
  const openjdk = /openjdk\s+(\d+(?:\.\d+)*)/i.exec(output)
  if (openjdk?.[1]) return openjdk[1]
  return ''
}

export function javaBinaryForHome(homePath: string, platform: NodeJS.Platform = process.platform): string {
  return path.join(homePath, 'bin', platform === 'win32' ? 'java.exe' : 'java')
}

export function upsertJdkInstall(
  state: { installs: JdkInstall[]; defaultId: string | null },
  install: JdkInstall,
): { installs: JdkInstall[]; defaultId: string | null } {
  const installs = [
    ...state.installs.filter((item) => item.id !== install.id && item.homePath !== install.homePath),
    install,
  ]
  const defaultId =
    state.defaultId && installs.some((item) => item.id === state.defaultId) ? state.defaultId : install.id
  return { installs, defaultId }
}

export function afterRemoveJdk(
  state: { installs: JdkInstall[]; defaultId: string | null },
  id: string,
): { installs: JdkInstall[]; defaultId: string | null } {
  const installs = state.installs.filter((item) => item.id !== id)
  const defaultId = state.defaultId === id ? (installs[0]?.id ?? null) : state.defaultId
  return { installs, defaultId }
}
