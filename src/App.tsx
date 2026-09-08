import { useEffect, useState } from 'react'
import AppShell from './layout/AppShell'
import type { ThemePreference } from './shared/types'
import { applyTheme, watchSystemTheme } from './theme'

function packforgeApi() {
  return window.packforge
}

export default function App() {
  const [themePref, setThemePref] = useState<ThemePreference>('system')

  useEffect(() => {
    const api = packforgeApi()
    if (!api) {
      applyTheme('system')
      return
    }
    let cancelled = false
    void api.getSettings().then((result) => {
      if (cancelled || !result.ok) {
        applyTheme('system')
        return
      }
      const theme = result.data.theme ?? 'system'
      setThemePref(theme)
      applyTheme(theme)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    applyTheme(themePref)
    return watchSystemTheme(themePref, () => applyTheme(themePref))
  }, [themePref])

  useEffect(() => {
    function onThemeChanged(event: Event) {
      const next = (event as CustomEvent<ThemePreference>).detail
      if (next === 'system' || next === 'light' || next === 'dark') {
        setThemePref(next)
      }
    }
    window.addEventListener('packforge:theme', onThemeChanged)
    return () => window.removeEventListener('packforge:theme', onThemeChanged)
  }, [])

  return <AppShell />
}
