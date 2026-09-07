import { useEffect, useState } from 'react'
import ModuleSelect from '../components/ModuleSelect'
import ProjectPicker from '../components/ProjectPicker'
import type { ProjectValidation } from '../shared/types'

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

export default function WorkbenchPage() {
  const [project, setProject] = useState<ProjectValidation | null>(null)
  const [modules, setModules] = useState<string[]>([])
  const [moduleName, setModuleName] = useState('app')
  const [parseWarning, setParseWarning] = useState<string | undefined>()

  useEffect(() => {
    if (!project) {
      setModules([])
      setModuleName('app')
      setParseWarning(undefined)
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] gap-3">
        <div className="flex min-h-0 flex-col gap-3 overflow-auto">
          <ProjectPicker onProjectChange={setProject} />
          <section className="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">打包配置</h2>
            <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
              先选择模块。产物类型、flavor、buildType 将在 F07 组合任务名。
            </p>
            <div className="mt-3">
              {project ? (
                <ModuleSelect
                  modules={modules}
                  value={moduleName}
                  parseWarning={parseWarning}
                  onChange={setModuleName}
                />
              ) : (
                <p className="text-xs text-[var(--text-muted)]">打开工程后将列出 include 模块</p>
              )}
            </div>
          </section>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled
              className="rounded-md bg-[var(--accent-dim)] px-4 py-2 text-sm text-[var(--bg-base)] opacity-50"
            >
              开始打包
            </button>
            <span className="text-xs text-[var(--text-muted)]">尚未选择 JDK，按钮保持禁用</span>
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
