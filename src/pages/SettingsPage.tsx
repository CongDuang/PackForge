import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import Toggle from '../components/ui/Toggle'
import { PRIVACY_POINTS, PRODUCT_NAME, PRODUCT_SLOGAN } from '../shared/about'
import { clampVariantDiscoverTimeoutSec, type AppSettings, type ThemePreference } from '../shared/types'
import { useWorkbenchStore } from '../store/workbenchStore'
import { notifyThemeChanged } from '../theme'

const SAVE_DEBOUNCE_MS = 400

const SETTINGS_SECTIONS = [
  { id: 'settings-appearance', label: '外观' },
  { id: 'settings-env', label: '环境' },
  { id: 'settings-about', label: '关于' },
] as const

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id']

function packforgeApi() {
  return window.packforge
}

export default function SettingsPage() {
  const [sdkPath, setSdkPath] = useState('')
  const [gradleUserHome, setGradleUserHome] = useState('')
  const [allowFallback, setAllowFallback] = useState(false)
  const [gradleArgs, setGradleArgs] = useState('')
  const [variantTimeout, setVariantTimeout] = useState('30')
  const [theme, setTheme] = useState<ThemePreference>('system')
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('settings-appearance')
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const versionClickRef = useRef({ count: 0, timer: undefined as ReturnType<typeof setTimeout> | undefined })

  const [loadError, setLoadError] = useState<string | null>(null)
  const [envDiag, setEnvDiag] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'error'
    androidHome?: string
    javaHome?: string
    lines: string[]
    errorText?: string
  }>({ status: 'idle', lines: [] })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingRef = useRef<Partial<AppSettings>>({})

  const persist = useCallback(async (partial: Partial<AppSettings>) => {
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '设置仅在桌面应用内可用' })
      return
    }
    const result = await api.setSettings(partial)
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error.message })
      return
    }
    setNotice({ kind: 'ok', text: '已保存' })
  }, [])

  const flushPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = undefined
    }
    const pending = pendingRef.current
    pendingRef.current = {}
    if (Object.keys(pending).length > 0) {
      void persist(pending)
    }
  }, [persist])

  const persistSoon = useCallback(
    (partial: Partial<AppSettings>) => {
      pendingRef.current = { ...pendingRef.current, ...partial }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = undefined
        const pending = pendingRef.current
        pendingRef.current = {}
        void persist(pending)
      }, SAVE_DEBOUNCE_MS)
    },
    [persist],
  )

  const refreshEnvDiag = useCallback(async () => {
    const api = packforgeApi()
    if (!api) {
      setEnvDiag({ status: 'error', lines: [], errorText: '设置仅在桌面应用内可用' })
      return
    }
    setEnvDiag((prev) => ({ ...prev, status: 'loading' }))
    const [recent, jdks] = await Promise.all([api.listRecentProjects(), api.listJdks()])
    const projectPath = recent.ok && recent.data[0]?.path ? recent.data[0].path : ''
    const jdkId = jdks.ok ? jdks.data.defaultId : null
    const result = await api.resolveBuildEnv({ projectPath, jdkId })
    if (!result.ok) {
      const detail = result.error.detail
      setEnvDiag({
        status: 'error',
        lines: detail ? detail.split('；').filter(Boolean) : [],
        errorText: `${result.error.code}：${result.error.message}`,
      })
      return
    }
    setEnvDiag({
      status: 'ok',
      androidHome: result.data.androidHome,
      javaHome: result.data.javaHome,
      lines: result.data.diagnosis,
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const api = packforgeApi()
    if (!api) {
      setLoadError('设置仅在桌面应用内可用')
      return
    }
    void api.getSettings().then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setLoadError(result.error.message)
        return
      }
      setSdkPath(result.data.androidSdkPath)
      setGradleUserHome(result.data.gradleUserHome ?? '')
      setAllowFallback(result.data.allowSystemJdkFallback)
      setGradleArgs(result.data.advancedGradleArgs)
      setVariantTimeout(String(result.data.variantDiscoverTimeoutSec ?? 30))
      setTheme(result.data.theme ?? 'system')
    })
    void refreshEnvDiag()
    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const pending = pendingRef.current
      pendingRef.current = {}
      const apiOnLeave = packforgeApi()
      if (Object.keys(pending).length > 0 && apiOnLeave) {
        void apiOnLeave.setSettings(pending)
      }
    }
  }, [refreshEnvDiag])

  useEffect(() => {
    const id = useWorkbenchStore.getState().settingsAnchor
    if (!id) return
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'center' })
      useWorkbenchStore.getState().setSettingsAnchor(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const root = pageRef.current?.parentElement
    if (!root) return
    const nodes = SETTINGS_SECTIONS.map((item) => document.getElementById(item.id)).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    )
    if (nodes.length === 0) return
    const visible = new Map<string, boolean>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting)
        const current = SETTINGS_SECTIONS.find((item) => visible.get(item.id))
        if (current) setActiveSection(current.id)
      },
      { root, rootMargin: '0px 0px -60% 0px', threshold: 0 },
    )
    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function jumpToSection(id: SettingsSectionId) {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }

  async function browseSdk() {
    flushPending()
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '设置仅在桌面应用内可用' })
      return
    }
    const picked = await api.pickDirectory()
    if (!picked.ok) {
      setNotice({ kind: 'error', text: picked.error.message })
      return
    }
    if (!picked.data) return
    setSdkPath(picked.data)
    await persist({ androidSdkPath: picked.data })
    await refreshEnvDiag()
  }

  async function browseGradleUserHome() {
    flushPending()
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '设置仅在桌面应用内可用' })
      return
    }
    const picked = await api.pickDirectory()
    if (!picked.ok) {
      setNotice({ kind: 'error', text: picked.error.message })
      return
    }
    if (!picked.data) return
    setGradleUserHome(picked.data)
    await persist({ gradleUserHome: picked.data })
    await refreshEnvDiag()
  }

  async function toggleFallback(next: boolean) {
    flushPending()
    setAllowFallback(next)
    await persist({ allowSystemJdkFallback: next })
    await refreshEnvDiag()
  }

  async function changeTheme(next: ThemePreference) {
    flushPending()
    setTheme(next)
    notifyThemeChanged(next)
    await persist({ theme: next })
  }

  function onVersionClick() {
    const state = versionClickRef.current
    if (state.timer) clearTimeout(state.timer)
    state.count += 1
    state.timer = setTimeout(() => {
      state.count = 0
      state.timer = undefined
    }, 2000)
    if (state.count < 7) return
    state.count = 0
    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = undefined
    }
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '设置仅在桌面应用内可用' })
      return
    }
    void api.toggleDevTools().then((result) => {
      if (!result.ok) {
        setNotice({ kind: 'error', text: result.error.message })
        return
      }
      setNotice({ kind: 'ok', text: '已切换开发者工具' })
    })
  }

  return (
    <div ref={pageRef} className="flex w-full max-w-none gap-6">
      <nav aria-label="设置目录" className="sticky top-0 flex w-28 shrink-0 flex-col gap-1 self-start">
        {SETTINGS_SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => jumpToSection(item.id)}
            className={[
              'cursor-pointer rounded px-2 py-1.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              activeSection === item.id
                ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] font-medium text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">设置</h1>
          <p className="mt-2 select-none text-sm leading-6 text-[var(--text-muted)]">
            配置外观、Android SDK 路径与高级 Gradle 参数。更改写入本机，不改工程文件。
          </p>
        </div>
        {notice ? (
          <p
            role="status"
            className={[
              'shrink-0 pt-1 text-sm',
              notice.kind === 'ok' ? 'text-[var(--accent)]' : 'text-[var(--danger)]',
            ].join(' ')}
          >
            {notice.text}
          </p>
        ) : null}
      </div>

      {loadError ? (
        <p className="text-sm text-[var(--danger)]">无法读取设置：{loadError}</p>
      ) : null}

      <section
        id="settings-appearance"
        className="scroll-mt-4 space-y-4 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4"
      >
        <h2 className="text-sm font-medium text-[var(--text-primary)]">外观</h2>
        <p className="select-none text-xs leading-5 text-[var(--text-muted)]">
          浅色、深色或跟随系统。默认跟随系统。
        </p>
        <div className="inline-flex w-fit gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-0.5">
          {(
            [
              { id: 'system', label: '跟随系统' },
              { id: 'light', label: '浅色' },
              { id: 'dark', label: '深色' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void changeTheme(item.id)}
              className={[
                'cursor-pointer rounded px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                theme === item.id
                  ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section
        id="settings-env"
        className="scroll-mt-4 space-y-4 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4"
      >
        <h2 className="text-sm font-medium text-[var(--text-primary)]">环境</h2>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <TextField
              id="android-sdk-path"
              label="Android SDK 路径"
              value={sdkPath}
              placeholder="/Users/you/Library/Android/sdk"
              onChange={(value) => {
                setSdkPath(value)
                persistSoon({ androidSdkPath: value })
              }}
              onBlur={() => {
                flushPending()
                void refreshEnvDiag()
              }}
            />
          </div>
          <Button className="shrink-0" onClick={() => void browseSdk()}>
            浏览…
          </Button>
        </div>
        <div id="gradle-user-home" className="scroll-mt-4 space-y-1.5">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                id="gradle-user-home-path"
                label="Gradle 用户目录"
                value={gradleUserHome}
                placeholder="留空则跟随 GRADLE_USER_HOME"
                onChange={(value) => {
                  setGradleUserHome(value)
                  persistSoon({ gradleUserHome: value })
                }}
                onBlur={() => {
                  flushPending()
                  void refreshEnvDiag()
                }}
              />
            </div>
            <Button className="shrink-0" onClick={() => void browseGradleUserHome()}>
              浏览…
            </Button>
          </div>
          <p className="select-none text-xs leading-5 text-[var(--text-muted)]">
            留空时仍使用环境变量；macOS / Linux 从访达启动时会用登录 shell 询问一次。填写后以这里的路径为准。
          </p>
        </div>
        <Toggle
          id="allow-system-jdk"
          label="允许回退系统 JDK"
          checked={allowFallback}
          onChange={(next) => void toggleFallback(next)}
          hint="默认关闭。开启后，未导入 JDK 时可回退本机 JAVA_HOME。"
        />
        <div className="space-y-2 rounded-md border border-[var(--border)]/70 bg-[var(--bg-base)]/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-medium text-[var(--text-primary)]">当前解析到的环境</h3>
            <Button className="shrink-0" onClick={() => void refreshEnvDiag()}>
              重新检测
            </Button>
          </div>
          {envDiag.status === 'loading' ? (
            <p className="text-xs text-[var(--text-muted)]">检测中…</p>
          ) : null}
          {envDiag.status === 'ok' ? (
            <div className="space-y-1 text-xs leading-5 text-[var(--text-muted)]">
              <p>
                <span className="text-[var(--text-primary)]">SDK：</span>
                {envDiag.androidHome}
              </p>
              <p>
                <span className="text-[var(--text-primary)]">JDK：</span>
                {envDiag.javaHome}
              </p>
            </div>
          ) : null}
          {envDiag.status === 'error' && envDiag.errorText ? (
            <p className="text-xs text-[var(--danger)]">{envDiag.errorText}</p>
          ) : null}
          {envDiag.lines.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--text-muted)]">
              {envDiag.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <p className="select-none text-[11px] leading-4 text-[var(--text-muted)]">
            优先使用上方 SDK 路径；其次环境变量；再次最近工程的 local.properties（只读）。
          </p>
        </div>
        <TextField
          id="variant-discover-timeout"
          label="变体发现超时"
          type="number"
          suffix="秒"
          inputClassName="w-28"
          value={variantTimeout}
          placeholder="30"
          hint="刷新变体时等待 gradlew tasks 的最长时间，5–300 秒。到时或点「改用脚本」则改读模块的 build.gradle。"
          onChange={(value) => {
            setVariantTimeout(value)
            const sec = Number(value.trim())
            if (!Number.isInteger(sec) || sec < 5 || sec > 300) return
            persistSoon({ variantDiscoverTimeoutSec: sec })
          }}
          onBlur={() => {
            const sec = clampVariantDiscoverTimeoutSec(variantTimeout)
            setVariantTimeout(String(sec))
            flushPending()
            void persist({ variantDiscoverTimeoutSec: sec })
          }}
        />
        <TextField
          id="advanced-gradle-args"
          label="高级 Gradle 参数"
          value={gradleArgs}
          placeholder="--stacktrace"
          multiline
          hint="将原样附加到打包命令。密码类参数请勿写在此处。"
          onChange={(value) => {
            setGradleArgs(value)
            persistSoon({ advancedGradleArgs: value })
          }}
          onBlur={flushPending}
        />
      </section>

      <section
        id="settings-about"
        className="scroll-mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4"
      >
        <h2 className="text-sm font-medium text-[var(--text-primary)]">关于</h2>
        <p className="mt-2 text-sm text-[var(--text-primary)]">{PRODUCT_NAME}</p>
        <p className="mt-1 select-none text-sm text-[var(--text-muted)]">{PRODUCT_SLOGAN}</p>
        <button
          type="button"
          className="mt-1 cursor-default text-left text-xs text-[var(--text-muted)] outline-none"
          onClick={onVersionClick}
        >
          版本 {__APP_VERSION__}
        </button>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-5 text-[var(--text-muted)] select-none">
          {PRIVACY_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
      </div>
    </div>
  )
}
