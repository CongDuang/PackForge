import { useEffect, useState } from 'react'
import { PAGE_IDS, PAGE_LABELS, type PageId } from '../navigation'

const SIDEBAR_COLLAPSED_KEY = 'packforge.sidebarCollapsed'

function BrandMark() {
  return (
    <svg
      aria-hidden
      className="h-8 w-8 shrink-0"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="10" width="24" height="16" rx="2" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M4 14h24" stroke="var(--accent)" strokeWidth="1.6" />
      <path
        d="M16 4l6 5v5c0 5.2-6 8-6 8s-6-2.8-6-8V9l6-5z"
        stroke="var(--text-muted)"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function NavIcon({ page }: { page: PageId }) {
  const common = 'h-5 w-5 shrink-0'
  if (page === 'workbench') {
    return (
      <svg aria-hidden className={common} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 14h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (page === 'jdk') {
    return (
      <svg aria-hidden className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M9 4v7.5a3 3 0 1 0 6 0V4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M9 8h6M9 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M7 20h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg aria-hidden className={common} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

type SidebarProps = {
  current: PageId
  onNavigate: (page: PageId) => void
}

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
    } catch {
      // ignore
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <aside
      className={[
        'flex shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-panel)] transition-[width]',
        collapsed ? 'w-14' : 'w-52',
      ].join(' ')}
    >
      <div
        className={[
          'flex items-center border-b border-[var(--border)] py-4',
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-4',
        ].join(' ')}
      >
        <BrandMark />
        {!collapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--text-primary)]">匠包</div>
            <div className="truncate text-xs text-[var(--text-muted)]">PackForge</div>
          </div>
        ) : null}
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="主导航">
        {PAGE_IDS.map((id) => {
          const active = id === current
          const label = PAGE_LABELS[id]
          return (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onNavigate(id)}
              className={[
                'flex items-center rounded-md outline-none',
                'focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2 text-left text-sm',
                active
                  ? 'bg-[var(--bg-base)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              <NavIcon page={id} />
              {!collapsed ? <span className="truncate">{label}</span> : null}
            </button>
          )
        })}
      </nav>
      <div className="border-t border-[var(--border)] p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展开侧栏' : '折叠侧栏'}
          title={collapsed ? '展开侧栏' : '折叠侧栏'}
          className={[
            'flex w-full items-center rounded-md text-xs text-[var(--text-muted)] outline-none',
            'hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]',
            'focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2',
          ].join(' ')}
        >
          <svg aria-hidden className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            {collapsed ? (
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
          {!collapsed ? <span>{collapsed ? '展开' : '折叠'}</span> : null}
        </button>
      </div>
    </aside>
  )
}
