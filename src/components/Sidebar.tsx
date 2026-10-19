import { useEffect, useState } from 'react'
import { PAGE_IDS, PAGE_LABELS, type PageId } from '../navigation'
import { PRODUCT_NAME } from '../shared/about'

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
        <path
          d="M3 8h18v3.2H3z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M6 11.2V19M18 11.2V19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (page === 'jdk') {
    return (
      <svg aria-hidden className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 9h10v5.5A3.5 3.5 0 0 1 11.5 18h-3A3.5 3.5 0 0 1 5 14.5V9z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M15 11h1.6a2.2 2.2 0 0 1 0 4.4H15"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M8 5.4c.4.8.4 1.3 0 2.1M11 5.4c.4.8.4 1.3 0 2.1"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg aria-hidden className={common} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
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
            <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{PRODUCT_NAME}</div>
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
                'flex cursor-pointer items-center rounded-md outline-none',
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
            'flex w-full cursor-pointer items-center rounded-md text-xs text-[var(--text-muted)] outline-none',
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
