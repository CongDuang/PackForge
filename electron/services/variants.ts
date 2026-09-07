import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { appError } from '../../src/shared/errors.ts'
import { parseGradleTasksOutput, parseStaticBuildScript } from '../../src/shared/parseVariants.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import { buildGradleTaskName } from '../../src/shared/taskName.ts'
import type { BuildKind, BuildRequest, VariantDiscovery } from '../../src/shared/types.ts'
import { validateProject } from './project.ts'

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

export async function discoverVariants(projectPath: string, module: string): Promise<Result<VariantDiscovery>> {
  const validated = validateProject(projectPath)
  if (!validated.ok) return validated
  const moduleName = module.replace(/^:+/, '').trim()
  if (!moduleName) {
    return err(appError('E_VARIANT_PARSE', '请先选择模块'))
  }

  const dynamic = await tryDiscoverFromTasks(validated.data.path, validated.data.wrapperCommand, moduleName)
  if (dynamic) return ok(dynamic)

  const fallback = tryDiscoverFromStatic(validated.data.path, moduleName)
  if (fallback) {
    return ok({ ...fallback, source: 'static', warning: STATIC_WARNING })
  }

  return err(appError('E_VARIANT_PARSE', '无法解析任务/变体', moduleName))
}

async function tryDiscoverFromTasks(
  projectPath: string,
  wrapperCommand: string,
  module: string,
): Promise<VariantDiscovery | null> {
  try {
    const output = await runWrapperTasks(projectPath, wrapperCommand, module)
    const parsed = parseGradleTasksOutput(output)
    if (parsed.buildTypes.length === 0) return null
    return { ...parsed, source: 'tasks' }
  } catch {
    return null
  }
}

function tryDiscoverFromStatic(projectPath: string, module: string): Omit<VariantDiscovery, 'source' | 'warning'> | null {
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

function runWrapperTasks(cwd: string, wrapperCommand: string, module: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [`:${module}:tasks`, '--all']
    const child = spawn(wrapperCommand, args, {
      cwd,
      env: { ...process.env },
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
      if (code === 0 || parseGradleTasksOutput(stdout).buildTypes.length > 0) {
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
