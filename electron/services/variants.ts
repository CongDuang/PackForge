import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { appError } from '../../src/shared/errors.ts'
import {
  COMMON_BUILD_TYPES,
  mergeVariantDiscovery,
  parseGradleTasksOutput,
  parseStaticBuildScript,
} from '../../src/shared/parseVariants.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import { buildGradleTaskName } from '../../src/shared/taskName.ts'
import {
  clampVariantDiscoverTimeoutSec,
  type BuildKind,
  type BuildRequest,
  type VariantDiscovery,
} from '../../src/shared/types.ts'
import { resolveBuildEnv, withGradleUserHome } from './env.ts'
import { validateProject } from './project.ts'
import { getJdkState, getSettingsFromStore } from './store.ts'

const STATIC_WARNING = '回退解析，请核对'
const CANCELLED_TASKS = '已取消动态发现'
const KILL_FOLLOWUP_MS = 2_000

type ActiveTasks = {
  child: ChildProcess
  timer: ReturnType<typeof setTimeout>
  reject: (error: Error) => void
}

let activeTasks: ActiveTasks | null = null

function killProcessTree(child: ChildProcess): void {
  const pid = child.pid
  if (!pid) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' })
    return
  }
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try {
      child.kill('SIGTERM')
    } catch {
      // 进程已经结束
    }
  }
  setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      try {
        child.kill('SIGKILL')
      } catch {
        // 进程已经结束
      }
    }
  }, KILL_FOLLOWUP_MS)
}

/** 停掉进行中的 gradlew tasks，让这次发现改走静态解析。没有进行中的发现时直接返回。 */
export function cancelVariantDiscovery(): Result<void> {
  const current = activeTasks
  if (!current) return ok(undefined)
  activeTasks = null
  clearTimeout(current.timer)
  killProcessTree(current.child)
  current.reject(new Error(CANCELLED_TASKS))
  return ok(undefined)
}

export function previewTaskName(
  req: Pick<BuildRequest, 'module' | 'kind' | 'flavorPart' | 'buildType'>,
): Result<{ taskName: string }> {
  const module = String(req.module ?? '').trim()
  const kind = req.kind
  if (kind !== 'assemble' && kind !== 'bundle') {
    return err(appError('E_VARIANT_PARSE', '产物类型无效'))
  }
  if (!module) {
    return err(appError('E_VARIANT_PARSE', '请先选择模块'))
  }
  return ok({
    taskName: buildGradleTaskName({
      module,
      kind,
      flavorPart: String(req.flavorPart ?? ''),
      buildType: String(req.buildType ?? 'Release'),
    }),
  })
}

function clipDetail(text: string, max = 180): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= max) return oneLine
  return `${oneLine.slice(0, max)}…`
}

export async function discoverVariants(
  projectPath: string,
  module: string,
  jdkId?: string | null,
): Promise<Result<VariantDiscovery>> {
  const validated = validateProject(projectPath)
  if (!validated.ok) return validated
  const moduleName = module.replace(/^:+/, '').trim()
  if (!moduleName) {
    return err(appError('E_VARIANT_PARSE', '请先选择模块'))
  }

  const staticParsed = tryDiscoverFromStatic(validated.data.path, moduleName)
  const knownBuildTypes = new Set(COMMON_BUILD_TYPES)
  for (const type of staticParsed?.buildTypes ?? []) knownBuildTypes.add(type)

  const settings = getSettingsFromStore()
  const jdkState = getJdkState()
  const resolvedJdkId =
    jdkId == null || jdkId === '' ? jdkState.defaultId : jdkId

  const envResult = resolveBuildEnv(
    { projectPath: validated.data.path, jdkId: resolvedJdkId },
    {
      settingsAndroidSdkPath: settings.androidSdkPath,
      allowSystemJdkFallback: settings.allowSystemJdkFallback,
      settingsGradleUserHome: settings.gradleUserHome,
      jdkInstalls: jdkState.installs,
    },
  )

  let dynamicFailureDetail: string | undefined
  if (!envResult.ok) {
    dynamicFailureDetail = clipDetail(
      `${envResult.error.code}：${envResult.error.message}${
        envResult.error.detail ? `（${envResult.error.detail}）` : ''
      }`,
    )
  } else {
    const timeoutMs = clampVariantDiscoverTimeoutSec(settings.variantDiscoverTimeoutSec) * 1000
    const tasks = await tryDiscoverFromTasks(
      validated.data.path,
      validated.data.wrapperCommand,
      moduleName,
      knownBuildTypes,
      envResult.data.env,
      timeoutMs,
    )
    if (tasks.data) {
      return ok({ ...mergeVariantDiscovery(tasks.data, staticParsed), source: 'tasks' })
    }
    dynamicFailureDetail =
      tasks.error === CANCELLED_TASKS
        ? CANCELLED_TASKS
        : clipDetail(tasks.error ?? 'gradlew tasks 未返回可用变体')
  }

  if (staticParsed) {
    const warning =
      dynamicFailureDetail === CANCELLED_TASKS
        ? `${STATIC_WARNING}（${CANCELLED_TASKS}）`
        : dynamicFailureDetail
          ? `${STATIC_WARNING}（动态发现失败：${dynamicFailureDetail}）`
          : STATIC_WARNING
    return ok({
      ...staticParsed,
      source: 'static',
      warning,
    })
  }

  return err(
    appError(
      'E_VARIANT_PARSE',
      '无法解析任务/变体',
      dynamicFailureDetail ? `${moduleName}；${dynamicFailureDetail}` : moduleName,
    ),
  )
}

async function tryDiscoverFromTasks(
  projectPath: string,
  wrapperCommand: string,
  module: string,
  knownBuildTypes: ReadonlySet<string>,
  buildEnv: Record<string, string>,
  timeoutMs: number,
): Promise<{ data: Omit<VariantDiscovery, 'source' | 'warning'> | null; error?: string }> {
  try {
    const output = await runWrapperTasks(
      projectPath,
      wrapperCommand,
      module,
      knownBuildTypes,
      buildEnv,
      timeoutMs,
    )
    const parsed = parseGradleTasksOutput(output, knownBuildTypes)
    if (parsed.buildTypes.length === 0) {
      return { data: null, error: 'tasks 输出中未识别到 buildType' }
    }
    return { data: parsed }
  } catch (cause) {
    return {
      data: null,
      error: cause instanceof Error ? cause.message : String(cause),
    }
  }
}

function tryDiscoverFromStatic(
  projectPath: string,
  module: string,
): Omit<VariantDiscovery, 'source' | 'warning'> | null {
  const dir = path.join(projectPath, ...module.split(':').filter(Boolean))
  const candidates = [path.join(dir, 'build.gradle.kts'), path.join(dir, 'build.gradle')]
  for (const file of candidates) {
    if (!existsSync(file)) continue
    try {
      const parsed = parseStaticBuildScript(readFileSync(file, 'utf8'))
      if (parsed && parsed.buildTypes.length > 0) return parsed
    } catch {
      continue
    }
  }
  return null
}

function runWrapperTasks(
  cwd: string,
  wrapperCommand: string,
  module: string,
  knownBuildTypes: ReadonlySet<string>,
  buildEnv: Record<string, string>,
  timeoutMs: number,
): Promise<string> {
  if (activeTasks) cancelVariantDiscovery()
  return new Promise((resolve, reject) => {
    const args = [`:${module}:tasks`, '--all']
    const child = spawn(wrapperCommand, args, {
      cwd,
      env: withGradleUserHome(process.env, buildEnv),
      windowsHide: true,
      shell: process.platform === 'win32',
      detached: process.platform !== 'win32',
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    let timer: ReturnType<typeof setTimeout>
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (activeTasks?.child === child) activeTasks = null
      fn()
    }
    timer = setTimeout(() => {
      killProcessTree(child)
      settle(() => reject(new Error('tasks 超时')))
    }, timeoutMs)
    activeTasks = {
      child,
      timer,
      reject: (error) => settle(() => reject(error)),
    }

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', (error) => {
      settle(() => reject(error))
    })
    child.on('close', (code) => {
      settle(() => {
        if (code === 0 || parseGradleTasksOutput(stdout, knownBuildTypes).buildTypes.length > 0) {
          resolve(stdout)
          return
        }
        reject(new Error(stderr.trim() || `tasks 退出码 ${code ?? 'null'}`))
      })
    })
  })
}

export function isBuildKind(value: unknown): value is BuildKind {
  return value === 'assemble' || value === 'bundle'
}
