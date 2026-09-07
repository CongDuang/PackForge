export type ProjectRef = {
  id: string
  path: string
  displayName: string
  lastOpenedAt: number
  pinned: boolean
}

export type JdkInstall = {
  id: string
  name: string
  version: string
  homePath: string
  source: 'import' | 'scan'
}

export type SigningProfileMeta = {
  id: string
  name: string
  storeFile: string
  keyAlias: string
  storeType?: string
  keyPasswordSameAsStore: boolean
}

export type BuildKind = 'assemble' | 'bundle'

export type BuildRequest = {
  projectPath: string
  module: string
  kind: BuildKind
  flavorPart: string
  buildType: string
  jdkId: string
  signingProfileId: string | null
  extraArgs: string[]
}

export type ArtifactItem = {
  path: string
  type: 'apk' | 'aab' | 'mapping' | 'other'
  size: number
  mtime: number
  buildId?: string
}

export type AppSettings = {
  androidSdkPath: string
  allowSystemJdkFallback: boolean
  advancedGradleArgs: string
}

export type ProjectValidation = {
  path: string
  wrapperCommand: string
  wrapperKind: 'gradlew' | 'gradlew.bat'
  settingsFile: 'settings.gradle' | 'settings.gradle.kts'
}

export type VariantDiscovery = {
  source: 'tasks' | 'static'
  buildTypes: string[]
  flavorDimensions: { name: string; flavors: string[] }[]
  assembleTasks: string[]
  bundleTasks: string[]
  warning?: string
}

export type BuildLogEvent = {
  buildId: string
  line: string
  stream: 'stdout' | 'stderr'
}

export type BuildStatusEvent = {
  buildId: string
  status: 'running' | 'succeeded' | 'failed' | 'cancelled'
  exitCode?: number
  error?: import('./errors').AppError
  taskName: string
}

export const KEYTAR_SERVICE = 'PackForge'

export function keytarAccount(profileId: string, kind: 'store' | 'key'): string {
  return `signing:${profileId}:${kind}`
}

export const DEFAULT_SETTINGS: AppSettings = {
  androidSdkPath: '',
  allowSystemJdkFallback: false,
  advancedGradleArgs: '',
}
