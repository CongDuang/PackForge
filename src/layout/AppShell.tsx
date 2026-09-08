import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import { DEFAULT_PAGE, type PageId } from '../navigation'
import JdkPage from '../pages/JdkPage'
import SettingsPage from '../pages/SettingsPage'
import WorkbenchPage from '../pages/WorkbenchPage'

export default function AppShell() {
  const [page, setPage] = useState<PageId>(DEFAULT_PAGE)

  return (
    <div className="flex h-full min-h-0 bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden p-5">
        <div
          className={page === 'workbench' ? 'h-full min-h-0' : 'hidden'}
          aria-hidden={page !== 'workbench'}
        >
          <WorkbenchPage />
        </div>
        {page === 'jdk' ? (
          <div className="h-full min-h-0 overflow-auto">
            <JdkPage />
          </div>
        ) : null}
        {page === 'settings' ? (
          <div className="h-full min-h-0 overflow-auto">
            <SettingsPage />
          </div>
        ) : null}
      </main>
    </div>
  )
}
