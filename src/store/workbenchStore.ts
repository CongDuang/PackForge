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

type WorkbenchState = {
  project: ProjectValidation | null
  module: string
  kind: BuildKind
  buildType: string
  flavorSelections: Record<string, string>
  jdkId: string
  jdkInstalls: JdkInstall[]
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
  lastError: string | null
  banner: string | null
  artifactNotice?: string
  setProject: (project: ProjectValidation | null) => void
  setModule: (module: string) => void
  setKind: (kind: BuildKind) => void
  setBuildType: (buildType: string) => void
  setFlavor: (dimension: string, flavor: string) => void
  setFlavorSelections: (next: Record<string, string>) => void
  setJdkId: (id: string) => void
  setJdkInstalls: (installs: JdkInstall[]) => void
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
  setLastError: (text: string | null) => void
  setBanner: (text: string | null) => void
  setArtifactNotice: (text: string | undefined) => void
  clearLogs: () => void
  appendLogBatch: (batch: LogLine[]) => void
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  project: null,
  module: 'app',
  kind: 'assemble',
  buildType: 'Release',
  flavorSelections: {},
  jdkId: '',
  jdkInstalls: [],
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
  lastError: null,
  banner: null,
  setProject: (project) => set({ project, lastError: null }),
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
  setArtifacts: (artifacts) =>
    set({
      artifacts,
      ...(artifacts.length > 0 ? { artifactsExpanded: true } : {}),
    }),
  setArtifactsExpanded: (artifactsExpanded) => set({ artifactsExpanded }),
  setSelectedArtifactPaths: (selectedArtifactPaths) =>
    set((state) => ({
      selectedArtifactPaths:
        typeof selectedArtifactPaths === 'function'
          ? selectedArtifactPaths(state.selectedArtifactPaths)
          : selectedArtifactPaths,
    })),
  setShowAllArtifacts: (showAllArtifacts) => set({ showAllArtifacts }),
  setLastError: (lastError) => set({ lastError }),
  setBanner: (banner) => set({ banner }),
  setArtifactNotice: (artifactNotice) => set({ artifactNotice }),
  clearLogs: () => set({ logLines: [] }),
  appendLogBatch: (batch) =>
    set((state) => {
      const next = [...state.logLines, ...batch]
      return { logLines: next.length > 5000 ? next.slice(next.length - 5000) : next }
    }),
}))
