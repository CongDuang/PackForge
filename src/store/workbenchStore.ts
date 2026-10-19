import { create } from 'zustand'
import type { LogLine } from '../components/BuildLogPanel'
import type {
  ArtifactItem,
  BuildKind,
  BuildStatusEvent,
  JdkInstall,
  ProjectSigningBinding,
  ProjectValidation,
  VariantDiscovery,
} from '../shared/types'

type BuildUiStatus = BuildStatusEvent['status'] | 'idle'

export const DEFAULT_LOG_HEIGHT = 192
const CLEAN_BEFORE_BUILD_KEY = 'packforge.cleanBeforeBuild'

function readCleanBeforeBuild(): boolean {
  try {
    const raw = localStorage.getItem(CLEAN_BEFORE_BUILD_KEY)
    if (raw === '0') return false
    return true
  } catch {
    return true
  }
}

function writeCleanBeforeBuild(next: boolean): void {
  try {
    localStorage.setItem(CLEAN_BEFORE_BUILD_KEY, next ? '1' : '0')
  } catch {
    // ignore
  }
}

type WorkbenchState = {
  project: ProjectValidation | null
  module: string
  kind: BuildKind
  buildType: string
  flavorSelections: Record<string, string>
  jdkId: string
  jdkInstalls: JdkInstall[]
  jdkDefaultId: string | null
  jdkByProject: Record<string, string>
  jdkReady: boolean
  projectSigning: ProjectSigningBinding | null
  signingEditorOpen: boolean
  discovery: VariantDiscovery | null
  modules: string[]
  parseWarning?: string
  variantLoading: boolean
  variantError?: string
  jdkError?: string
  taskNamePreview: string
  buildId: string | null
  buildStatus: BuildUiStatus
  logLines: LogLine[]
  logExpanded: boolean
  logHeight: number
  artifacts: ArtifactItem[]
  artifactsExpanded: boolean
  selectedArtifactPaths: string[]
  showAllArtifacts: boolean
  cleanBeforeBuild: boolean
  lastError: string | null
  banner: string | null
  artifactNotice?: string
  /** 打开设置并滚到该元素 id */
  settingsAnchor: string | null
  setProject: (project: ProjectValidation | null) => void
  setModule: (module: string) => void
  setKind: (kind: BuildKind) => void
  setBuildType: (buildType: string) => void
  setFlavor: (dimension: string, flavor: string) => void
  setFlavorSelections: (next: Record<string, string>) => void
  setJdkId: (id: string) => void
  setJdkInstalls: (installs: JdkInstall[]) => void
  setJdkCatalog: (catalog: {
    installs: JdkInstall[]
    defaultId: string | null
    byProject: Record<string, string>
  }) => void
  setJdkByProject: (byProject: Record<string, string>) => void
  setJdkError: (error: string | undefined) => void
  setProjectSigning: (binding: ProjectSigningBinding | null) => void
  setSigningEditorOpen: (open: boolean) => void
  setDiscovery: (discovery: VariantDiscovery | null) => void
  setModules: (modules: string[], defaultModule: string, parseWarning?: string) => void
  setVariantLoading: (loading: boolean) => void
  setVariantError: (error: string | undefined) => void
  setTaskNamePreview: (name: string) => void
  setBuildId: (id: string | null) => void
  setBuildStatus: (status: BuildUiStatus) => void
  setLogLines: (lines: LogLine[] | ((prev: LogLine[]) => LogLine[])) => void
  setLogExpanded: (expanded: boolean) => void
  setLogHeight: (height: number) => void
  setArtifacts: (items: ArtifactItem[]) => void
  setArtifactsExpanded: (expanded: boolean) => void
  setSelectedArtifactPaths: (paths: string[] | ((prev: string[]) => string[])) => void
  setShowAllArtifacts: (show: boolean) => void
  setCleanBeforeBuild: (clean: boolean) => void
  setLastError: (text: string | null) => void
  setBanner: (text: string | null) => void
  setArtifactNotice: (text: string | undefined) => void
  setSettingsAnchor: (id: string | null) => void
  clearLogs: () => void
  appendLogBatch: (batch: LogLine[]) => void
}

/** 收起顶部「构建成功」和日志旁的 succeeded。其它提示保留。 */
export function withoutBuildSuccess(state: {
  banner: string | null
  buildStatus: BuildUiStatus
}): { banner: string | null; buildStatus: BuildUiStatus } {
  return {
    banner: state.banner === '构建成功' ? null : state.banner,
    buildStatus: state.buildStatus === 'succeeded' ? 'idle' : state.buildStatus,
  }
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  project: null,
  module: 'app',
  kind: 'assemble',
  buildType: 'Release',
  flavorSelections: {},
  jdkId: '',
  jdkInstalls: [],
  jdkDefaultId: null,
  jdkByProject: {},
  jdkReady: false,
  projectSigning: null,
  signingEditorOpen: false,
  discovery: null,
  modules: [],
  variantLoading: false,
  taskNamePreview: '',
  buildId: null,
  buildStatus: 'idle',
  logLines: [],
  logExpanded: false,
  logHeight: DEFAULT_LOG_HEIGHT,
  artifacts: [],
  artifactsExpanded: false,
  selectedArtifactPaths: [],
  showAllArtifacts: false,
  cleanBeforeBuild: readCleanBeforeBuild(),
  lastError: null,
  banner: null,
  settingsAnchor: null,
  setProject: (project) =>
    set((state) => {
      const next = { project, lastError: null as string | null }
      if (state.project?.path === project?.path) return next
      return { ...next, ...withoutBuildSuccess(state) }
    }),
  setModule: (module) => set({ module }),
  setKind: (kind) => set({ kind }),
  setBuildType: (buildType) => set({ buildType }),
  setFlavor: (dimension, flavor) =>
    set((state) => ({
      flavorSelections: { ...state.flavorSelections, [dimension]: flavor },
    })),
  setFlavorSelections: (flavorSelections) => set({ flavorSelections }),
  setJdkId: (jdkId) => set({ jdkId }),
  setJdkInstalls: (jdkInstalls) => set({ jdkInstalls }),
  setJdkCatalog: ({ installs, defaultId, byProject }) =>
    set({
      jdkInstalls: installs,
      jdkDefaultId: defaultId,
      jdkByProject: byProject,
      jdkReady: true,
    }),
  setJdkByProject: (jdkByProject) => set({ jdkByProject }),
  setJdkError: (jdkError) => set({ jdkError }),
  setProjectSigning: (projectSigning) => set({ projectSigning }),
  setSigningEditorOpen: (signingEditorOpen) => set({ signingEditorOpen }),
  setDiscovery: (discovery) => set({ discovery }),
  setModules: (modules, defaultModule, parseWarning) =>
    set({ modules, module: defaultModule, parseWarning }),
  setVariantLoading: (variantLoading) => set({ variantLoading }),
  setVariantError: (variantError) => set({ variantError }),
  setTaskNamePreview: (taskNamePreview) => set({ taskNamePreview }),
  setBuildId: (buildId) => set({ buildId }),
  setBuildStatus: (buildStatus) =>
    set({
      buildStatus,
      ...(buildStatus === 'running' ? { logExpanded: true } : {}),
    }),
  setLogLines: (logLines) =>
    set((state) => ({
      logLines: typeof logLines === 'function' ? logLines(state.logLines) : logLines,
    })),
  setLogExpanded: (logExpanded) => set({ logExpanded }),
  setLogHeight: (logHeight) => set({ logHeight }),
  setArtifacts: (artifacts) => set({ artifacts }),
  setArtifactsExpanded: (artifactsExpanded) => set({ artifactsExpanded }),
  setSelectedArtifactPaths: (selectedArtifactPaths) =>
    set((state) => ({
      selectedArtifactPaths:
        typeof selectedArtifactPaths === 'function'
          ? selectedArtifactPaths(state.selectedArtifactPaths)
          : selectedArtifactPaths,
    })),
  setShowAllArtifacts: (showAllArtifacts) => set({ showAllArtifacts }),
  setCleanBeforeBuild: (cleanBeforeBuild) => {
    writeCleanBeforeBuild(cleanBeforeBuild)
    set({ cleanBeforeBuild })
  },
  setLastError: (lastError) => set({ lastError }),
  setBanner: (banner) => set({ banner }),
  setArtifactNotice: (artifactNotice) => set({ artifactNotice }),
  setSettingsAnchor: (settingsAnchor) => set({ settingsAnchor }),
  clearLogs: () => set((state) => ({ logLines: [], ...withoutBuildSuccess(state) })),
  appendLogBatch: (batch) =>
    set((state) => {
      const next = [...state.logLines, ...batch]
      return { logLines: next.length > 5000 ? next.slice(next.length - 5000) : next }
    }),
}))
