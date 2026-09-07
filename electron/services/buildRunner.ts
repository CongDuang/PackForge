import { spawn, type ChildProcess } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { BrowserWindow, app } from 'electron'
import { appError } from '../../src/shared/errors.ts'
import { EVENT_CHANNELS } from '../../src/shared/channels.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import { buildGradleTaskName } from '../../src/shared/taskName.ts'
import type { BuildLogEvent, BuildRequest, BuildStatusEvent } from '../../src/shared/types.ts'
import { parseBuildRequest, redactSecrets, secretsFromSigningArgs, splitGradleArgs } from './buildArgs.ts'
import { resolveBuildEnv } from './env.ts'
import { validateProject } from './project.ts'
import { buildSigningInjectArgs } from './signing.ts'
import { getJdkState, getSettingsFromStore } from './store.ts'

const RING_MAX = 5000
const KILL_TIMEOUT_MS = 8_000

type ActiveBuild = {
  buildId: string
  taskName: string
  child: ChildProcess
  secrets: string[]
  cancelled: boolean
  ring: string[]
  finishing: boolean
}

let active: ActiveBuild | null = null

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

function emitLog(event: BuildLogEvent): void {
  broadcast(EVENT_CHANNELS.buildLog, event)
}

function emitStatus(event: BuildStatusEvent): void {
  broadcast(EVENT_CHANNELS.buildStatus, event)
}

function appendRing(build: ActiveBuild, line: string): void {
  build.ring.push(line)
  if (build.ring.length > RING_MAX) {
    build.ring.splice(0, build.ring.length - RING_MAX)
  }
}

function appendFileLog(line: string): void {
  try {
    const dir = path.join(app.getPath('userData'), 'logs')
    mkdirSync(dir, { recursive: true })
    const stamp = new Date()
    const y = stamp.getFullYear()
    const m = String(stamp.getMonth() + 1).padStart(2, '0')
    const d = String(stamp.getDate()).padStart(2, '0')
    const file = path.join(dir, `packforge-${y}${m}${d}.log`)
    appendFileSync(file, `${line}\n`, 'utf8')
  } catch {
    // 文件日志失败不影响构建
  }
}

function pushLine(build: ActiveBuild, raw: string, stream: 'stdout' | 'stderr'): void {
  const line = redactSecrets(raw.replace(/\r$/, ''), build.secrets)
  appendRing(build, line)
  appendFileLog(`[${build.buildId}][${stream}] ${line}`)
  emitLog({ buildId: build.buildId, line, stream })
}

function feedChunk(build: ActiveBuild, chunk: Buffer, stream: 'stdout' | 'stderr', buf: { value: string }): void {
  buf.value += chunk.toString('utf8')
  const parts = buf.value.split(/\r?\n/)
  buf.value = parts.pop() ?? ''
  for (const part of parts) {
    pushLine(build, part, stream)
  }
}

function killProcessTree(child: ChildProcess): void {
  const pid = child.pid
  if (!pid) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore',
    })
    return
  }
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try {
      child.kill('SIGTERM')
    } catch {
      // ignore
    }
  }
  setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      try {
        child.kill('SIGKILL')
      } catch {
        // ignore
      }
    }
  }, KILL_TIMEOUT_MS)
}

export async function startBuild(raw: unknown): Promise<Result<{ buildId: string }>> {
  if (active) {
    return err(appError('E_BUILD_FAILED', '已有构建在进行中，请先取消或等待完成'))
  }

  const request = parseBuildRequest(raw)
  if (!request) {
    return err(appError('E_VARIANT_PARSE', '构建参数不完整'))
  }

  const validated = validateProject(request.projectPath)
  if (!validated.ok) return validated

  const settings = getSettingsFromStore()
  const jdkState = getJdkState()
  const envResult = resolveBuildEnv(
    { projectPath: validated.data.path, jdkId: request.jdkId },
    {
      settingsAndroidSdkPath: settings.androidSdkPath,
      allowSystemJdkFallback: settings.allowSystemJdkFallback,
      jdkInstalls: jdkState.installs,
    },
  )
  if (!envResult.ok) return envResult

  let signingArgs: string[] = []
  let secrets: string[] = []
  if (request.signingProfileId) {
    const signing = await buildSigningInjectArgs(validated.data.path)
    if (!signing.ok) return signing
    signingArgs = signing.data.args
    secrets = secretsFromSigningArgs(signingArgs)
  }

  const taskName = buildGradleTaskName({
    module: request.module,
    kind: request.kind,
    flavorPart: request.flavorPart,
    buildType: request.buildType,
  })
  const advanced = splitGradleArgs(settings.advancedGradleArgs)
  const args = [taskName, ...signingArgs, ...request.extraArgs, ...advanced]
  const previewArgs = [
    taskName,
    ...signingArgs.map((arg) => redactSecrets(arg, secrets)),
    ...request.extraArgs,
    ...advanced,
  ]

  const buildId = randomUUID()
  const env = { ...process.env, ...envResult.data.env }

  const child = spawn(validated.data.wrapperCommand, args, {
    cwd: validated.data.path,
    env,
    windowsHide: true,
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
  })

  const build: ActiveBuild = {
    buildId,
    taskName,
    child,
    secrets,
    cancelled: false,
    ring: [],
    finishing: false,
  }
  active = build

  emitStatus({ buildId, status: 'running', taskName })
  pushLine(build, `$ ${path.basename(validated.data.wrapperCommand)} ${previewArgs.join(' ')}`, 'stdout')
  for (const line of envResult.data.diagnosis) {
    pushLine(build, `[env] ${line}`, 'stdout')
  }

  const stdoutBuf = { value: '' }
  const stderrBuf = { value: '' }
  child.stdout?.on('data', (chunk: Buffer) => feedChunk(build, chunk, 'stdout', stdoutBuf))
  child.stderr?.on('data', (chunk: Buffer) => feedChunk(build, chunk, 'stderr', stderrBuf))

  child.on('error', (error) => {
    if (build.finishing) return
    build.finishing = true
    active = null
    const message = error.message || '无法启动 Gradle Wrapper'
    pushLine(build, message, 'stderr')
    emitStatus({
      buildId,
      status: 'failed',
      taskName,
      error: appError('E_BUILD_FAILED', '构建失败', message),
    })
  })

  child.on('close', (code) => {
    if (build.finishing) return
    build.finishing = true
    if (stdoutBuf.value) pushLine(build, stdoutBuf.value, 'stdout')
    if (stderrBuf.value) pushLine(build, stderrBuf.value, 'stderr')
    active = null

    if (build.cancelled) {
      emitStatus({
        buildId,
        status: 'cancelled',
        exitCode: code ?? undefined,
        taskName,
        error: appError('E_BUILD_CANCELLED', '构建已取消'),
      })
      return
    }

    if (code === 0) {
      emitStatus({ buildId, status: 'succeeded', exitCode: 0, taskName })
      return
    }

    emitStatus({
      buildId,
      status: 'failed',
      exitCode: code ?? undefined,
      taskName,
      error: appError('E_BUILD_FAILED', '构建失败', `exitCode=${code ?? 'null'}`),
    })
  })

  return ok({ buildId })
}

export function cancelBuild(buildIdRaw: unknown): Result<void> {
  const buildId = String(buildIdRaw ?? '')
  if (!active) {
    return err(appError('E_BUILD_CANCELLED', '当前没有进行中的构建'))
  }
  if (buildId && active.buildId !== buildId) {
    return err(appError('E_BUILD_CANCELLED', '构建 ID 不匹配'))
  }
  active.cancelled = true
  pushLine(active, '正在取消构建…', 'stderr')
  killProcessTree(active.child)
  return ok(undefined)
}

export function getActiveBuildId(): string | null {
  return active?.buildId ?? null
}

export type { BuildRequest }
