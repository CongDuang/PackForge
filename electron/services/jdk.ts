import { spawn } from 'node:child_process'
import path from 'node:path'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import type { JdkInstall, JdkRegistry } from '../../src/shared/types.ts'
import { afterRemoveJdk, javaBinaryForHome, parseJavaVersion, resolveJdkHome, upsertJdkInstall } from './jdkDetect.ts'
import { getJdkState, setJdkState } from './store.ts'

const VERSION_TIMEOUT_MS = 8_000

export { afterRemoveJdk, javaBinaryForHome, parseJavaVersion, resolveJdkHome, upsertJdkInstall } from './jdkDetect.ts'

export async function importJdk(homePath: string): Promise<Result<JdkInstall>> {
  const home = resolveJdkHome(homePath)
  if (!home) {
    return err(appError('E_JDK_INVALID', 'JAVA_HOME 无 java 可执行文件', homePath))
  }
  const versionOut = await readJavaVersion(javaBinaryForHome(home))
  if (!versionOut.ok) return versionOut
  const version = parseJavaVersion(versionOut.data) || 'unknown'
  const install: JdkInstall = {
    id: home,
    name: version === 'unknown' ? path.basename(home) : `JDK ${version}`,
    version,
    homePath: home,
    source: 'import',
  }
  const state = getJdkState()
  const next = upsertJdkInstall(state, install)
  setJdkState({ ...state, installs: next.installs, defaultId: next.defaultId })
  return ok(install)
}

export function listJdks(): Result<JdkRegistry> {
  return ok(getJdkState())
}

export function removeJdk(id: string): Result<void> {
  const state = getJdkState()
  const next = afterRemoveJdk(state, id)
  setJdkState({ ...state, installs: next.installs, defaultId: next.defaultId })
  return ok(undefined)
}

export function setDefaultJdk(id: string | null): Result<void> {
  const state = getJdkState()
  if (id && !state.installs.some((item) => item.id === id)) {
    return err(appError('E_NO_JDK', '未选择有效 JDK', id))
  }
  setJdkState({ ...state, defaultId: id })
  return ok(undefined)
}

export function setProjectJdk(projectPath: string, jdkId: string): Result<void> {
  const path = projectPath.trim()
  const id = jdkId.trim()
  if (!path || !id) return err(appError('E_NO_JDK', '未选择有效 JDK', jdkId))
  const state = getJdkState()
  if (!state.installs.some((item) => item.id === id)) {
    return err(appError('E_NO_JDK', '未选择有效 JDK', id))
  }
  setJdkState({ ...state, byProject: { ...state.byProject, [path]: id } })
  return ok(undefined)
}

function readJavaVersion(javaBin: string): Promise<Result<string>> {
  return new Promise((resolve) => {
    const child = spawn(javaBin, ['-version'], {
      windowsHide: true,
      env: { ...process.env },
    })
    let output = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve(err(appError('E_JDK_INVALID', 'JAVA_HOME 无 java 可执行文件', javaBin)))
    }, VERSION_TIMEOUT_MS)
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
    })
    child.on('error', () => {
      clearTimeout(timer)
      resolve(err(appError('E_JDK_INVALID', 'JAVA_HOME 无 java 可执行文件', javaBin)))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0 && !parseJavaVersion(output)) {
        resolve(err(appError('E_JDK_INVALID', 'JAVA_HOME 无 java 可执行文件', javaBin)))
        return
      }
      resolve(ok(output))
    })
  })
}
