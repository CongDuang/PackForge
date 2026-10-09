import { spawn } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import { defaultReadLocalProperties, resolveAndroidSdkPath } from './env.ts'

export type AdbDevice = {
  serial: string
  model?: string
}

const SERIAL_RE = /^[A-Za-z0-9._:-]+$/

export function parseAdbDevices(output: string): AdbDevice[] {
  const devices: AdbDevice[] = []
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('List of devices') || line.startsWith('*')) continue
    const parts = line.split(/\s+/)
    const serial = parts[0]
    const state = parts[1]
    if (!serial || state !== 'device') continue
    const modelToken = parts.find((item) => item.startsWith('model:'))
    const model = modelToken?.slice('model:'.length).replace(/_/g, ' ')
    devices.push(model ? { serial, model } : { serial })
  }
  return devices
}

export function isSignatureConflict(output: string): boolean {
  const text = output.toLowerCase()
  return (
    text.includes('install_failed_update_incompatible') || text.includes('signatures do not match')
  )
}

export function parsePackageNameFromBadging(output: string): string | null {
  const match = /package:\s+name='([^']+)'/.exec(output)
  return match?.[1] ?? null
}

export function parsePackageNameFromInstallError(output: string): string | null {
  const match = /Package\s+([A-Za-z][\w.]*)\s+signatures/i.exec(output)
  return match?.[1] ?? null
}

/** 比较 build-tools 目录名。正数表示 a 比 b 新。 */
export function compareBuildToolsVersion(a: string, b: string): number {
  const pa = a.split(/[^0-9]+/).filter(Boolean).map(Number)
  const pb = b.split(/[^0-9]+/).filter(Boolean).map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) return da - db
  }
  return 0
}

export function findAdbBinary(sdkRoot: string, platform: NodeJS.Platform = process.platform): string | null {
  const name = platform === 'win32' ? 'adb.exe' : 'adb'
  const file = path.join(sdkRoot, 'platform-tools', name)
  return existsSync(file) ? file : null
}

export function findAaptBinary(sdkRoot: string, platform: NodeJS.Platform = process.platform): string | null {
  const root = path.join(sdkRoot, 'build-tools')
  if (!existsSync(root)) return null
  const name = platform === 'win32' ? 'aapt.exe' : 'aapt'
  let best: { ver: string; file: string } | null = null
  let entries: string[]
  try {
    entries = readdirSync(root)
  } catch {
    return null
  }
  for (const ver of entries) {
    const file = path.join(root, ver, name)
    if (!existsSync(file)) continue
    try {
      if (!statSync(file).isFile()) continue
    } catch {
      continue
    }
    if (!best || compareBuildToolsVersion(ver, best.ver) > 0) best = { ver, file }
  }
  return best?.file ?? null
}

function runCommand(
  bin: string,
  args: string[],
  timeoutMs = 120_000,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('命令超时'))
    }, timeoutMs)
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
  })
}

function resolveSdk(projectPath: string, settingsAndroidSdkPath: string): Result<string> {
  const sdk = resolveAndroidSdkPath(projectPath, {
    settingsAndroidSdkPath,
    processEnv: process.env,
    readLocalProperties: defaultReadLocalProperties,
  })
  if (!sdk.ok) {
    return err(appError('E_NO_SDK', '无法解析 Android SDK', sdk.diagnosis.join('；')))
  }
  return ok(sdk.data.androidHome)
}

function clip(text: string, max = 400): string {
  const one = text.replace(/\s+/g, ' ').trim()
  if (one.length <= max) return one
  return `${one.slice(0, max)}…`
}

export async function listAdbDevices(input: {
  projectPath: string
  settingsAndroidSdkPath: string
}): Promise<Result<{ devices: AdbDevice[]; aaptAvailable: boolean }>> {
  const sdk = resolveSdk(input.projectPath, input.settingsAndroidSdkPath)
  if (!sdk.ok) return sdk
  const adb = findAdbBinary(sdk.data)
  if (!adb) {
    return err(appError('E_INSTALL_FAILED', '未找到 platform-tools/adb', sdk.data))
  }
  try {
    const result = await runCommand(adb, ['devices', '-l'])
    const text = `${result.stdout}\n${result.stderr}`
    if (result.code !== 0) {
      return err(appError('E_INSTALL_FAILED', '无法列出设备', clip(text)))
    }
    return ok({
      devices: parseAdbDevices(text),
      aaptAvailable: findAaptBinary(sdk.data) !== null,
    })
  } catch (cause) {
    return err(
      appError('E_INSTALL_FAILED', '无法列出设备', cause instanceof Error ? cause.message : String(cause)),
    )
  }
}

async function readPackageName(
  aapt: string | null,
  apkPath: string,
  override?: string,
): Promise<string | null> {
  const given = override?.trim()
  if (given) return given
  if (!aapt) return null
  const dumped = await runCommand(aapt, ['dump', 'badging', apkPath])
  return parsePackageNameFromBadging(`${dumped.stdout}\n${dumped.stderr}`)
}

export async function installApk(input: {
  apkPath: string
  serial: string
  uninstallSamePackageFirst: boolean
  projectPath: string
  settingsAndroidSdkPath: string
  packageName?: string
}): Promise<Result<{ packageName: string | null }>> {
  const apkPath = path.resolve(String(input.apkPath ?? ''))
  if (!apkPath.toLowerCase().endsWith('.apk') || !existsSync(apkPath) || !statSync(apkPath).isFile()) {
    return err(appError('E_INSTALL_FAILED', 'APK 不存在', apkPath))
  }
  const serial = String(input.serial ?? '').trim()
  if (!SERIAL_RE.test(serial)) {
    return err(appError('E_INSTALL_FAILED', '设备序列号无效', serial))
  }

  const sdk = resolveSdk(input.projectPath, input.settingsAndroidSdkPath)
  if (!sdk.ok) return sdk
  const adb = findAdbBinary(sdk.data)
  if (!adb) {
    return err(appError('E_INSTALL_FAILED', '未找到 platform-tools/adb', sdk.data))
  }

  let packageName: string | null = null
  try {
    packageName = await readPackageName(findAaptBinary(sdk.data), apkPath, input.packageName)
  } catch (cause) {
    return err(
      appError(
        'E_INSTALL_FAILED',
        '无法读取 APK 包名',
        cause instanceof Error ? cause.message : String(cause),
      ),
    )
  }

  if (input.uninstallSamePackageFirst) {
    if (!packageName) {
      return err(appError('E_INSTALL_FAILED', '无法读取 APK 包名，不能先卸载'))
    }
    try {
      await runCommand(adb, ['-s', serial, 'uninstall', packageName])
    } catch (cause) {
      return err(
        appError(
          'E_INSTALL_FAILED',
          '卸载失败',
          cause instanceof Error ? cause.message : String(cause),
        ),
      )
    }
  }

  let installed: { code: number | null; stdout: string; stderr: string }
  try {
    installed = await runCommand(adb, ['-s', serial, 'install', '-r', apkPath])
  } catch (cause) {
    return err(
      appError('E_INSTALL_FAILED', '安装失败', cause instanceof Error ? cause.message : String(cause)),
    )
  }

  const combined = `${installed.stdout}\n${installed.stderr}`
  const success = installed.code === 0 && /Success/i.test(combined)
  if (success) return ok({ packageName })

  if (isSignatureConflict(combined)) {
    const fromError = parsePackageNameFromInstallError(combined)
    return err(
      appError(
        'E_INSTALL_CONFLICT',
        '设备上已有同包名应用且签名不一致',
        fromError ?? packageName ?? undefined,
      ),
    )
  }

  return err(appError('E_INSTALL_FAILED', '安装失败', clip(combined) || `exit ${installed.code ?? 'null'}`))
}
