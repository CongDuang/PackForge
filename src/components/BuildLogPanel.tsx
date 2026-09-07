import { useEffect, useMemo, useRef, useState } from 'react'
import Button from './ui/Button'

export type LogLine = {
  id: number
  line: string
  stream: 'stdout' | 'stderr'
}

type BuildLogPanelProps = {
  lines: LogLine[]
  statusText?: string
  onClear: () => void
}

export default function BuildLogPanel({ lines, statusText, onClear }: BuildLogPanelProps) {
  const [filter, setFilter] = useState('')
  const [stickBottom, setStickBottom] = useState(true)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return lines
    return lines.filter((item) => item.line.toLowerCase().includes(q))
  }, [lines, filter])

  useEffect(() => {
    if (!stickBottom) return
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visible, stickBottom])

  async function copyAll() {
    const text = visible.map((item) => item.line).join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  return (
    <section className="flex h-48 shrink-0 flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">构建日志</h2>
        {statusText ? <span className="text-xs text-[var(--text-muted)]">{statusText}</span> : null}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="过滤…"
            className="h-7 w-36 rounded border border-[var(--border)] bg-[var(--bg-base)] px-2 text-xs text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <Button onClick={() => void copyAll()}>复制</Button>
          <Button onClick={onClear}>清空</Button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[11px] leading-5 text-[var(--text-muted)]"
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
          setStickBottom(atBottom)
        }}
      >
        {visible.length === 0 ? (
          <p>Gradle 输出将流式显示于此（已脱敏）。</p>
        ) : (
          visible.map((item) => (
            <div
              key={item.id}
              className={item.stream === 'stderr' ? 'text-[var(--warn)]' : undefined}
            >
              {item.line}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
