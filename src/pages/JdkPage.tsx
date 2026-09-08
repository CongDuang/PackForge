import { useCallback, useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import type { JdkInstall } from '../shared/types'

function packforgeApi() {
  return window.packforge
}

export default function JdkPage() {
  const [installs, setInstalls] = useState<JdkInstall[]>([])
  const [defaultId, setDefaultId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const api = packforgeApi()
    if (!api) {
      setLoadError('JDK 管理仅在桌面应用内可用')
      return
    }
    const listed = await api.listJdks()
    if (!listed.ok) {
      setLoadError(listed.error.message)
      return
    }
    setLoadError(null)
    setInstalls(listed.data.installs)
    setDefaultId(listed.data.defaultId)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function importLocal() {
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: 'JDK 管理仅在桌面应用内可用' })
      return
    }
    const picked = await api.pickDirectory()
    if (!picked.ok) {
      setNotice({ kind: 'error', text: picked.error.message })
      return
    }
    if (!picked.data) return
    setBusy(true)
    try {
      const imported = await api.importJdk(picked.data)
      if (!imported.ok) {
        setNotice({ kind: 'error', text: `${imported.error.code}：${imported.error.message}` })
        return
      }
      setNotice({ kind: 'ok', text: `已导入 ${imported.data.name}` })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function makeDefault(id: string) {
    const api = packforgeApi()
    if (!api) return
    const result = await api.setDefaultJdk(id)
    if (!result.ok) {
      setNotice({ kind: 'error', text: `${result.error.code}：${result.error.message}` })
      return
    }
    setNotice({ kind: 'ok', text: '已设为默认' })
    await refresh()
  }

  async function removeFromList(id: string) {
    const confirmed = window.confirm('仅从列表移除该登记，不会删除磁盘上的 JDK 目录。确定移除？')
    if (!confirmed) return
    const api = packforgeApi()
    if (!api) return
    const result = await api.removeJdk(id)
    if (!result.ok) {
      setNotice({ kind: 'error', text: `${result.error.code}：${result.error.message}` })
      return
    }
    setNotice({ kind: 'ok', text: '已从列表移除，磁盘目录未改动' })
    await refresh()
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">JDK 管理</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            导入本机已有 JDK 根目录，登记路径与版本后供打包选用。移除只删登记，不碰磁盘文件。
          </p>
        </div>
        {notice ? (
          <p
            role="status"
            className={[
              'shrink-0 pt-1 text-sm',
              notice.kind === 'ok' ? 'text-[var(--accent)]' : 'text-[var(--danger)]',
            ].join(' ')}
          >
            {notice.text}
          </p>
        ) : null}
      </div>

      {loadError ? <p className="text-sm text-[var(--danger)]">{loadError}</p> : null}

      <section className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">已登记</h2>
          <Button variant="primary" disabled={busy} onClick={() => void importLocal()}>
            导入本机 JDK…
          </Button>
        </div>

        {installs.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            还没有登记。请选择含 bin/java 的 JDK 根目录（macOS 也可选 .jdk 包）。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <th className="py-2 pr-3 font-medium">名称</th>
                  <th className="py-2 pr-3 font-medium">版本</th>
                  <th className="py-2 pr-3 font-medium">路径</th>
                  <th className="py-2 pr-3 font-medium">默认</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {installs.map((install) => {
                  const isDefault = install.id === defaultId
                  return (
                    <tr key={install.id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="py-2.5 pr-3 text-[var(--text-primary)]">{install.name}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-[var(--text-primary)]">{install.version}</td>
                      <td className="max-w-[16rem] py-2.5 pr-3">
                        <p className="truncate font-mono text-xs text-[var(--text-muted)]" title={install.homePath}>
                          {install.homePath}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">
                        {isDefault ? <span className="text-[var(--accent)]">默认</span> : null}
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <Button disabled={isDefault} onClick={() => void makeDefault(install.id)}>
                            设为默认
                          </Button>
                          <Button onClick={() => void removeFromList(install.id)}>移除</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
