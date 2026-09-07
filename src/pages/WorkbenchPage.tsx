import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BuildLogPanel, { type LogLine } from '../components/BuildLogPanel'
import JdkSelect from '../components/JdkSelect'
import ModuleSelect from '../components/ModuleSelect'
import ProjectPicker from '../components/ProjectPicker'
import ProjectSigning from '../components/ProjectSigning'
import VariantConfig from '../components/VariantConfig'
import Button from '../components/ui/Button'
import { composeFlavorPart } from '../shared/taskName'
import type {
  BuildKind,
  BuildStatusEvent,
  JdkInstall,
  ProjectValidation,
  VariantDiscovery,
} from '../shared/types'

function packforgeApi() {
  return window.packforge
}

function PlaceholderCard({ title, children }: { title: string; children: string }) {
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <h2 className="text-sm font-medium text-[var(--text-primary)]">{title}</h2>
      <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">{children}</p>
    </section>
  )
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
  const [project, setProject] = useState<ProjectValidation | null>(null)
  const [modules, setModules] = useState<string[]>([])
  const [moduleName, setModuleName] = useState('app')
  const [parseWarning, setParseWarning] = useState<string | undefined>()
  const [discovery, setDiscovery] = useState<VariantDiscovery | null>(null)
  const [kind, setKind] = useState<BuildKind>('assemble')
  const [buildType, setBuildType] = useState('Release')
  const [flavorByDimension, setFlavorByDimension] = useState<Record<string, string>>({})
  const [variantLoading, setVariantLoading] = useState(false)
  const [variantError, setVariantError] = useState<string | undefined>()
  const [jdkInstalls, setJdkInstalls] = useState<JdkInstall[]>([])
  const [jdkId, setJdkId] = useState('')
  const [jdkError, setJdkError] = useState<string | undefined>()
  const [buildId, setBuildId] = useState<string | null>(null)
  const [buildStatus, setBuildStatus] = useState<BuildStatusEvent['status'] | 'idle'>('idle')
  const [buildHint, setBuildHint] = useState<string | undefined>()
  const [logLines, setLogLines] = useState<LogLine[]>([])
  const logBufferRef = useRef<LogLine[]>([])
  const logFlushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const logIdRef = useRef(0)

  const flavorPart = useMemo(() => {
    if (!discovery) return ''
    return composeFlavorPart(
      discovery.flavorDimensions.map((dim) => flavorByDimension[dim.name] ?? dim.flavors[0] ?? ''),
    )
  }, [discovery, flavorByDimension])

  const flushLogs = useCallback(() => {
    if (logFlushTimer.current) {
      clearTimeout(logFlushTimer.current)
      logFlushTimer.current = undefined
    }
    const batch = logBufferRef.current
    if (batch.length === 0) return
    logBufferRef.current = []
    setLogLines((prev) => {
      const next = [...prev, ...batch]
      return next.length > 5000 ? next.slice(next.length - 5000) : next
    })
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

  useEffect(() => {
    const api = packforgeApi()
    if (!api) return
    const offLog = api.onBuildLog((e) => {
      enqueueLog(e.line, e.stream)
    })
    const offStatus = api.onBuildStatus((e) => {
      flushLogs()
      setBuildStatus(e.status)
      if (e.status !== 'running') {
        setBuildId(null)
      }
      if (e.error) {
        setBuildHint(`${e.error.code}：${e.error.message}`)
      } else if (e.status === 'succeeded') {
        setBuildHint('构建成功')
      } else if (e.status === 'cancelled') {
        setBuildHint('已取消')
      } else {
        setBuildHint(undefined)
      }
    })
    return () => {
      offLog()
      offStatus()
      flushLogs()
    }
  }, [enqueueLog, flushLogs])

  const refreshVariants = useCallback(async (projectPath: string, module: string) => {
    const api = packforgeApi()
    if (!api) {
      setVariantError('请在桌面应用内刷新变体')
      return
    }
    setVariantLoading(true)
    setVariantError(undefined)
    try {
      const result = await api.discoverVariants(projectPath, module)
      if (!result.ok) {
        setDiscovery(null)
        setVariantError(`${result.error.code}：${result.error.message}`)
        return
      }
      setDiscovery(result.data)
      setBuildType(pickDefaultBuildType(result.data.buildTypes))
      setFlavorByDimension(pickDefaultFlavors(result.data))
    } finally {
      setVariantLoading(false)
    }
  }, [])

  useEffect(() => {
    const api = packforgeApi()
    if (!api) {
      setJdkError('请在桌面应用内选择 JDK')
      return
    }
    let cancelled = false
    void api.listJdks().then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setJdkError(`${result.error.code}：${result.error.message}`)
        return
      }
      setJdkInstalls(result.data.installs)
      setJdkId(result.data.defaultId ?? '')
      setJdkError(undefined)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function changeJdk(id: string) {
    const api = packforgeApi()
    if (!api) {
      setJdkError('请在桌面应用内选择 JDK')
      return
    }
    const result = await api.setDefaultJdk(id)
    if (!result.ok) {
      setJdkError(`${result.error.code}：${result.error.message}`)
      return
    }
    setJdkId(id)
    setJdkError(undefined)
  }

  useEffect(() => {
    if (!project) {
      setModules([])
      setModuleName('app')
      setParseWarning(undefined)
      setDiscovery(null)
      setVariantError(undefined)
      return
    }
    const api = packforgeApi()
    if (!api) {
      setModules([])
      setModuleName('app')
      setParseWarning('请在桌面应用内选择模块')
      return
    }
    let cancelled = false
    void api.listModules(project.path).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setModules([])
        setModuleName('app')
        setParseWarning(result.error.message)
        return
      }
      setModules(result.data.modules)
      setModuleName(result.data.defaultModule)
      setParseWarning(result.data.parseWarning)
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

  async function handleStart() {
    const api = packforgeApi()
    if (!api || !project || !jdkId) {
      setBuildHint('请先打开工程并选择 JDK')
      return
    }
    setBuildHint(undefined)
    setLogLines([])
    logBufferRef.current = []
    const signing = await api.getProjectSigning(project.path)
    if (!signing.ok) {
      setBuildHint(`${signing.error.code}：${signing.error.message}`)
      return
    }
    const signingProfileId =
      signing.data?.inject && signing.data.profile ? signing.data.profile.id : null
    const result = await api.startBuild({
      projectPath: project.path,
      module: moduleName,
      kind,
      flavorPart,
      buildType,
      jdkId,
      signingProfileId,
      extraArgs: [],
    })
    if (!result.ok) {
      setBuildHint(`${result.error.code}：${result.error.message}`)
      setBuildStatus('idle')
      return
    }
    setBuildId(result.data.buildId)
    setBuildStatus('running')
  }

  async function handleCancel() {
    const api = packforgeApi()
    if (!api || !buildId) return
    const result = await api.cancelBuild(buildId)
    if (!result.ok) {
      setBuildHint(`${result.error.code}：${result.error.message}`)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] gap-3">
        <div className="flex min-h-0 flex-col gap-3 overflow-auto">
          <ProjectPicker onProjectChange={setProject} />
          <section className="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">打包配置</h2>
            <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
              选择 JDK、模块、产物类型与变体；签名按工程路径在下方绑定。
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
                    onChange={setModuleName}
                  />
                  <VariantConfig
                    module={moduleName}
                    discovery={discovery}
                    kind={kind}
                    buildType={buildType}
                    flavorByDimension={flavorByDimension}
                    loading={variantLoading}
                    error={variantError}
                    onKindChange={setKind}
                    onBuildTypeChange={setBuildType}
                    onFlavorChange={(dimension, flavor) => {
                      setFlavorByDimension((current) => ({ ...current, [dimension]: flavor }))
                    }}
                    onRefresh={() => {
                      void refreshVariants(project.path, moduleName)
                    }}
                  />
                </>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">打开工程后将列出模块与变体</p>
              )}
            </div>
          </section>
          {project ? <ProjectSigning key={project.path} projectPath={project.path} /> : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={!project || !jdkId || running}
              onClick={() => void handleStart()}
            >
              开始打包
            </Button>
            <Button disabled={!running} onClick={() => void handleCancel()}>
              取消
            </Button>
            {buildHint ? (
              <span className="text-xs text-[var(--text-muted)]">{buildHint}</span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">
                {!project ? '请先打开工程' : !jdkId ? '请选择 JDK' : running ? '构建中…' : '就绪'}
              </span>
            )}
          </div>
        </div>
        <PlaceholderCard title="产物">
          构建完成后在此列出 APK / AAB / mapping，支持复制到文件夹或剪贴板。F12 再实现。
        </PlaceholderCard>
      </div>
      <BuildLogPanel
        lines={logLines}
        statusText={running ? 'running' : buildStatus === 'idle' ? undefined : buildStatus}
        onClear={() => {
          setLogLines([])
          logBufferRef.current = []
        }}
      />
    </div>
  )
}
