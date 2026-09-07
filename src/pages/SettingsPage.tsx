import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import Toggle from '../components/ui/Toggle'
import { PRIVACY_POINTS, PRODUCT_NAME, PRODUCT_SLOGAN } from '../shared/about'
import type { AppSettings } from '../shared/types'

const SAVE_DEBOUNCE_MS = 400

export default function SettingsPage() {
  const [sdkPath, setSdkPath] = useState('')
  const [allowFallback, setAllowFallback] = useState(false)
  const [gradleArgs, setGradleArgs] = useState('')
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingRef = useRef<Partial<AppSettings>>({})

  const persist = useCallback(async (partial: Partial<AppSettings>) => {
    const result = await window.packforge.setSettings(partial)
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

  useEffect(() => {
    let cancelled = false
    if (!window.packforge) {
      setLoadError('设置仅在桌面应用内可用')
      return
    }
    void window.packforge.getSettings().then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setLoadError(result.error.message)
        return
      }
      setSdkPath(result.data.androidSdkPath)
      setAllowFallback(result.data.allowSystemJdkFallback)
      setGradleArgs(result.data.advancedGradleArgs)
    })
    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const pending = pendingRef.current
      pendingRef.current = {}
      if (Object.keys(pending).length > 0 && window.packforge) {
        void window.packforge.setSettings(pending)
      }
    }
  }, [])

  async function browseSdk() {
    flushPending()
    const picked = await window.packforge.pickDirectory()
    if (!picked.ok) {
      setNotice({ kind: 'error', text: picked.error.message })
      return
    }
    if (!picked.data) return
    setSdkPath(picked.data)
    await persist({ androidSdkPath: picked.data })
  }

  async function toggleFallback(next: boolean) {
    flushPending()
    setAllowFallback(next)
    await persist({ allowSystemJdkFallback: next })
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
              onBlur={flushPending}
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
