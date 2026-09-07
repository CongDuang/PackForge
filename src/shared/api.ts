import type { Result } from './result'
import type {
  AppSettings,
  ArtifactItem,
  BuildKind,
  BuildLogEvent,
  BuildRequest,
  BuildStatusEvent,
  JdkInstall,
  ProjectRef,
  ProjectValidation,
  SigningProfileMeta,
  VariantDiscovery,
} from './types'

export type SigningProfileInput = {
  id?: string
  name: string
  storeFile: string
  keyAlias: string
  storeType?: string
  storePassword: string
  keyPassword: string
  keyPasswordSameAsStore: boolean
}

export type ScanArtifactsInput = {
  projectPath: string
  module: string
  flavorPart: string
  buildType: string
  kind: BuildKind
  showAllModuleArtifacts?: boolean
}

/**
 * 渲染进程唯一能力入口：`window.packforge`。
 * 约定：invoke 一律返回 Result；事件 API 返回取消订阅函数。
 */
export type PackforgeApi = {
  getSettings: () => Promise<Result<AppSettings>>
  setSettings: (partial: Partial<AppSettings>) => Promise<Result<AppSettings>>
  pickDirectory: () => Promise<Result<string>>
  pickFile: () => Promise<Result<string>>
  validateProject: (projectPath: string) => Promise<Result<ProjectValidation>>
  listRecentProjects: () => Promise<Result<ProjectRef[]>>
  openProject: (projectPath: string) => Promise<Result<ProjectValidation>>
  removeRecentProject: (id: string) => Promise<Result<void>>
  pinRecentProject: (id: string, pinned: boolean) => Promise<Result<void>>
  listModules: (
    projectPath: string,
  ) => Promise<Result<{ modules: string[]; defaultModule: string; parseWarning?: string }>>
  discoverVariants: (
    projectPath: string,
    module: string,
  ) => Promise<Result<VariantDiscovery>>
  previewTaskName: (
    req: Pick<BuildRequest, 'module' | 'kind' | 'flavorPart' | 'buildType'>,
  ) => Promise<Result<{ taskName: string }>>
  listJdks: () => Promise<Result<{ installs: JdkInstall[]; defaultId: string | null }>>
  importJdk: (homePath: string) => Promise<Result<JdkInstall>>
  removeJdk: (id: string) => Promise<Result<void>>
  setDefaultJdk: (id: string | null) => Promise<Result<void>>
  listSigningProfiles: () => Promise<Result<SigningProfileMeta[]>>
  upsertSigningProfile: (input: SigningProfileInput) => Promise<Result<SigningProfileMeta>>
  deleteSigningProfile: (id: string) => Promise<Result<void>>
  buildSigningInjectArgs: (
    profileId: string | null,
  ) => Promise<Result<{ args: string[]; previewArgs: string[] }>>
  resolveBuildEnv: (input: {
    projectPath: string
    jdkId: string | null
  }) => Promise<
    Result<{
      env: Record<string, string>
      javaHome: string
      androidHome: string
      diagnosis: string[]
    }>
  >
  startBuild: (request: BuildRequest) => Promise<Result<{ buildId: string }>>
  cancelBuild: (buildId: string) => Promise<Result<void>>
  onBuildLog: (cb: (e: BuildLogEvent) => void) => () => void
  onBuildStatus: (cb: (e: BuildStatusEvent) => void) => () => void
  scanArtifacts: (input: ScanArtifactsInput) => Promise<Result<{ items: ArtifactItem[] }>>
  copyArtifactsToFolder: (
    paths: string[],
    targetDir: string,
  ) => Promise<Result<{ copied: string[] }>>
  copyPathsToClipboard: (paths: string[]) => Promise<Result<void>>
  writeFilesToClipboard: (paths: string[]) => Promise<Result<void>>
  showItemInFolder: (path: string) => Promise<Result<void>>
}
