import { useMemo } from 'react'
import type { ArtifactItem } from '../shared/types'
import Button from './ui/Button'

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

type ArtifactsPanelProps = {
  items: ArtifactItem[]
  selectedPaths: string[]
  showAll: boolean
  busy?: boolean
  notice?: string
  onCollapse: () => void
  onToggleShowAll: (next: boolean) => void
  onSelectionChange: (paths: string[]) => void
  onRefresh: () => void
  onCopyToFolder: () => void
  onReveal: (path: string) => void
}

export default function ArtifactsPanel({
  items,
  selectedPaths,
  showAll,
  busy,
  notice,
  onCollapse,
  onToggleShowAll,
  onSelectionChange,
  onRefresh,
  onCopyToFolder,
  onReveal,
}: ArtifactsPanelProps) {
  const selected = useMemo(() => new Set(selectedPaths), [selectedPaths])

  function toggle(path: string) {
    const next = new Set(selected)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    onSelectionChange([...next])
  }

  function selectAll() {
    onSelectionChange(items.map((item) => item.path))
  }

  function invert() {
    onSelectionChange(items.filter((item) => !selected.has(item.path)).map((item) => item.path))
  }

  const hasSelection = selectedPaths.length > 0

  return (
    <section className="flex min-h-0 flex-col rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">产物</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            仅列出 APK / AAB / mapping.txt。勾选后可复制到文件夹（不做拖出）。
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button disabled={busy} onClick={onRefresh}>
            刷新
          </Button>
          <Button onClick={onCollapse}>折叠</Button>
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(e) => onToggleShowAll(e.target.checked)}
        />
        显示该模块全部产物
      </label>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button disabled={items.length === 0} onClick={selectAll}>
          全选
        </Button>
        <Button disabled={items.length === 0} onClick={invert}>
          反选
        </Button>
        <Button disabled={!hasSelection} onClick={onCopyToFolder}>
          复制到文件夹
        </Button>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto">
        {items.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">暂无产物。构建成功后将自动扫描。</p>
        ) : (
          items.map((item) => (
            <label
              key={item.path}
              className="flex cursor-pointer gap-2 rounded border border-[var(--border)]/80 bg-[var(--bg-base)]/30 p-2 text-xs"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.has(item.path)}
                onChange={() => toggle(item.path)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--accent-dim)]/30 px-1.5 py-0.5 text-[10px] uppercase text-[var(--accent)]">
                    {item.type}
                  </span>
                  <span className="truncate font-medium text-[var(--text-primary)]">
                    {item.path.split(/[/\\]/).pop()}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{item.path}</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {formatSize(item.size)} · {new Date(item.mtime).toLocaleString()}
                </p>
                <button
                  type="button"
                  className="mt-1 text-[11px] text-[var(--accent)] underline-offset-2 hover:underline"
                  onClick={(e) => {
                    e.preventDefault()
                    onReveal(item.path)
                  }}
                >
                  在访达/资源管理器中显示
                </button>
              </div>
            </label>
          ))
        )}
      </div>

      {notice ? <p className="mt-2 text-xs text-[var(--text-muted)]">{notice}</p> : null}
    </section>
  )
}
