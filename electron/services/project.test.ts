import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import {
  MAX_RECENT_PROJECTS,
  normalizePastedPath,
  pinRecentProjectInList,
  removeRecentProjectFromList,
  upsertRecentProject,
  validateProject,
} from './project.ts'
import type { ProjectRef } from '../../src/shared/types.ts'

const fixtures: string[] = []

function makeDir(name: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `packforge-${name}-`))
  fixtures.push(dir)
  return dir
}

function write(dir: string, file: string, mode?: number): void {
  const full = path.join(dir, file)
  writeFileSync(full, file === 'gradlew' ? '#!/bin/sh\n' : '')
  if (mode !== undefined) chmodSync(full, mode)
}

afterEach(() => {
  while (fixtures.length > 0) {
    const dir = fixtures.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('normalizePastedPath', () => {
  it('strips quotes and whitespace', () => {
    assert.equal(normalizePastedPath('  "/tmp/app"  '), '/tmp/app')
    assert.equal(normalizePastedPath("'/tmp/app'"), '/tmp/app')
    assert.equal(normalizePastedPath('  /tmp/app  '), '/tmp/app')
  })
})

describe('validateProject', () => {
  it('accepts settings.gradle + executable gradlew on unix', () => {
    const dir = makeDir('ok')
    write(dir, 'settings.gradle')
    write(dir, 'gradlew', 0o755)
    const result = validateProject(dir, { platform: 'darwin' })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.data.wrapperKind, 'gradlew')
      assert.equal(result.data.wrapperCommand, path.join(dir, 'gradlew'))
      assert.equal(result.data.settingsFile, 'settings.gradle')
      assert.equal(result.data.path, path.resolve(dir))
    }
  })

  it('accepts settings.gradle.kts', () => {
    const dir = makeDir('kts')
    write(dir, 'settings.gradle.kts')
    write(dir, 'gradlew', 0o755)
    const result = validateProject(dir, { platform: 'linux' })
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.data.settingsFile, 'settings.gradle.kts')
  })

  it('chmod +x when gradlew lacks execute bit', () => {
    const dir = makeDir('chmod')
    write(dir, 'settings.gradle')
    write(dir, 'gradlew', 0o644)
    const result = validateProject(dir, { platform: 'darwin' })
    assert.equal(result.ok, true)
  })

  it('returns E_NO_WRAPPER when gradlew is missing', () => {
    const dir = makeDir('nowrap')
    write(dir, 'settings.gradle')
    const result = validateProject(dir, { platform: 'darwin' })
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.code, 'E_NO_WRAPPER')
      assert.match(result.error.message, /Wrapper/)
    }
  })

  it('returns E_NO_SETTINGS when settings files are missing', () => {
    const dir = makeDir('noset')
    write(dir, 'gradlew', 0o755)
    const result = validateProject(dir, { platform: 'darwin' })
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.code, 'E_NO_SETTINGS')
      assert.match(result.error.message, /不像 Gradle/)
    }
  })

  it('returns readable error when directory does not exist', () => {
    const result = validateProject('/tmp/packforge-definitely-missing-project', { platform: 'darwin' })
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.error.message, /不存在/)
  })

  it('uses gradlew.bat on win32 even if gradlew is absent', () => {
    const dir = makeDir('win')
    write(dir, 'settings.gradle')
    write(dir, 'gradlew.bat')
    const result = validateProject(dir, { platform: 'win32' })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.data.wrapperKind, 'gradlew.bat')
      assert.equal(result.data.wrapperCommand, path.join(dir, 'gradlew.bat'))
    }
  })

  it('returns E_NO_WRAPPER on win32 when only unix gradlew exists', () => {
    const dir = makeDir('win-unix')
    write(dir, 'settings.gradle')
    write(dir, 'gradlew', 0o755)
    const result = validateProject(dir, { platform: 'win32' })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error.code, 'E_NO_WRAPPER')
  })

  it('does not fall back to a global gradle command', () => {
    const source = readFileSync(new URL('./project.ts', import.meta.url), 'utf8')
    assert.equal(/['"`]gradle['"`]/.test(source), false)
    assert.equal(source.includes('gradlew.bat'), true)
  })
})

describe('recent list', () => {
  const sample = (pathValue: string, at: number, pinned = false): ProjectRef => ({
    id: pathValue,
    path: pathValue,
    displayName: path.basename(pathValue),
    lastOpenedAt: at,
    pinned,
  })

  it('moves existing path to front of its pin group and caps at 20', () => {
    const items = Array.from({ length: 20 }, (_, i) => sample(`/p/${i}`, i))
    const next = upsertRecentProject(items, {
      path: '/p/3',
      wrapperCommand: '/p/3/gradlew',
      wrapperKind: 'gradlew',
      settingsFile: 'settings.gradle',
    }, 999)
    assert.equal(next.length, MAX_RECENT_PROJECTS)
    assert.equal(next[0]?.path, '/p/3')
    assert.equal(next[0]?.lastOpenedAt, 999)
  })

  it('keeps the newly opened project when adding the 21st entry', () => {
    const items = Array.from({ length: 20 }, (_, i) => sample(`/p/${i}`, i))
    const next = upsertRecentProject(items, {
      path: '/p/new',
      wrapperCommand: '/p/new/gradlew',
      wrapperKind: 'gradlew',
      settingsFile: 'settings.gradle',
    }, 1000)
    assert.equal(next.length, MAX_RECENT_PROJECTS)
    assert.equal(next.some((item) => item.path === '/p/new'), true)
    assert.equal(next.some((item) => item.path === '/p/0'), false)
  })

  it('keeps pinned items first when opening another project', () => {
    const items = [sample('/pinned', 1, true), sample('/old', 2, false)]
    const next = upsertRecentProject(items, {
      path: '/new',
      wrapperCommand: '/new/gradlew',
      wrapperKind: 'gradlew',
      settingsFile: 'settings.gradle',
    }, 10)
    assert.deepEqual(next.map((item) => item.path), ['/pinned', '/new', '/old'])
  })

  it('pins and removes by id', () => {
    const items = [sample('/a', 1), sample('/b', 2)]
    const pinned = pinRecentProjectInList(items, '/a', true)
    assert.equal(pinned[0]?.path, '/a')
    assert.equal(pinned[0]?.pinned, true)
    const removed = removeRecentProjectFromList(pinned, '/a')
    assert.deepEqual(removed.map((item) => item.path), ['/b'])
  })
})
