import { useCallback, useEffect, useMemo, useRef } from 'react'
import ArtifactsPanel from '../components/ArtifactsPanel'
import BuildLogPanel, { type LogLine } from '../components/BuildLogPanel'
import JdkSelect from '../components/JdkSelect'
import ModuleSelect from '../components/ModuleSelect'
import ProjectPicker from '../components/ProjectPicker'
import ProjectSigning from '../components/ProjectSigning'
import VariantConfig from '../components/VariantConfig'
import Button from '../components/ui/Button'
import { formatUserError } from '../shared/errorHints'
import { preflightSync } from '../shared/preflight'
import { buildGradleTaskName, composeFlavorPart } from '../shared/taskName'
import type { VariantDiscovery } from '../shared/types'
import { useWorkbenchStore } from '../store/workbenchStore'

function packforgeApi() {
  return window.packforge
}

function pickDefaultBuildType(types: string[]): string {
  return types.find((item) => item === 'Release') ?? types[0] ?? 'Release'
}

function pickDefaultFlavors(discovery: VariantDiscovery): Record<string, string> {
  const next: Record<string, string> = {}
  for (const dim of discovery.flavorDimensions) {
    next[dim.name] = dim.flavors[0] ?? ''
  }
  return next
}

export default function WorkbenchPage() {
  const project = useWorkbenchStore((s) => s.project)
  const moduleName = useWorkbenchStore((s) => s.module)
  const kind = useWorkbenchStore((s) => s.kind)
  const buildType = useWorkbenchStore((s) => s.buildType)
  const flavorSelections = useWorkbenchStore((s) => s.flavorSelections)
  const jdkId = useWorkbenchStore((s) => s.jdkId)
  const jdkInstalls = useWorkbenchStore((s) => s.jdkInstalls)
  const projectSigning = useWorkbenchStore((s) => s.projectSigning)
  const discovery = useWorkbenchStore((s) => s.discovery)
  const modules = useWorkbenchStore((s) => s.modules)
  const parseWarning = useWorkbenchStore((s) => s.parseWarning)
  const variantLoading = useWorkbenchStore((s) => s.variantLoading)
  const variantError = useWorkbenchStore((s) => s.variantError)
  const jdkError = useWorkbenchStore((s) => s.jdkError)
  const buildStatus = useWorkbenchStore((s) => s.buildStatus)
  const logLines = useWorkbenchStore((s) => s.logLines)
  const artifacts = useWorkbenchStore((s) => s.artifacts)
  const selectedArtifactPaths = useWorkbenchStore((s) => s.selectedArtifactPaths)
  const showAllArtifacts = useWorkbenchStore((s) => s.showAllArtifacts)
  const banner = useWorkbenchStore((s) => s.banner)
  const artifactNotice = useWorkbenchStore((s) => s.artifactNotice)

  const logBufferRef = useRef<LogLine[]>([])
  const logFlushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const logIdRef = useRef(0)

  const flavorPart = useMemo(() => {
    if (!discovery) return ''
    return composeFlavorPart(
      discovery.flavorDimensions.map((dim) => flavorSelections[dim.name] ?? dim.flavors[0] ?? ''),
    )
  }, [discovery, flavorSelections])

  const taskNamePreview = useMemo(
    () =>
      buildGradleTaskName({
        module: moduleName || 'app',
        kind,
        flavorPart,
        buildType: buildType || 'Release',
      }),
    [moduleName, kind, flavorPart, buildType],
  )

  useEffect(() => {
    useWorkbenchStore.getState().setTaskNamePreview(taskNamePreview)
  }, [taskNamePreview])

  const flushLogs = useCallback(() => {
    if (logFlushTimer.current) {
      clearTimeout(logFlushTimer.current)
      logFlushTimer.current = undefined
    }
    const batch = logBufferRef.current
    if (batch.length === 0) return
    logBufferRef.current = []
    useWorkbenchStore.getState().appendLogBatch(batch)
  }, [])

  const enqueueLog = useCallback(
    (line: string, stream: 'stdout' | 'stderr') => {
      logIdRef.current += 1
      logBufferRef.current.push({ id: logIdRef.current, line, stream })
      if (!logFlushTimer.current) {
        logFlushTimer.current = setTimeout(() => {
          logFlushTimer.current = undefined
          flushLogs()
        }, 50)
      }
    },
    [flushLogs],
  )

  const refreshArtifacts = useCallback(async () => {
    const api = packforgeApi()
    const state = useWorkbenchStore.getState()
    if (!api || !state.project) {
      state.setArtifacts([])
      return [] as const
    }
    const part = composeFlavorPart(
      (state.discovery?.flavorDimensions ?? []).map(
        (dim) => state.flavorSelections[dim.name] ?? dim.flavors[0] ?? '',
      ),
    )
    const result = await api.scanArtifacts({
      projectPath: state.project.path,
      module: state.module,
      flavorPart: part,
      buildType: state.buildType,
      kind: state.kind,
      showAllModuleArtifacts: state.showAllArtifacts,
    })
    if (!result.ok) {
      state.setArtifactNotice(formatUserError(result.error.code, result.error.message))
      return null
    }
    state.setArtifacts(result.data.items)
    state.setSelectedArtifactPaths((prev) =>
      prev.filter((p) => result.data.items.some((i) => i.path === p)),
    )
    state.setArtifactNotice(undefined)
    return result.data.items
  }, [])

  useEffect(() => {
    const api = packforgeApi()
    if (!api) return
    const offLog = api.onBuildLog((e) => enqueueLog(e.line, e.stream))
    const offStatus = api.onBuildStatus((e) => {
      flushLogs()
      const s = useWorkbenchStore.getState()
      s.setBuildStatus(e.status)
      if (e.status !== 'running') s.setBuildId(null)
      if (e.error) {
        const text = formatUserError(e.error.code, e.error.message)
        s.setLastError(text)
        s.setBanner(text)
      } else if (e.status === 'succeeded') {
        s.setBanner('构建成功')
        s.setLastError(null)
        void refreshArtifacts().then((items) => {
          if (items && items.length === 0) {
            const text = formatUserError('E_ARTIFACT_NONE', '构建成功但未扫到产物')
            const cur = useWorkbenchStore.getState()
            cur.setLastError(text)
            cur.setBanner(text)
            cur.setArtifactNotice(text)
          }
        })
      } else if (e.status === 'cancelled') {
        const text = formatUserError('E_BUILD_CANCELLED', '构建已取消')
        s.setBanner(text)
        s.setLastError(text)
      }
    })
    return () => {
      offLog()
      offStatus()
      flushLogs()
    }
  }, [enqueueLog, flushLogs, refreshArtifacts])

  useEffect(() => {
    if (!project) {
      const s = useWorkbenchStore.getState()
      s.setArtifacts([])
      s.setSelectedArtifactPaths([])
      s.setProjectSigning(null)
      return
    }
    void refreshArtifacts()
  }, [project, showAllArtifacts, moduleName, kind, buildType, flavorPart, refreshArtifacts])

  const refreshVariants = useCallback(async (projectPath: string, module: string) => {
    const api = packforgeApi()
    const s = useWorkbenchStore.getState()
    if (!api) {
      s.setVariantError('请在桌面应用内刷新变体')
      return
    }
    s.setVariantLoading(true)
    s.setVariantError(undefined)
    try {
      const result = await api.discoverVariants(projectPath, module)
      if (!result.ok) {
        s.setDiscovery(null)
        s.setVariantError(formatUserError(result.error.code, result.error.message))
        return
      }
      s.setDiscovery(result.data)
      s.setBuildType(pickDefaultBuildType(result.data.buildTypes))
      s.setFlavorSelections(pickDefaultFlavors(result.data))
    } finally {
      useWorkbenchStore.getState().setVariantLoading(false)
    }
  }, [])

  useEffect(() => {
    const api = packforgeApi()
    const s = useWorkbenchStore.getState()
    if (!api) {
      s.setJdkError('请在桌面应用内选择 JDK')
      return
    }
    let cancelled = false
    void api.listJdks().then((result) => {
      if (cancelled) return
      const cur = useWorkbenchStore.getState()
      if (!result.ok) {
        cur.setJdkError(formatUserError(result.error.code, result.error.message))
        return
      }
      cur.setJdkInstalls(result.data.installs)
      cur.setJdkId(result.data.defaultId ?? '')
      cur.setJdkError(undefined)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function changeJdk(id: string) {
    const api = packforgeApi()
    const s = useWorkbenchStore.getState()
    if (!api) {
      s.setJdkError('请在桌面应用内选择 JDK')
      return
    }
    const result = await api.setDefaultJdk(id)
    if (!result.ok) {
      s.setJdkError(formatUserError(result.error.code, result.error.message))
      return
    }
    s.setJdkId(id)
    s.setJdkError(undefined)
  }

  useEffect(() => {
    const s = useWorkbenchStore.getState()
    if (!project) {
      s.setModules([], 'app')
      s.setDiscovery(null)
      s.setVariantError(undefined)
      return
    }
    const api = packforgeApi()
    if (!api) {
      s.setModules([], 'app', '请在桌面应用内选择模块')
      return
    }
    let cancelled = false
    const projectPath = project.path
    void api.listModules(projectPath).then((result) => {
      if (cancelled) return
      const cur = useWorkbenchStore.getState()
      if (!result.ok) {
        cur.setModules([], 'app', result.error.message)
        return
      }
      cur.setModules(result.data.modules, result.data.defaultModule, result.data.parseWarning)
    })
    return () => {
      cancelled = true
    }
  }, [project])

  useEffect(() => {
    if (!project || !moduleName.trim()) return
    void refreshVariants(project.path, moduleName)
  }, [project, moduleName, refreshVariants])

  const running = buildStatus === 'running'

  const syncGate = preflightSync({
    project,
    module: moduleName,
    kind,
    buildType,
    discovery,
    flavorByDimension: flavorSelections,
    jdkId,
    projectSigning,
  })

  async function handleStart() {
    const api = packforgeApi()
    const s = useWorkbenchStore.getState()
    if (!api || !s.project) {
      s.setBanner('请先打开工程')
      return
    }
    const gate = preflightSync({
      project: s.project,
      module: s.module,
      kind: s.kind,
      buildType: s.buildType,
      discovery: s.discovery,
      flavorByDimension: s.flavorSelections,
      jdkId: s.jdkId,
      projectSigning: s.projectSigning,
    })
    if (!gate.ok) {
      const text = formatUserError(gate.error.code, gate.error.message)
      s.setLastError(text)
      s.setBanner(text)
      return
    }

    const env = await api.resolveBuildEnv({
      projectPath: s.project.path,
      jdkId: s.jdkId,
    })
    if (!env.ok) {
      const text = formatUserError(env.error.code, env.error.message)
      s.setLastError(text)
      s.setBanner(text)
      return
    }

    s.setBanner(null)
    s.setLastError(null)
    s.clearLogs()
    logBufferRef.current = []

    const result = await api.startBuild({
      projectPath: s.project.path,
      module: s.module,
      kind: s.kind,
      flavorPart: gate.data.flavorPart,
      buildType: s.buildType,
      jdkId: s.jdkId,
      signingProfileId: gate.data.signingProfileId,
      extraArgs: [],
    })
    if (!result.ok) {
      const text = formatUserError(result.error.code, result.error.message)
      s.setLastError(text)
      s.setBanner(text)
      s.setBuildStatus('idle')
      return
    }
    s.setBuildId(result.data.buildId)
    s.setBuildStatus('running')
    s.setBanner(`构建中：${gate.data.taskName}`)
  }

  async function handleCancel() {
    const api = packforgeApi()
    const s = useWorkbenchStore.getState()
    if (!api || !s.buildId) return
    const result = await api.cancelBuild(s.buildId)
    if (!result.ok) {
      s.setBanner(formatUserError(result.error.code, result.error.message))
    }
  }

  async function copyToFolder() {
    const api = packforgeApi()
    const s = useWorkbenchStore.getState()
    if (!api || s.selectedArtifactPaths.length === 0) return
    const dir = await api.pickDirectory()
    if (!dir.ok) {
      s.setArtifactNotice(formatUserError(dir.error.code, dir.error.message))
      return
    }
    if (!dir.data) return
    const result = await api.copyArtifactsToFolder(s.selectedArtifactPaths, dir.data)
    if (!result.ok) {
      s.setArtifactNotice(formatUserError(result.error.code, result.error.message))
      return
    }
    s.setArtifactNotice(`已复制 ${result.data.copied.length} 个文件`)
  }

  async function copyPaths() {
    const api = packforgeApi()
    const s = useWorkbenchStore.getState()
    if (!api || s.selectedArtifactPaths.length === 0) return
    const result = await api.copyPathsToClipboard(s.selectedArtifactPaths)
    s.setArtifactNotice(
      result.ok ? '已复制路径' : formatUserError(result.error.code, result.error.message),
    )
  }

  async function writeFilesClipboard() {
    const api = packforgeApi()
    const s = useWorkbenchStore.getState()
    if (!api || s.selectedArtifactPaths.length === 0) return
    const result = await api.writeFilesToClipboard(s.selectedArtifactPaths)
    s.setArtifactNotice(
      result.ok ? '已写入文件剪贴板' : formatUserError(result.error.code, result.error.message),
    )
  }

  async function reveal(filePath: string) {
    const api = packforgeApi()
    if (!api) return
    const result = await api.showItemInFolder(filePath)
    if (!result.ok) {
      useWorkbenchStore
        .getState()
        .setArtifactNotice(formatUserError(result.error.code, result.error.message))
    }
  }

  const canStart = syncGate.ok && !running
  const actions = useWorkbenchStore.getState()

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {banner ? (
        <div
          role="status"
          className="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-xs leading-5 text-[var(--text-primary)]"
        >
          {banner}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-3">
        <div className="flex min-h-0 flex-col gap-3 overflow-auto">
          <ProjectPicker onProjectChange={actions.setProject} />
          <section className="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">打包配置</h2>
            <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
              选择 JDK、模块、产物类型与变体；签名按工程路径在下方绑定。预检通过后即可开始打包。
            </p>
            <div className="mt-3 space-y-3">
              <JdkSelect installs={jdkInstalls} value={jdkId} onChange={(id) => void changeJdk(id)} />
              {jdkError ? <p className="text-xs text-[var(--danger)]">{jdkError}</p> : null}
              {project ? (
                <>
                  <ModuleSelect
                    modules={modules}
                    value={moduleName}
                    parseWarning={parseWarning}
                    onChange={actions.setModule}
                  />
                  <VariantConfig
                    module={moduleName}
                    discovery={discovery}
                    kind={kind}
                    buildType={buildType}
                    flavorByDimension={flavorSelections}
                    loading={variantLoading}
                    error={variantError}
                    onKindChange={actions.setKind}
                    onBuildTypeChange={actions.setBuildType}
                    onFlavorChange={actions.setFlavor}
                    onRefresh={() => {
                      if (project) void refreshVariants(project.path, moduleName)
                    }}
                  />
                </>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">打开工程后将列出模块与变体</p>
              )}
            </div>
          </section>
          {project ? (
            <ProjectSigning
              key={project.path}
              projectPath={project.path}
              onBindingChange={actions.setProjectSigning}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={!canStart} onClick={() => void handleStart()}>
              开始打包
            </Button>
            <Button disabled={!running} onClick={() => void handleCancel()}>
              取消
            </Button>
            <span className="font-mono text-xs text-[var(--accent)]">{taskNamePreview}</span>
            {!syncGate.ok ? (
              <span className="text-xs text-[var(--warn)]">
                {formatUserError(syncGate.error.code, syncGate.error.message)}
              </span>
            ) : running ? (
              <span className="text-xs text-[var(--text-muted)]">构建中…</span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">预检通过，可以打包</span>
            )}
          </div>
        </div>
        <ArtifactsPanel
          items={artifacts}
          selectedPaths={selectedArtifactPaths}
          showAll={showAllArtifacts}
          notice={artifactNotice}
          fileClipboardHint="若提示不可用，请改用「复制到文件夹」。"
          onToggleShowAll={actions.setShowAllArtifacts}
          onSelectionChange={actions.setSelectedArtifactPaths}
          onRefresh={() => void refreshArtifacts()}
          onCopyPaths={() => void copyPaths()}
          onCopyToFolder={() => void copyToFolder()}
          onWriteFilesClipboard={() => void writeFilesClipboard()}
          onReveal={(p) => void reveal(p)}
        />
      </div>
      <BuildLogPanel
        lines={logLines}
        statusText={running ? 'running' : buildStatus === 'idle' ? undefined : buildStatus}
        onClear={() => {
          useWorkbenchStore.getState().clearLogs()
          logBufferRef.current = []
        }}
      />
    </div>
  )
}
