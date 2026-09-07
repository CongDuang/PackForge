import { DEFAULT_PAGE, PAGE_IDS, PAGE_LABELS, type PageId } from '../navigation'

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
      <path d="M16 4l6 5v5c0 5.2-6 8-6 8s-6-2.8-6-8V9l6-5z" stroke="var(--text-muted)" strokeWidth="1.4" />
    </svg>
  )
}

type SidebarProps = {
  current: PageId
  onNavigate: (page: PageId) => void
}

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-panel)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-4">
        <BrandMark />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">匠包</div>
          <div className="truncate text-xs text-[var(--text-muted)]">PackForge</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="主导航">
        {PAGE_IDS.map((id) => {
          const active = id === current
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={[
                'rounded-md px-3 py-2 text-left text-sm outline-none',
                'focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                active
                  ? 'bg-[var(--bg-base)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {PAGE_LABELS[id]}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export { DEFAULT_PAGE }
