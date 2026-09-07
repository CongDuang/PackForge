export default function JdkPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">JDK 管理</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        导入本机已安装的 JDK 路径，打包时选择 JAVA_HOME。不提供在线下载或缓存安装包。F08
        再接导入与列表。
      </p>
    </div>
  )
}
