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
  ProjectSigningBinding,
  ProjectValidation,
  VariantDiscovery,
} from './types'

export type ProjectSigningInput = {
  inject: boolean
  storeFile?: string
  keyAlias?: string
  storeType?: string
  storePassword?: string
  keyPassword?: string
  keyPasswordSameAsStore?: boolean
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
  getProjectSigning: (projectPath: string) => Promise<Result<ProjectSigningBinding | null>>
  upsertProjectSigning: (
    projectPath: string,
    input: ProjectSigningInput,
  ) => Promise<Result<ProjectSigningBinding>>
  clearProjectSigning: (projectPath: string) => Promise<Result<void>>
  buildSigningInjectArgs: (
    projectPath: string,
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
  onMenuPickProject: (cb: () => void) => () => void
  onMenuOpenRecent: (cb: (projectPath: string) => void) => () => void
  scanArtifacts: (input: ScanArtifactsInput) => Promise<Result<{ items: ArtifactItem[] }>>
  copyArtifactsToFolder: (
    paths: string[],
    targetDir: string,
  ) => Promise<Result<{ copied: string[] }>>
  showItemInFolder: (path: string) => Promise<Result<void>>
  /** 切换开发者工具（特殊触发；dev / 正式包均可用） */
  toggleDevTools: () => Promise<Result<void>>
}
