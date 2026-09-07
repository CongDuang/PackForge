import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import Toggle from '../components/ui/Toggle'
import { PRIVACY_POINTS, PRODUCT_NAME, PRODUCT_SLOGAN } from '../shared/about'
import type { AppSettings } from '../shared/types'

const SAVE_DEBOUNCE_MS = 400

function packforgeApi() {
  return window.packforge
}

export default function SettingsPage() {
  const [sdkPath, setSdkPath] = useState('')
  const [allowFallback, setAllowFallback] = useState(false)
  const [gradleArgs, setGradleArgs] = useState('')
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
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
      setAllowFallback(result.data.allowSystemJdkFallback)
      setGradleArgs(result.data.advancedGradleArgs)
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

  async function toggleFallback(next: boolean) {
    flushPending()
    setAllowFallback(next)
    await persist({ allowSystemJdkFallback: next })
    await refreshEnvDiag()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">设置</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            配置 Android SDK 路径与高级 Gradle 参数。更改写入本机，不改工程文件。
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

      <section className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
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
          <p className="text-[11px] leading-4 text-[var(--text-muted)]">
            优先使用上方 SDK 路径；其次环境变量；再次最近工程的 local.properties（只读）。
          </p>
        </div>
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

      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">关于</h2>
        <p className="mt-2 text-sm text-[var(--text-primary)]">{PRODUCT_NAME}</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{PRODUCT_SLOGAN}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">版本 {__APP_VERSION__}</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-5 text-[var(--text-muted)]">
          {PRIVACY_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
