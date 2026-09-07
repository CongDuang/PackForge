import { useCallback, useEffect, useState } from 'react'
import type { ProjectRef, ProjectValidation } from '../shared/types'
import Button from './ui/Button'
import TextField from './ui/TextField'

function packforgeApi() {
  return window.packforge
}

function formatError(code: string, message: string): string {
  return `${code}：${message}`
}

type ProjectPickerProps = {
  onProjectChange?: (project: ProjectValidation | null) => void
}

export default function ProjectPicker({ onProjectChange }: ProjectPickerProps) {
  const [pathValue, setPathValue] = useState('')
  const [recent, setRecent] = useState<ProjectRef[]>([])
  const [current, setCurrent] = useState<ProjectValidation | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const refreshRecent = useCallback(async () => {
    const api = packforgeApi()
    if (!api) return
    const listed = await api.listRecentProjects()
    if (listed.ok) setRecent(listed.data)
  }, [])

  useEffect(() => {
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '请在桌面应用内选择项目' })
      return
    }
    void refreshRecent()
  }, [refreshRecent])

  async function openPath(raw: string) {
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '请在桌面应用内选择项目' })
      return
    }
    const trimmed = raw.trim()
    if (!trimmed) {
      setNotice({ kind: 'error', text: '请先填写或选择工程目录' })
      return
    }
    setBusy(true)
    try {
      const opened = await api.openProject(trimmed)
      if (!opened.ok) {
        setCurrent(null)
        onProjectChange?.(null)
        setNotice({ kind: 'error', text: formatError(opened.error.code, opened.error.message) })
        return
      }
      setPathValue(opened.data.path)
      setCurrent(opened.data)
      onProjectChange?.(opened.data)
      setNotice({ kind: 'ok', text: `已识别 ${opened.data.wrapperKind}` })
      await refreshRecent()
    } finally {
      setBusy(false)
    }
  }

  async function browse() {
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '请在桌面应用内选择项目' })
      return
    }
    const picked = await api.pickDirectory()
    if (!picked.ok) {
      setNotice({ kind: 'error', text: picked.error.message })
      return
    }
    if (!picked.data) return
    setPathValue(picked.data)
    await openPath(picked.data)
  }

  async function pinItem(item: ProjectRef) {
    const api = packforgeApi()
    if (!api) return
    const result = await api.pinRecentProject(item.id, !item.pinned)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error.message })
      return
    }
    await refreshRecent()
  }

  async function removeItem(item: ProjectRef) {
    const api = packforgeApi()
    if (!api) return
    const result = await api.removeRecentProject(item.id)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error.message })
      return
    }
    if (current?.path === item.path) {
      setCurrent(null)
      onProjectChange?.(null)
    }
    await refreshRecent()
  }

  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)]">项目</h2>
          <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
            选择或粘贴含 Gradle Wrapper 的工程目录。只用项目自带 gradlew / gradlew.bat。
          </p>
        </div>
        {notice ? (
          <p
            role="status"
            className={[
              'shrink-0 text-xs leading-5',
              notice.kind === 'ok' ? 'text-[var(--accent)]' : 'text-[var(--danger)]',
            ].join(' ')}
          >
            {notice.text}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextField
            id="project-path"
            label="工程路径"
            value={pathValue}
            placeholder="/Users/you/AndroidProject"
            onChange={setPathValue}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void openPath(pathValue)
              }
            }}
          />
        </div>
        <Button className="shrink-0" disabled={busy} onClick={() => void browse()}>
          选择项目…
        </Button>
        <Button variant="primary" className="shrink-0" disabled={busy} onClick={() => void openPath(pathValue)}>
          打开
        </Button>
      </div>

      {current ? (
        <p className="mt-2 font-mono text-xs leading-5 text-[var(--text-muted)]">
          {current.settingsFile} · {current.wrapperCommand}
        </p>
      ) : null}

      <div className="mt-4">
        <h3 className="text-xs font-medium text-[var(--text-muted)]">最近打开</h3>
        {recent.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">还没有最近项目</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {recent.map((item) => {
              const active = current?.path === item.path
              return (
                <li
                  key={item.id}
                  className={[
                    'flex items-center gap-2 rounded-md px-2 py-1.5',
                    active ? 'bg-[var(--bg-base)]' : 'hover:bg-[var(--bg-base)]',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    onClick={() => void openPath(item.path)}
                  >
                    <span className="block truncate text-sm text-[var(--text-primary)]">
                      {item.pinned ? '★ ' : ''}
                      {item.displayName}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-[var(--text-muted)]">{item.path}</span>
                  </button>
                  <Button className="shrink-0 px-2 py-1 text-xs" onClick={() => void pinItem(item)}>
                    {item.pinned ? '取消置顶' : '置顶'}
                  </Button>
                  <Button className="shrink-0 px-2 py-1 text-xs" onClick={() => void removeItem(item)}>
                    移除
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
