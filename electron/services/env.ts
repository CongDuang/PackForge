import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import { resolveJdkHome } from './jdkDetect.ts'

export type ResolveBuildEnvInput = {
  projectPath: string
  jdkId: string | null
}

export type ResolvedBuildEnv = {
  env: Record<string, string>
  javaHome: string
  androidHome: string
  diagnosis: string[]
}

export type ResolveBuildEnvDeps = {
  settingsAndroidSdkPath: string
  allowSystemJdkFallback: boolean
  processEnv?: NodeJS.ProcessEnv
  platform?: NodeJS.Platform
  readLocalProperties?: (projectPath: string) => string | null
  jdkInstalls: { id: string; homePath: string }[]
}

/** 解析 local.properties 文本中的 sdk.dir（处理 \: 与 \\ 转义）。只读，不写文件。 */
export function readLocalPropertiesSdkDir(content: string): string | null {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('!')) continue
    const match = /^sdk\.dir\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    let value = (match[1] ?? '').trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    value = unescapeSdkDir(value)
    return value || null
  }
  return null
}

export function unescapeSdkDir(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]
    if (ch === '\\' && i + 1 < value.length) {
      out += value[i + 1]
      i += 1
      continue
    }
    out += ch
  }
  return out
}

export function isExistingDirectory(dirPath: string): boolean {
  const trimmed = dirPath.trim()
  if (!trimmed) return false
  try {
    return existsSync(trimmed) && statSync(trimmed).isDirectory()
  } catch {
    return false
  }
}

export type SdkResolution = {
  androidHome: string
  source: 'settings' | 'env' | 'local.properties'
}

/** SDK 优先级：设置路径 → ANDROID_HOME/SDK_ROOT → local.properties sdk.dir */
export function resolveAndroidSdkPath(
  projectPath: string,
  deps: {
    settingsAndroidSdkPath: string
    processEnv: NodeJS.ProcessEnv
    readLocalProperties: (projectPath: string) => string | null
  },
): { ok: true; data: SdkResolution; diagnosis: string[] } | { ok: false; diagnosis: string[] } {
  const diagnosis: string[] = []
  const settingsPath = deps.settingsAndroidSdkPath.trim()
  if (settingsPath) {
    const abs = path.resolve(settingsPath)
    if (isExistingDirectory(abs)) {
      diagnosis.push(`使用设置中的 Android SDK：${abs}`)
      return { ok: true, data: { androidHome: abs, source: 'settings' }, diagnosis }
    }
    diagnosis.push(`设置中的 SDK 路径无效或不存在：${abs}`)
  }

  const envHome = (deps.processEnv.ANDROID_HOME || deps.processEnv.ANDROID_SDK_ROOT || '').trim()
  if (envHome) {
    const abs = path.resolve(envHome)
    if (isExistingDirectory(abs)) {
      const which = deps.processEnv.ANDROID_HOME?.trim() ? 'ANDROID_HOME' : 'ANDROID_SDK_ROOT'
      diagnosis.push(`使用环境变量 ${which}：${abs}`)
      return { ok: true, data: { androidHome: abs, source: 'env' }, diagnosis }
    }
    diagnosis.push(`环境变量中的 SDK 路径无效：${abs}`)
  }

  const localContent = deps.readLocalProperties(projectPath)
  if (localContent != null) {
    const sdkDir = readLocalPropertiesSdkDir(localContent)
    if (sdkDir) {
      const abs = path.isAbsolute(sdkDir) ? path.resolve(sdkDir) : path.resolve(projectPath, sdkDir)
      if (isExistingDirectory(abs)) {
        diagnosis.push(`使用项目 local.properties 的 sdk.dir：${abs}`)
        return { ok: true, data: { androidHome: abs, source: 'local.properties' }, diagnosis }
      }
      diagnosis.push(`local.properties 中的 sdk.dir 无效：${abs}`)
    } else {
      diagnosis.push('已读取 local.properties，但未找到有效的 sdk.dir')
    }
  } else {
    diagnosis.push('项目目录下无 local.properties，或无法读取')
  }

  diagnosis.push('无法解析 Android SDK：请在设置中填写路径，或配置 ANDROID_HOME / local.properties')
  return { ok: false, diagnosis }
}

export function resolveJavaHomeForBuild(
  jdkId: string | null,
  deps: {
    allowSystemJdkFallback: boolean
    processEnv: NodeJS.ProcessEnv
    platform: NodeJS.Platform
    jdkInstalls: { id: string; homePath: string }[]
  },
): Result<{ javaHome: string; diagnosis: string[] }> {
  const diagnosis: string[] = []
  const id = jdkId?.trim() || null

  if (id) {
    const install = deps.jdkInstalls.find((item) => item.id === id)
    if (!install) {
      return err(appError('E_NO_JDK', '未选择有效 JDK', id))
    }
    const home = resolveJdkHome(install.homePath, deps.platform)
    if (!home) {
      return err(appError('E_JDK_INVALID', 'JAVA_HOME 无 java 可执行文件', install.homePath))
    }
    diagnosis.push(`使用已登记 JDK：${home}`)
    return ok({ javaHome: home, diagnosis })
  }

  if (deps.allowSystemJdkFallback) {
    const envJava = (deps.processEnv.JAVA_HOME || '').trim()
    if (envJava) {
      const home = resolveJdkHome(envJava, deps.platform)
      if (home) {
        diagnosis.push(`警告：未选择登记 JDK，已回退系统 JAVA_HOME：${home}`)
        return ok({ javaHome: home, diagnosis })
      }
      diagnosis.push(`系统 JAVA_HOME 无效：${envJava}`)
    } else {
      diagnosis.push('已开启系统 JDK 回退，但未设置 JAVA_HOME')
    }
  }

  return err(appError('E_NO_JDK', '未选择有效 JDK'))
}

export function prependJavaBinToPath(
  javaHome: string,
  currentPath: string | undefined,
  platform: NodeJS.Platform = process.platform,
): string {
  const bin = path.join(javaHome, 'bin')
  const sep = platform === 'win32' ? ';' : ':'
  const rest = currentPath?.trim() || ''
  if (!rest) return bin
  const parts = rest.split(sep).filter((item) => item && item !== bin)
  return [bin, ...parts].join(sep)
}

export function defaultReadLocalProperties(projectPath: string): string | null {
  const file = path.join(path.resolve(projectPath.trim() || '.'), 'local.properties')
  if (!existsSync(file)) return null
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

export function resolveBuildEnv(
  input: ResolveBuildEnvInput,
  deps: ResolveBuildEnvDeps,
): Result<ResolvedBuildEnv> {
  const processEnv = deps.processEnv ?? process.env
  const platform = deps.platform ?? process.platform
  const projectPath = path.resolve(String(input.projectPath ?? '').trim() || '.')

  const sdk = resolveAndroidSdkPath(projectPath, {
    settingsAndroidSdkPath: deps.settingsAndroidSdkPath,
    processEnv,
    readLocalProperties: deps.readLocalProperties ?? defaultReadLocalProperties,
  })
  if (!sdk.ok) {
    return err(appError('E_NO_SDK', '无法解析 Android SDK', sdk.diagnosis.join('；')))
  }

  const java = resolveJavaHomeForBuild(input.jdkId, {
    allowSystemJdkFallback: deps.allowSystemJdkFallback,
    processEnv,
    platform,
    jdkInstalls: deps.jdkInstalls,
  })
  if (!java.ok) {
    const detail = [...sdk.diagnosis, java.error.detail, java.error.message]
      .filter((item): item is string => Boolean(item))
      .join('；')
    return err(appError(java.error.code, java.error.message, detail))
  }

  const diagnosis = [...sdk.diagnosis, ...java.data.diagnosis]
  const pathValue = prependJavaBinToPath(java.data.javaHome, processEnv.PATH, platform)
  const env: Record<string, string> = {
    JAVA_HOME: java.data.javaHome,
    ANDROID_HOME: sdk.data.androidHome,
    ANDROID_SDK_ROOT: sdk.data.androidHome,
    PATH: pathValue,
  }

  return ok({
    env,
    javaHome: java.data.javaHome,
    androidHome: sdk.data.androidHome,
    diagnosis,
  })
}
