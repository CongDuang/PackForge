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
  storeFile: string
  keyAlias: string
  storeType?: string
  keyPasswordSameAsStore: boolean
}

/** 一工程路径一条绑定；inject=false 时 profile 为 null。 */
export type ProjectSigningBinding = {
  projectPath: string
  inject: boolean
  profile: SigningProfileMeta | null
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
  /** 勾选后同一 Wrapper 调用先执行 clean */
  cleanBeforeBuild: boolean
}

export type ArtifactItem = {
  path: string
  type: 'apk' | 'aab' | 'mapping'
  size: number
  mtime: number
  buildId?: string
}

export type ThemePreference = 'system' | 'light' | 'dark'

export type AppSettings = {
  androidSdkPath: string
  allowSystemJdkFallback: boolean
  advancedGradleArgs: string
  /** 外观：浅色 / 深色 / 跟随系统 */
  theme: ThemePreference
  /** 动态发现变体（gradlew tasks）的超时，秒 */
  variantDiscoverTimeoutSec: number
}

export const VARIANT_DISCOVER_TIMEOUT_DEFAULT_SEC = 30
export const VARIANT_DISCOVER_TIMEOUT_MIN_SEC = 5
export const VARIANT_DISCOVER_TIMEOUT_MAX_SEC = 300

/** 非法或空值回到 30 秒；过小夹到 5，过大夹到 300。 */
export function clampVariantDiscoverTimeoutSec(value: unknown): number {
  const text = typeof value === 'number' ? String(value) : String(value ?? '').trim()
  if (!text) return VARIANT_DISCOVER_TIMEOUT_DEFAULT_SEC
  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return VARIANT_DISCOVER_TIMEOUT_DEFAULT_SEC
  const sec = Math.round(parsed)
  if (sec < VARIANT_DISCOVER_TIMEOUT_MIN_SEC) return VARIANT_DISCOVER_TIMEOUT_MIN_SEC
  if (sec > VARIANT_DISCOVER_TIMEOUT_MAX_SEC) return VARIANT_DISCOVER_TIMEOUT_MAX_SEC
  return sec
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
  theme: 'system',
  variantDiscoverTimeoutSec: VARIANT_DISCOVER_TIMEOUT_DEFAULT_SEC,
}
