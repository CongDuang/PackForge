export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">设置</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          配置 Android SDK 路径与高级 Gradle 参数。F04 再接持久化。
        </p>
      </div>
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">关于</h2>
        <p className="mt-2 text-sm text-[var(--text-primary)]">匠包 PackForge</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">本地锻造，不上云</p>
        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
          不上传签名与工程；无遥测。完整隐私声明见 F04。
        </p>
      </section>
    </div>
  )
}
