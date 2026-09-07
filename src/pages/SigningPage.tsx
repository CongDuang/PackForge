import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import Toggle from '../components/ui/Toggle'
import { composeSigningInjectArgs } from '../shared/signingArgs'
import type { SigningProfileMeta } from '../shared/types'

function packforgeApi() {
  return window.packforge
}

const emptyForm = {
  id: '',
  name: '',
  storeFile: '',
  keyAlias: '',
  storeType: '',
  storePassword: '',
  keyPassword: '',
  keyPasswordSameAsStore: true,
}

export default function SigningPage() {
  const [profiles, setProfiles] = useState<SigningProfileMeta[]>([])
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [previewArgs, setPreviewArgs] = useState<string[]>([])
  const [plainArgs, setPlainArgs] = useState<string[]>([])
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const api = packforgeApi()
    if (!api) {
      setLoadError('签名管理仅在桌面应用内可用')
      return
    }
    const listed = await api.listSigningProfiles()
    if (!listed.ok) {
      setLoadError(listed.error.message)
      return
    }
    setLoadError(null)
    setProfiles(listed.data)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const localPreview = useMemo(() => {
    if (!form.storeFile.trim() || !form.keyAlias.trim()) return { args: [] as string[], previewArgs: [] as string[] }
    const storePassword = form.storePassword
    const keyPassword = form.keyPasswordSameAsStore ? form.storePassword : form.keyPassword
    if (!storePassword || !keyPassword) return { args: [] as string[], previewArgs: [] as string[] }
    return composeSigningInjectArgs({
      storeFile: form.storeFile.trim(),
      storePassword,
      keyAlias: form.keyAlias.trim(),
      keyPassword,
      storeType: form.storeType,
    })
  }, [form])

  const shownArgs = reveal ? (localPreview.args.length > 0 ? localPreview.args : plainArgs) : localPreview.previewArgs.length > 0 ? localPreview.previewArgs : previewArgs

  async function loadPreview(id: string | null) {
    const api = packforgeApi()
    if (!api) return
    const result = await api.buildSigningInjectArgs(id)
    if (!result.ok) {
      setPreviewArgs([])
      setPlainArgs([])
      return
    }
    setPreviewArgs(result.data.previewArgs)
    setPlainArgs(result.data.args)
  }

  function selectProfile(profile: SigningProfileMeta) {
    setForm({
      id: profile.id,
      name: profile.name,
      storeFile: profile.storeFile,
      keyAlias: profile.keyAlias,
      storeType: profile.storeType ?? '',
      storePassword: '',
      keyPassword: '',
      keyPasswordSameAsStore: profile.keyPasswordSameAsStore,
    })
    setReveal(false)
    void loadPreview(profile.id)
  }

  function resetForm() {
    setForm(emptyForm)
    setReveal(false)
    setPreviewArgs([])
    setPlainArgs([])
  }

  async function browseStore() {
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '签名管理仅在桌面应用内可用' })
      return
    }
    const picked = await api.pickFile()
    if (!picked.ok) {
      setNotice({ kind: 'error', text: picked.error.message })
      return
    }
    if (!picked.data) return
    setForm((current) => ({ ...current, storeFile: picked.data }))
  }

  async function save() {
    const api = packforgeApi()
    if (!api) {
      setNotice({ kind: 'error', text: '签名管理仅在桌面应用内可用' })
      return
    }
    setBusy(true)
    try {
      const saved = await api.upsertSigningProfile({
        id: form.id || undefined,
        name: form.name,
        storeFile: form.storeFile,
        keyAlias: form.keyAlias,
        storeType: form.storeType || undefined,
        storePassword: form.storePassword,
        keyPassword: form.keyPasswordSameAsStore ? form.storePassword : form.keyPassword,
        keyPasswordSameAsStore: form.keyPasswordSameAsStore,
      })
      if (!saved.ok) {
        setNotice({ kind: 'error', text: `${saved.error.code}：${saved.error.message}` })
        return
      }
      setForm((current) => ({ ...current, id: saved.data.id, storePassword: '', keyPassword: '' }))
      setNotice({ kind: 'ok', text: '已保存，密码只写入系统钥匙串' })
      await refresh()
      await loadPreview(saved.data.id)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!form.id) return
    const confirmed = window.confirm('删除档案将同时清除钥匙串中的密码，keystore 文件仍留在磁盘。确定删除？')
    if (!confirmed) return
    const api = packforgeApi()
    if (!api) return
    const result = await api.deleteSigningProfile(form.id)
    if (!result.ok) {
      setNotice({ kind: 'error', text: `${result.error.code}：${result.error.message}` })
      return
    }
    setNotice({ kind: 'ok', text: '已删除档案与钥匙串条目' })
    resetForm()
    await refresh()
  }

  function tryReveal() {
    if (reveal) {
      setReveal(false)
      return
    }
    if (!window.confirm('将显示注入参数中的明文密码。确定继续？')) return
    setReveal(true)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">签名管理</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            登记 keystore 路径、别名与密码。密码只进系统钥匙串，打包时用 AGP 注入参数，不改工程脚本。
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

      {loadError ? <p className="text-sm text-[var(--danger)]">{loadError}</p> : null}

      <section className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">档案</h2>
          <Button onClick={resetForm}>新建</Button>
        </div>
        {profiles.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--text-muted)]">还没有档案。可选择不注入签名，或在下方登记一个。</p>
        ) : (
          <ul className="space-y-1">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  onClick={() => selectProfile(profile)}
                  className={[
                    'w-full rounded-md px-3 py-2 text-left text-sm outline-none',
                    'focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                    form.id === profile.id
                      ? 'bg-[var(--bg-base)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)]',
                  ].join(' ')}
                >
                  <span className="font-medium text-[var(--text-primary)]">{profile.name}</span>
                  <span className="ml-2 font-mono text-xs">{profile.keyAlias}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">{form.id ? '编辑档案' : '新建档案'}</h2>
        <TextField
          id="sign-name"
          label="显示名称"
          value={form.name}
          placeholder="正式包"
          onChange={(name) => setForm((current) => ({ ...current, name }))}
        />
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <TextField
              id="sign-store"
              label="Keystore 路径"
              value={form.storeFile}
              placeholder="/keys/upload.jks"
              onChange={(storeFile) => setForm((current) => ({ ...current, storeFile }))}
            />
          </div>
          <Button className="shrink-0" onClick={() => void browseStore()}>
            浏览…
          </Button>
        </div>
        <TextField
          id="sign-alias"
          label="Key 别名"
          value={form.keyAlias}
          placeholder="upload"
          onChange={(keyAlias) => setForm((current) => ({ ...current, keyAlias }))}
        />
        <TextField
          id="sign-type"
          label="Store 类型（可选）"
          value={form.storeType}
          placeholder="PKCS12"
          hint="留空则不注入 store.type"
          onChange={(storeType) => setForm((current) => ({ ...current, storeType }))}
        />
        <TextField
          id="sign-store-pass"
          label="Store 密码"
          type="password"
          value={form.storePassword}
          hint={form.id ? '编辑时留空则保留钥匙串中的原密码' : undefined}
          onChange={(storePassword) => setForm((current) => ({ ...current, storePassword }))}
        />
        <Toggle
          id="sign-same-pass"
          label="Key 密码与 Store 相同"
          checked={form.keyPasswordSameAsStore}
          onChange={(keyPasswordSameAsStore) => setForm((current) => ({ ...current, keyPasswordSameAsStore }))}
        />
        {form.keyPasswordSameAsStore ? null : (
          <TextField
            id="sign-key-pass"
            label="Key 密码"
            type="password"
            value={form.keyPassword}
            onChange={(keyPassword) => setForm((current) => ({ ...current, keyPassword }))}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy} onClick={() => void save()}>
            保存
          </Button>
          <Button disabled={!form.id || busy} onClick={() => void remove()}>
            删除
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">注入参数预览</h2>
          <Button onClick={tryReveal}>{reveal ? '隐藏密钥' : '显示密钥'}</Button>
        </div>
        {shownArgs.length === 0 ? (
          <p className="text-xs leading-5 text-[var(--text-muted)]">不注入签名参数。保存档案或填写表单后可预览。</p>
        ) : (
          <pre className="overflow-x-auto font-mono text-xs leading-5 text-[var(--text-muted)]">
            {shownArgs.join('\n')}
          </pre>
        )}
      </section>
    </div>
  )
}
