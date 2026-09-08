import { useEffect, useMemo, useState } from 'react'
import { composeSigningInjectArgs } from '../shared/signingArgs'
import type { ProjectSigningBinding } from '../shared/types'
import Button from './ui/Button'
import TextField from './ui/TextField'
import Toggle from './ui/Toggle'

function packforgeApi() {
  return window.packforge
}

type ProjectSigningProps = {
  projectPath: string
  onBindingChange?: (binding: ProjectSigningBinding | null) => void
  onSaved?: () => void
  onCleared?: () => void
}

export default function ProjectSigning({
  projectPath,
  onBindingChange,
  onSaved,
  onCleared,
}: ProjectSigningProps) {
  const [inject, setInject] = useState(true)
  const [storeFile, setStoreFile] = useState('')
  const [keyAlias, setKeyAlias] = useState('')
  const [storeType, setStoreType] = useState('')
  const [storePassword, setStorePassword] = useState('')
  const [keyPassword, setKeyPassword] = useState('')
  const [samePassword, setSamePassword] = useState(true)
  const [binding, setBinding] = useState<ProjectSigningBinding | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [serverPreview, setServerPreview] = useState<string[]>([])
  const [serverPlain, setServerPlain] = useState<string[]>([])
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const api = packforgeApi()
    if (!api) {
      setLoaded(true)
      setNotice({ kind: 'error', text: '签名绑定仅在桌面应用内可用' })
      return
    }
    void api.getProjectSigning(projectPath).then(async (result) => {
      if (cancelled) return
      if (!result.ok) {
        setNotice({ kind: 'error', text: result.error.message })
        setLoaded(true)
        return
      }
      applyBinding(result.data)
      setLoaded(true)
      if (result.data) {
        await loadPreview(projectPath)
      }
    })
    return () => {
      cancelled = true
    }
  }, [projectPath])

  function applyBinding(next: ProjectSigningBinding | null) {
    setBinding(next)
    onBindingChange?.(next)
    setReveal(false)
    setStorePassword('')
    setKeyPassword('')
    if (!next) {
      setInject(true)
      setStoreFile('')
      setKeyAlias('')
      setStoreType('')
      setSamePassword(true)
      setServerPreview([])
      setServerPlain([])
      return
    }
    setInject(next.inject)
    if (next.inject && next.profile) {
      setStoreFile(next.profile.storeFile)
      setKeyAlias(next.profile.keyAlias)
      setStoreType(next.profile.storeType ?? '')
      setSamePassword(next.profile.keyPasswordSameAsStore)
    } else {
      setStoreFile('')
      setKeyAlias('')
      setStoreType('')
      setSamePassword(true)
    }
  }

  async function loadPreview(path: string) {
    const api = packforgeApi()
    if (!api) return
    const result = await api.buildSigningInjectArgs(path)
    if (!result.ok) {
      setServerPreview([])
      setServerPlain([])
      return
    }
    setServerPreview(result.data.previewArgs)
    setServerPlain(result.data.args)
  }

  const localPreview = useMemo(() => {
    if (!inject) return { args: [] as string[], previewArgs: [] as string[] }
    if (!storeFile.trim() || !keyAlias.trim()) return { args: [] as string[], previewArgs: [] as string[] }
    const storePwd = storePassword
    const keyPwd = samePassword ? storePassword : keyPassword
    if (!storePwd || !keyPwd) return { args: [] as string[], previewArgs: [] as string[] }
    return composeSigningInjectArgs({
      storeFile: storeFile.trim(),
      storePassword: storePwd,
      keyAlias: keyAlias.trim(),
      keyPassword: keyPwd,
      storeType,
    })
  }, [inject, storeFile, keyAlias, storePassword, keyPassword, samePassword, storeType])

  const shownArgs = reveal
    ? localPreview.args.length > 0
      ? localPreview.args
      : serverPlain
    : localPreview.previewArgs.length > 0
      ? localPreview.previewArgs
      : serverPreview

  async function browseStore() {
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '签名绑定仅在桌面应用内可用' })
      return
    }
    const picked = await api.pickFile()
    if (!picked.ok) {
      setNotice({ kind: 'error', text: picked.error.message })
      return
    }
    if (!picked.data) return
    setStoreFile(picked.data)
  }

  async function save() {
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '签名绑定仅在桌面应用内可用' })
      return
    }
    setBusy(true)
    try {
      const saved = await api.upsertProjectSigning(projectPath, {
        inject,
        storeFile: inject ? storeFile : undefined,
        keyAlias: inject ? keyAlias : undefined,
        storeType: inject ? storeType || undefined : undefined,
        storePassword: inject ? storePassword || undefined : undefined,
        keyPassword: inject ? (samePassword ? storePassword : keyPassword) || undefined : undefined,
        keyPasswordSameAsStore: inject ? samePassword : undefined,
      })
      if (!saved.ok) {
        setNotice({ kind: 'error', text: `${saved.error.code}：${saved.error.message}` })
        return
      }
      applyBinding(saved.data)
      setNotice({
        kind: 'ok',
        text: saved.data.inject ? '已绑定本工程签名，密码只写入系统钥匙串' : '已记住：本工程不注入签名',
      })
      await loadPreview(projectPath)
      onSaved?.()
    } finally {
      setBusy(false)
    }
  }

  async function clearBinding() {
    const confirmed = window.confirm('清除本工程签名绑定，并删除钥匙串中的密码。keystore 文件仍留在磁盘。确定？')
    if (!confirmed) return
    const api = packforgeApi()
    if (!api) return
    const result = await api.clearProjectSigning(projectPath)
    if (!result.ok) {
      setNotice({ kind: 'error', text: `${result.error.code}：${result.error.message}` })
      return
    }
    applyBinding(null)
    setNotice({ kind: 'ok', text: '已清除本工程签名绑定' })
    onCleared?.()
  }

  function tryReveal() {
    if (reveal) {
      setReveal(false)
      return
    }
    if (!window.confirm('将显示注入参数中的明文密码。确定继续？')) return
    setReveal(true)
  }

  if (!loaded) {
    return (
      <section className="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">本工程签名</h2>
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">读取绑定中…</p>
      </section>
    )
  }

  return (
    <section className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)]">本工程签名</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            与当前工程路径绑定并缓存。再次打开同路径自动带出。密码只进系统钥匙串。
          </p>
        </div>
        {notice ? (
          <p
            role="status"
            className={[
              'shrink-0 text-xs',
              notice.kind === 'ok' ? 'text-[var(--accent)]' : 'text-[var(--danger)]',
            ].join(' ')}
          >
            {notice.text}
          </p>
        ) : null}
      </div>

      {binding ? (
        <p className="text-xs text-[var(--text-muted)]">
          {binding.inject ? '已绑定注入签名' : '已绑定：不注入签名'}
        </p>
      ) : (
        <p className="text-xs text-[var(--warn)]">首次配置：请保存一套绑定，或选择不注入。</p>
      )}

      <Toggle
        id="project-sign-inject"
        label="不注入签名"
        checked={!inject}
        onChange={(noInject) => setInject(!noInject)}
        hint="例如工程已配置 debug 签名。选择后也会按路径记住。"
      />

      {inject ? (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                id="project-sign-store"
                label="Keystore 路径"
                value={storeFile}
                placeholder="/keys/upload.jks"
                onChange={setStoreFile}
              />
            </div>
            <Button className="shrink-0" onClick={() => void browseStore()}>
              浏览…
            </Button>
          </div>
          <TextField
            id="project-sign-alias"
            label="Key 别名"
            value={keyAlias}
            placeholder="upload"
            onChange={setKeyAlias}
          />
          <TextField
            id="project-sign-type"
            label="Store 类型（可选）"
            value={storeType}
            placeholder="PKCS12"
            hint="留空则不注入 store.type"
            onChange={setStoreType}
          />
          <TextField
            id="project-sign-store-pass"
            label="Store 密码"
            type="password"
            value={storePassword}
            hint={binding?.profile ? '编辑时留空则保留钥匙串中的原密码' : undefined}
            onChange={setStorePassword}
          />
          <Toggle
            id="project-sign-same"
            label="Key 密码与 Store 相同"
            checked={samePassword}
            onChange={setSamePassword}
          />
          {samePassword ? null : (
            <TextField
              id="project-sign-key-pass"
              label="Key 密码"
              type="password"
              value={keyPassword}
              onChange={setKeyPassword}
            />
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={busy} onClick={() => void save()}>
          保存绑定
        </Button>
        <Button disabled={!binding || busy} onClick={() => void clearBinding()}>
          清除绑定
        </Button>
        <Button onClick={tryReveal}>{reveal ? '隐藏密钥' : '显示密钥'}</Button>
      </div>

      <div>
        <h3 className="text-xs font-medium text-[var(--text-primary)]">注入参数预览</h3>
        {shownArgs.length === 0 ? (
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            当前不附加 android.injected.signing 参数。
          </p>
        ) : (
          <pre className="mt-1 overflow-x-auto font-mono text-xs leading-5 text-[var(--text-muted)]">
            {shownArgs.join('\n')}
          </pre>
        )}
      </div>
    </section>
  )
}
