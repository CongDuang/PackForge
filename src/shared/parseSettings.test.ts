import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseSettingsIncludes, pickDefaultModule } from './parseSettings.ts'

describe('parseSettingsIncludes', () => {
  it('parses groovy multi include on one line', () => {
    const result = parseSettingsIncludes(`
      rootProject.name = 'demo'
      include ':app', ':lib'
    `)
    assert.deepEqual(result.modules, ['app', 'lib'])
    assert.equal(result.defaultModule, 'app')
    assert.equal(result.parseWarning, undefined)
  })

  it('parses kts include with multiple arguments', () => {
    const result = parseSettingsIncludes(`
      pluginManagement { repositories { google() } }
      include(":app", ":data")
    `)
    assert.deepEqual(result.modules, ['app', 'data'])
    assert.equal(result.defaultModule, 'app')
  })

  it('parses multiline include and nested module path', () => {
    const result = parseSettingsIncludes(`
      include(
        ':app',
        ':feature:home'
      )
    `)
    assert.deepEqual(result.modules, ['app', 'feature:home'])
  })

  it('defaults to first module when app is absent', () => {
    const result = parseSettingsIncludes(`include ':core', ':feature:login'`)
    assert.deepEqual(result.modules, ['core', 'feature:login'])
    assert.equal(result.defaultModule, 'core')
  })

  it('prefers exact app over last-segment app', () => {
    assert.equal(pickDefaultModule(['feature:app', 'app', 'lib']), 'app')
    assert.equal(pickDefaultModule(['feature:app', 'lib']), 'feature:app')
  })

  it('ignores includeBuild inside pluginManagement', () => {
    const result = parseSettingsIncludes(`
      pluginManagement {
        includeBuild("build-logic")
      }
      dependencyResolutionManagement {
        repositories { google() }
      }
      include ':app'
    `)
    assert.deepEqual(result.modules, ['app'])
  })

  it('returns warning and app fallback when parse finds nothing', () => {
    const result = parseSettingsIncludes(`
      pluginManagement { includeBuild("x") }
      rootProject.name = "empty"
    `)
    assert.deepEqual(result.modules, [])
    assert.equal(result.defaultModule, 'app')
    assert.match(result.parseWarning ?? '', /手动填写/)
  })
})
