import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveProjectJdk } from './jdkSelection.ts'

const installs = [{ id: 'jdk-17' }, { id: 'jdk-21' }]

describe('resolveProjectJdk', () => {
  it('keeps a cached id that is still registered', () => {
    assert.equal(resolveProjectJdk('jdk-21', installs, 'jdk-17'), 'jdk-21')
  })

  it('falls back to the global default when the cache is missing or stale', () => {
    assert.equal(resolveProjectJdk(undefined, installs, 'jdk-17'), 'jdk-17')
    assert.equal(resolveProjectJdk('gone', installs, 'jdk-17'), 'jdk-17')
  })

  it('returns empty when no registered jdk matches', () => {
    assert.equal(resolveProjectJdk('gone', installs, 'gone'), '')
    assert.equal(resolveProjectJdk(undefined, [], null), '')
  })
})
