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
  expanded: boolean
  height: number
  onToggleExpanded: () => void
  onHeightChange: (height: number) => void
  maxHeight: number
  minHeight: number
  onClear: () => void
}

export default function BuildLogPanel({
  lines,
  statusText,
  expanded,
  height,
  onToggleExpanded,
  onHeightChange,
  maxHeight,
  minHeight,
  onClear,
}: BuildLogPanelProps) {
  const [filter, setFilter] = useState('')
  const [stickBottom, setStickBottom] = useState(true)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return lines
    return lines.filter((item) => item.line.toLowerCase().includes(q))
  }, [lines, filter])

  useEffect(() => {
    if (!stickBottom || !expanded) return
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visible, stickBottom, expanded])

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - event.clientY
      const next = Math.min(
        maxHeight,
        Math.max(minHeight, dragRef.current.startHeight + delta),
      )
      onHeightChange(next)
    }
    function onUp() {
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [maxHeight, minHeight, onHeightChange])

  async function copyAll() {
    const text = visible.map((item) => item.line).join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  return (
    <section
      className="flex shrink-0 flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-panel)]"
      style={expanded ? { height } : undefined}
    >
      {expanded ? (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="拖动调整日志高度"
          className="h-1.5 shrink-0 cursor-ns-resize bg-[var(--border)]/60 hover:bg-[var(--accent)]/40"
          onMouseDown={(event) => {
            event.preventDefault()
            dragRef.current = { startY: event.clientY, startHeight: height }
            document.body.style.cursor = 'ns-resize'
            document.body.style.userSelect = 'none'
          }}
        />
      ) : null}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">构建日志</h2>
        {statusText ? <span className="text-xs text-[var(--text-muted)]">{statusText}</span> : null}
        <div className="ml-auto flex items-center gap-2">
          {expanded ? (
            <>
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="过滤…"
                className="h-7 w-36 rounded border border-[var(--border)] bg-[var(--bg-base)] px-2 text-xs text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <Button onClick={() => void copyAll()}>复制</Button>
              <Button onClick={onClear}>清空</Button>
            </>
          ) : null}
          <Button onClick={onToggleExpanded}>{expanded ? '折叠' : '展开'}</Button>
        </div>
      </div>
      {expanded ? (
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
      ) : null}
    </section>
  )
}
