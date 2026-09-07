import ProjectPicker from '../components/ProjectPicker'

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
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] gap-3">
        <div className="flex min-h-0 flex-col gap-3 overflow-auto">
          <ProjectPicker />
          <PlaceholderCard title="打包配置">
            模块、产物类型、flavor、buildType 将在此组合任务名。F07 落地前保持占位。
          </PlaceholderCard>
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
