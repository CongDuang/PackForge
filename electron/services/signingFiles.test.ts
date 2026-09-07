import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { validateKeystoreFile } from './signingFiles.ts'

const fixtures: string[] = []

afterEach(() => {
  while (fixtures.length > 0) {
    const dir = fixtures.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('validateKeystoreFile', () => {
  it('accepts an existing file', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'packforge-sign-'))
    fixtures.push(dir)
    const file = path.join(dir, 'upload.jks')
    writeFileSync(file, 'dummy')
    const result = validateKeystoreFile(file)
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.data, path.resolve(file))
  })

  it('rejects a missing path', () => {
    const result = validateKeystoreFile('/tmp/packforge-missing-keystore.jks')
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error.code, 'E_SIGN_MISSING')
  })

  it('rejects a directory', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'packforge-sign-dir-'))
    fixtures.push(dir)
    const result = validateKeystoreFile(dir)
    assert.equal(result.ok, false)
  })
})
