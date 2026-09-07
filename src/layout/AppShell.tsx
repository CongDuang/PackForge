import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import { DEFAULT_PAGE, type PageId } from '../navigation'
import JdkPage from '../pages/JdkPage'
import SettingsPage from '../pages/SettingsPage'
import SigningPage from '../pages/SigningPage'
import WorkbenchPage from '../pages/WorkbenchPage'

function renderPage(page: PageId) {
  switch (page) {
    case 'workbench':
      return <WorkbenchPage />
    case 'jdk':
      return <JdkPage />
    case 'signing':
      return <SigningPage />
    case 'settings':
      return <SettingsPage />
  }
}

export default function AppShell() {
  const [page, setPage] = useState<PageId>(DEFAULT_PAGE)

  return (
    <div className="flex h-full min-h-0 bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="min-w-0 flex-1 overflow-auto p-5">{renderPage(page)}</main>
    </div>
  )
}
