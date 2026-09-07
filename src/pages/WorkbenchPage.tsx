import { useCallback, useEffect, useState } from 'react'
import JdkSelect from '../components/JdkSelect'
import ModuleSelect from '../components/ModuleSelect'
import ProjectPicker from '../components/ProjectPicker'
import ProjectSigning from '../components/ProjectSigning'
import VariantConfig from '../components/VariantConfig'
import type { BuildKind, JdkInstall, ProjectValidation, VariantDiscovery } from '../shared/types'

function packforgeApi() {
  return window.packforge
}

function PlaceholderCard({
  title,
  children,
}: {
  title: string
  children: string
}) {
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled
              className="rounded-md bg-[var(--accent-dim)] px-4 py-2 text-sm text-[var(--bg-base)] opacity-50"
            >
              开始打包
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              {jdkId ? '开始打包将在后续任务接入' : '尚未选择 JDK，按钮保持禁用'}
            </span>
          </div>
        </div>
        <PlaceholderCard title="产物">
          构建完成后在此列出 APK / AAB / mapping，支持复制到文件夹或剪贴板。F12 再实现。
        </PlaceholderCard>
      </div>
      <section className="h-40 shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">构建日志</h2>
        <p className="mt-1.5 font-mono text-xs leading-5 text-[var(--text-muted)]">
          Gradle 输出将流式显示于此。F11 接入 spawn 与脱敏。
        </p>
      </section>
    </div>
  )
}
