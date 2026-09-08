import type { ThemePreference } from './shared/types'

export type ResolvedTheme = 'light' | 'dark'

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference
  return systemPrefersDark() ? 'dark' : 'light'
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference)
  document.documentElement.dataset.theme = resolved
  return resolved
}

/** 订阅系统外观变化；仅 preference === 'system' 时回调。返回取消函数。 */
export function watchSystemTheme(
  preference: ThemePreference,
  onChange: (resolved: ResolvedTheme) => void,
): () => void {
  if (preference !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
    return () => undefined
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => onChange(resolveTheme('system'))
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

/** 设置页保存主题后通知根组件立即切换。 */
export function notifyThemeChanged(theme: ThemePreference): void {
  window.dispatchEvent(new CustomEvent('packforge:theme', { detail: theme }))
}
