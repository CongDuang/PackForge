import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import {
  prependJavaBinToPath,
  readLocalPropertiesSdkDir,
  resolveAndroidSdkPath,
  resolveBuildEnv,
  resolveJavaHomeForBuild,
  unescapeSdkDir,
} from './env.ts'

const fixtures: string[] = []

function makeDir(name: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `packforge-env-${name}-`))
  fixtures.push(dir)
  return dir
}

function touchJava(home: string): void {
  const bin = path.join(home, 'bin')
  mkdirSync(bin, { recursive: true })
  writeFileSync(path.join(bin, 'java'), '')
}

afterEach(() => {
  while (fixtures.length > 0) {
    const dir = fixtures.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('readLocalPropertiesSdkDir / unescapeSdkDir', () => {
  it('reads sdk.dir and ignores comments', () => {
    const content = [
      '# sdk.dir=/ignored',
      'sdk.dir=/Users/me/Library/Android/sdk',
      'ndk.dir=/elsewhere',
    ].join('\n')
    assert.equal(readLocalPropertiesSdkDir(content), '/Users/me/Library/Android/sdk')
  })

  it('unescapes Windows-style \\: and \\\\', () => {
    assert.equal(unescapeSdkDir('C\\:\\\\Users\\\\me\\\\Sdk'), 'C:\\Users\\me\\Sdk')
    assert.equal(
      readLocalPropertiesSdkDir('sdk.dir=C\\:\\\\Users\\\\me\\\\AppData\\\\Local\\\\Android\\\\Sdk'),
      'C:\\Users\\me\\AppData\\Local\\Android\\Sdk',
    )
  })

  it('returns null when sdk.dir missing', () => {
    assert.equal(readLocalPropertiesSdkDir('foo=bar\n'), null)
  })
})

describe('resolveAndroidSdkPath priority', () => {
  it('prefers settings path when directory exists', () => {
    const sdk = makeDir('settings-sdk')
    const project = makeDir('project')
    const envSdk = makeDir('env-sdk')
    writeFileSync(path.join(project, 'local.properties'), `sdk.dir=${makeDir('local-sdk')}\n`)

    const result = resolveAndroidSdkPath(project, {
      settingsAndroidSdkPath: sdk,
      processEnv: { ANDROID_HOME: envSdk },
      readLocalProperties: (p) => {
        try {
          return readFileSync(path.join(p, 'local.properties'), 'utf8')
        } catch {
          return null
        }
      },
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.source, 'settings')
    assert.equal(result.data.androidHome, path.resolve(sdk))
  })

  it('falls back to ANDROID_HOME then local.properties', () => {
    const project = makeDir('project2')
    const envSdk = makeDir('env-sdk2')
    const localSdk = makeDir('local-sdk2')
    writeFileSync(path.join(project, 'local.properties'), `sdk.dir=${localSdk}\n`)

    const fromEnv = resolveAndroidSdkPath(project, {
      settingsAndroidSdkPath: '',
      processEnv: { ANDROID_HOME: envSdk },
      readLocalProperties: () => `sdk.dir=${localSdk}\n`,
    })
    assert.equal(fromEnv.ok, true)
    if (!fromEnv.ok) return
    assert.equal(fromEnv.data.source, 'env')
    assert.equal(fromEnv.data.androidHome, path.resolve(envSdk))

    const fromLocal = resolveAndroidSdkPath(project, {
      settingsAndroidSdkPath: '',
      processEnv: {},
      readLocalProperties: () => `sdk.dir=${localSdk}\n`,
    })
    assert.equal(fromLocal.ok, true)
    if (!fromLocal.ok) return
    assert.equal(fromLocal.data.source, 'local.properties')
    assert.equal(fromLocal.data.androidHome, path.resolve(localSdk))
  })

  it('fails with diagnosis when none valid', () => {
    const project = makeDir('empty-project')
    const result = resolveAndroidSdkPath(project, {
      settingsAndroidSdkPath: '/no/such/sdk',
      processEnv: { ANDROID_HOME: '/also/missing' },
      readLocalProperties: () => null,
    })
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.ok(result.diagnosis.some((line) => line.includes('无法解析')))
  })
})

describe('resolveJavaHomeForBuild', () => {
  it('uses registered jdkId', () => {
    const home = makeDir('jdk')
    touchJava(home)
    const result = resolveJavaHomeForBuild(home, {
      allowSystemJdkFallback: false,
      processEnv: {},
      platform: 'darwin',
      jdkInstalls: [{ id: home, homePath: home }],
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.javaHome, path.resolve(home))
  })

  it('returns E_NO_JDK without id and without fallback', () => {
    const result = resolveJavaHomeForBuild(null, {
      allowSystemJdkFallback: false,
      processEnv: { JAVA_HOME: '/tmp' },
      platform: 'darwin',
      jdkInstalls: [],
    })
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.error.code, 'E_NO_JDK')
  })

  it('falls back to JAVA_HOME when allowed', () => {
    const home = makeDir('sys-jdk')
    touchJava(home)
    const result = resolveJavaHomeForBuild(null, {
      allowSystemJdkFallback: true,
      processEnv: { JAVA_HOME: home },
      platform: 'darwin',
      jdkInstalls: [],
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.ok(result.data.diagnosis.some((line) => line.includes('回退')))
  })

  it('returns E_JDK_INVALID for bad homePath', () => {
    const empty = makeDir('bad-jdk')
    const result = resolveJavaHomeForBuild('bad', {
      allowSystemJdkFallback: false,
      processEnv: {},
      platform: 'darwin',
      jdkInstalls: [{ id: 'bad', homePath: empty }],
    })
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.error.code, 'E_JDK_INVALID')
  })
})

describe('prependJavaBinToPath', () => {
  it('prepends bin and dedupes on unix', () => {
    const home = '/opt/jdk'
    assert.equal(prependJavaBinToPath(home, '/usr/bin:/opt/jdk/bin', 'darwin'), '/opt/jdk/bin:/usr/bin')
  })

  it('uses semicolon separator on win32', () => {
    const home = 'C:\\jdk'
    const bin = path.join(home, 'bin')
    assert.equal(prependJavaBinToPath(home, 'C:\\Windows', 'win32'), `${bin};C:\\Windows`)
  })
})

describe('resolveBuildEnv', () => {
  it('assembles env with JAVA_HOME ANDROID_HOME PATH', () => {
    const sdk = makeDir('full-sdk')
    const jdk = makeDir('full-jdk')
    touchJava(jdk)
    const project = makeDir('full-project')

    const result = resolveBuildEnv(
      { projectPath: project, jdkId: jdk },
      {
        settingsAndroidSdkPath: sdk,
        allowSystemJdkFallback: false,
        processEnv: { PATH: '/usr/bin' },
        platform: 'darwin',
        jdkInstalls: [{ id: jdk, homePath: jdk }],
        readLocalProperties: () => null,
      },
    )
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.javaHome, path.resolve(jdk))
    assert.equal(result.data.androidHome, path.resolve(sdk))
    assert.equal(result.data.env.JAVA_HOME, path.resolve(jdk))
    assert.equal(result.data.env.ANDROID_HOME, path.resolve(sdk))
    assert.equal(result.data.env.ANDROID_SDK_ROOT, path.resolve(sdk))
    assert.ok(result.data.env.PATH.startsWith(path.join(path.resolve(jdk), 'bin')))
  })

  it('returns E_NO_SDK when sdk missing', () => {
    const jdk = makeDir('jdk-only')
    touchJava(jdk)
    const result = resolveBuildEnv(
      { projectPath: makeDir('no-sdk-proj'), jdkId: jdk },
      {
        settingsAndroidSdkPath: '',
        allowSystemJdkFallback: false,
        processEnv: {},
        platform: 'darwin',
        jdkInstalls: [{ id: jdk, homePath: jdk }],
        readLocalProperties: () => null,
      },
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.error.code, 'E_NO_SDK')
  })
})
