import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { DEFAULT_PAGE, type PageId } from '../navigation'
import JdkPage from '../pages/JdkPage'
import SettingsPage from '../pages/SettingsPage'
import WorkbenchPage from '../pages/WorkbenchPage'
import { useWorkbenchStore } from '../store/workbenchStore'

function packforgeApi() {
  return window.packforge
}

export default function AppShell() {
  const [page, setPage] = useState<PageId>(DEFAULT_PAGE)

  useEffect(() => {
    const api = packforgeApi()
    if (!api) return

    async function openPath(raw: string) {
      const trimmed = raw.trim()
      if (!trimmed) return
      setPage('workbench')
      const opened = await api.openProject(trimmed)
      if (!opened.ok) {
        useWorkbenchStore.getState().setBanner(`${opened.error.code}：${opened.error.message}`)
        return
      }
      useWorkbenchStore.getState().setProject(opened.data)
      useWorkbenchStore.getState().setBanner(`已打开 ${opened.data.path}`)
    }

    const offPick = api.onMenuPickProject(() => {
      void (async () => {
        setPage('workbench')
        const picked = await api.pickDirectory()
        if (!picked.ok) {
          useWorkbenchStore.getState().setBanner(picked.error.message)
          return
        }
        if (!picked.data) return
        await openPath(picked.data)
      })()
    })

    const offRecent = api.onMenuOpenRecent((projectPath) => {
      void openPath(projectPath)
    })

    return () => {
      offPick()
      offRecent()
    }
  }, [])

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
