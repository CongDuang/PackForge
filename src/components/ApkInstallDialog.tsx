import { useEffect, useState } from 'react'
import type { AdbDevice } from '../shared/api'
import { formatUserError } from '../shared/errorHints'
import Button from './ui/Button'

type ApkInstallDialogProps = {
  apkPath: string
  projectPath: string
  onClose: () => void
  onInstalled: (serial: string) => void
}

export default function ApkInstallDialog({
  apkPath,
  projectPath,
  onClose,
  onInstalled,
}: ApkInstallDialogProps) {
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [aaptAvailable, setAaptAvailable] = useState(true)
  const [serial, setSerial] = useState('')
  const [uninstallFirst, setUninstallFirst] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [conflictPackage, setConflictPackage] = useState<string | null>(null)
  const [conflictOpen, setConflictOpen] = useState(false)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const api = window.packforge
      if (!api) return
      setBusy(true)
      setNotice('')
      const listed = await api.listAdbDevices(projectPath)
      if (cancelled) return
      setBusy(false)
      if (!listed.ok) {
        setDevices([])
        setNotice(formatUserError(listed.error.code, listed.error.message))
        return
      }
      setDevices(listed.data.devices)
      setAaptAvailable(listed.data.aaptAvailable)
      setSerial((current) => {
        if (listed.data.devices.some((item) => item.serial === current)) return current
        return listed.data.devices[0]?.serial ?? ''
      })
      if (listed.data.devices.length === 0) {
        setNotice('未检测到已授权设备。请连接设备并打开 USB 调试。')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [projectPath, reloadKey])

  async function install(uninstallSamePackageFirst: boolean, packageName?: string) {
    const api = window.packforge
    if (!api || !serial) return
    setBusy(true)
    setNotice('')
    const result = await api.installApk({
      apkPath,
      serial,
      uninstallSamePackageFirst,
      projectPath,
      packageName,
    })
    setBusy(false)
    if (result.ok) {
      onInstalled(serial)
      return
    }
    if (result.error.code === 'E_INSTALL_CONFLICT') {
      setConflictPackage(result.error.detail ?? packageName ?? null)
      setConflictOpen(true)
      setNotice(formatUserError(result.error.code, result.error.message))
      return
    }
    setNotice(formatUserError(result.error.code, result.error.message))
  }

  const fileName = apkPath.split(/[/\\]/).pop() ?? apkPath

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apk-install-title"
        className="w-full max-w-lg rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4"
      >
        <h2 id="apk-install-title" className="text-sm font-medium text-[var(--text-primary)]">
          安装 APK
        </h2>
        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{fileName}</p>

        <div className="mt-3 max-h-48 space-y-1 overflow-auto">
          {devices.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">没有状态为 device 的设备。</p>
          ) : (
            devices.map((device) => (
              <label
                key={device.serial}
                className="flex cursor-pointer items-center gap-2 rounded border border-[var(--border)]/80 bg-[var(--bg-base)]/30 px-2 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <input
                  type="radio"
                  name="adb-device"
                  checked={serial === device.serial}
                  onChange={() => setSerial(device.serial)}
                />
                <span className="font-mono">{device.serial}</span>
                {device.model ? <span className="text-[var(--text-muted)]">{device.model}</span> : null}
              </label>
            ))
          )}
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={uninstallFirst && aaptAvailable}
            disabled={!aaptAvailable || busy}
            onChange={(event) => setUninstallFirst(event.target.checked)}
          />
          安装前卸载同包名应用
        </label>
        {!aaptAvailable ? (
          <p className="mt-1 text-xs text-[var(--warn)]">
            未找到 build-tools 中的 aapt，安装前卸载不可用。签名冲突时仍可在确认后卸载。
          </p>
        ) : null}

        {notice ? <p className="mt-3 text-xs text-[var(--warn)]">{notice}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button disabled={busy} onClick={() => setReloadKey((n) => n + 1)}>
            刷新设备
          </Button>
          <Button disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || devices.length === 0 || !serial}
            onClick={() => void install(uninstallFirst && aaptAvailable)}
          >
            {busy ? '请稍候…' : '安装'}
          </Button>
        </div>
      </div>

      {conflictOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-4"
          >
            <p className="text-sm text-[var(--text-primary)]">
              设备上已有同包名应用且签名不一致。是否卸载后重新安装？
            </p>
            {conflictPackage ? (
              <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">{conflictPackage}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                disabled={busy}
                onClick={() => setConflictOpen(false)}
              >
                否
              </Button>
              <Button
                variant="primary"
                disabled={busy || !conflictPackage}
                onClick={() => {
                  setConflictOpen(false)
                  void install(true, conflictPackage ?? undefined)
                }}
              >
                是
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
