import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { listModules } from './modules.ts'

const fixtures: string[] = []

function makeProject(settingsName: 'settings.gradle' | 'settings.gradle.kts', body: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'packforge-mod-'))
  fixtures.push(dir)
  writeFileSync(path.join(dir, settingsName), body)
  writeFileSync(path.join(dir, 'gradlew'), '#!/bin/sh\n')
  chmodSync(path.join(dir, 'gradlew'), 0o755)
  return dir
}

afterEach(() => {
  while (fixtures.length > 0) {
    const dir = fixtures.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('listModules', () => {
  it('reads settings.gradle and prefers app', () => {
    const dir = makeProject('settings.gradle', `include ':lib', ':app'\n`)
    const result = listModules(dir)
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.deepEqual(result.data.modules, ['lib', 'app'])
      assert.equal(result.data.defaultModule, 'app')
    }
  })

  it('reads kts and falls back to first module', () => {
    const dir = makeProject('settings.gradle.kts', `include(":core")\n`)
    const result = listModules(dir)
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.deepEqual(result.data.modules, ['core'])
      assert.equal(result.data.defaultModule, 'core')
    }
  })

  it('returns E_NO_SETTINGS when project is invalid', () => {
    const result = listModules('/tmp/packforge-no-such-project')
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error.code, 'E_NO_SETTINGS')
  })
})
