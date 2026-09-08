import { spawn } from 'node:child_process'
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
import type { BuildKind, BuildRequest, VariantDiscovery } from '../../src/shared/types.ts'
import { resolveBuildEnv } from './env.ts'
import { validateProject } from './project.ts'
import { getJdkState, getSettingsFromStore } from './store.ts'

const TASKS_TIMEOUT_MS = 120_000
const STATIC_WARNING = '回退解析，请核对'

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
    const tasks = await tryDiscoverFromTasks(
      validated.data.path,
      validated.data.wrapperCommand,
      moduleName,
      knownBuildTypes,
      envResult.data.env,
    )
    if (tasks.data) {
      return ok({ ...mergeVariantDiscovery(tasks.data, staticParsed), source: 'tasks' })
    }
    dynamicFailureDetail = clipDetail(tasks.error ?? 'gradlew tasks 未返回可用变体')
  }

  if (staticParsed) {
    return ok({
      ...staticParsed,
      source: 'static',
      warning: dynamicFailureDetail
        ? `${STATIC_WARNING}（动态发现失败：${dynamicFailureDetail}）`
        : STATIC_WARNING,
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
): Promise<{ data: Omit<VariantDiscovery, 'source' | 'warning'> | null; error?: string }> {
  try {
    const output = await runWrapperTasks(
      projectPath,
      wrapperCommand,
      module,
      knownBuildTypes,
      buildEnv,
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
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [`:${module}:tasks`, '--all']
    const child = spawn(wrapperCommand, args, {
      cwd,
      env: { ...process.env, ...buildEnv },
      windowsHide: true,
      shell: process.platform === 'win32',
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('tasks 超时'))
    }, TASKS_TIMEOUT_MS)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 || parseGradleTasksOutput(stdout, knownBuildTypes).buildTypes.length > 0) {
        resolve(stdout)
        return
      }
      reject(new Error(stderr.trim() || `tasks 退出码 ${code ?? 'null'}`))
    })
  })
}

export function isBuildKind(value: unknown): value is BuildKind {
  return value === 'assemble' || value === 'bundle'
}
