import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { afterRemoveJdk, parseJavaVersion, resolveJdkHome, upsertJdkInstall } from './jdkDetect.ts'
import type { JdkInstall } from '../../src/shared/types.ts'

const fixtures: string[] = []

function makeDir(name: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `packforge-jdk-${name}-`))
  fixtures.push(dir)
  return dir
}

function touchJava(home: string, platform: NodeJS.Platform): void {
  const bin = path.join(home, 'bin')
  mkdirSync(bin, { recursive: true })
  writeFileSync(path.join(bin, platform === 'win32' ? 'java.exe' : 'java'), '')
}

afterEach(() => {
  while (fixtures.length > 0) {
    const dir = fixtures.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('parseJavaVersion', () => {
  it('reads quoted OpenJDK version from stderr-style output', () => {
    assert.equal(parseJavaVersion('openjdk version "21.0.2" 2024-01-16\nOpenJDK Runtime Environment'), '21.0.2')
  })

  it('reads Java 8 quoted version', () => {
    assert.equal(parseJavaVersion('java version "1.8.0_392"\nJava(TM) SE Runtime Environment'), '1.8.0_392')
  })

  it('reads unquoted openjdk banner', () => {
    assert.equal(parseJavaVersion('openjdk 17.0.10 2024-01-16 LTS'), '17.0.10')
  })

  it('returns empty when unrecognizable', () => {
    assert.equal(parseJavaVersion('not a java banner'), '')
  })
})

describe('resolveJdkHome', () => {
  it('returns null for empty path', () => {
    assert.equal(resolveJdkHome('   '), null)
  })

  it('accepts a directory with bin/java', () => {
    const home = makeDir('unix')
    touchJava(home, 'darwin')
    assert.equal(resolveJdkHome(home, 'darwin'), path.resolve(home))
  })

  it('accepts a macOS .jdk bundle via Contents/Home', () => {
    const bundle = makeDir('bundle')
    const home = path.join(bundle, 'Contents', 'Home')
    touchJava(home, 'darwin')
    assert.equal(resolveJdkHome(bundle, 'darwin'), path.resolve(home))
  })

  it('accepts bin/java.exe on win32', () => {
    const home = makeDir('win')
    touchJava(home, 'win32')
    assert.equal(resolveJdkHome(home, 'win32'), path.resolve(home))
  })

  it('rejects a directory without java', () => {
    const home = makeDir('empty')
    mkdirSync(path.join(home, 'bin'), { recursive: true })
    assert.equal(resolveJdkHome(home, 'darwin'), null)
  })
})

describe('upsertJdkInstall / afterRemoveJdk', () => {
  const first: JdkInstall = {
    id: '/jdk/21',
    name: 'JDK 21.0.2',
    version: '21.0.2',
    homePath: '/jdk/21',
    source: 'import',
  }
  const second: JdkInstall = {
    id: '/jdk/17',
    name: 'JDK 17.0.10',
    version: '17.0.10',
    homePath: '/jdk/17',
    source: 'import',
  }

  it('sets the first import as default', () => {
    const next = upsertJdkInstall({ installs: [], defaultId: null }, first)
    assert.deepEqual(next, { installs: [first], defaultId: first.id })
  })

  it('keeps an existing default when importing another home', () => {
    const next = upsertJdkInstall({ installs: [first], defaultId: first.id }, second)
    assert.equal(next.defaultId, first.id)
    assert.equal(next.installs.length, 2)
  })

  it('updates the same homePath in place', () => {
    const updated = { ...first, version: '21.0.3', name: 'JDK 21.0.3' }
    const next = upsertJdkInstall({ installs: [first, second], defaultId: first.id }, updated)
    assert.equal(next.installs.length, 2)
    assert.equal(next.installs.find((item) => item.id === first.id)?.version, '21.0.3')
    assert.equal(next.defaultId, first.id)
  })

  it('repoints default after removing the current default', () => {
    const next = afterRemoveJdk({ installs: [first, second], defaultId: first.id }, first.id)
    assert.equal(next.defaultId, second.id)
    assert.deepEqual(
      next.installs.map((item) => item.id),
      [second.id],
    )
  })

  it('clears default when the last install is removed', () => {
    const next = afterRemoveJdk({ installs: [first], defaultId: first.id }, first.id)
    assert.deepEqual(next, { installs: [], defaultId: null })
  })
})

describe('UI copy bans', () => {
  it('keeps JDK page and service free of banned phrases', () => {
    const files = [
      path.join(import.meta.dirname, '../../src/pages/JdkPage.tsx'),
      path.join(import.meta.dirname, '../../src/components/JdkSelect.tsx'),
      path.join(import.meta.dirname, './jdk.ts'),
    ]
    const banned = ['下载 JDK', '在线安装', '缓存安装包']
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const phrase of banned) {
        assert.equal(text.includes(phrase), false, `${file} contains ${phrase}`)
      }
    }
  })
})
