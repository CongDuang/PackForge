import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildGradleTaskName, composeFlavorPart } from './taskName.ts'

describe('buildGradleTaskName — PRD §9.2', () => {
  it('app, 无 flavor, Release, AAB', () => {
    assert.equal(
      buildGradleTaskName({ module: 'app', kind: 'bundle', flavorPart: '', buildType: 'Release' }),
      ':app:bundleRelease',
    )
  })

  it('app, 无 flavor, Debug, APK', () => {
    assert.equal(
      buildGradleTaskName({ module: 'app', kind: 'assemble', flavorPart: '', buildType: 'Debug' }),
      ':app:assembleDebug',
    )
  })

  it('app, Prod, Release, AAB', () => {
    assert.equal(
      buildGradleTaskName({ module: 'app', kind: 'bundle', flavorPart: 'Prod', buildType: 'Release' }),
      ':app:bundleProdRelease',
    )
  })

  it('app, Prod, Release, APK', () => {
    assert.equal(
      buildGradleTaskName({ module: 'app', kind: 'assemble', flavorPart: 'Prod', buildType: 'Release' }),
      ':app:assembleProdRelease',
    )
  })

  it('app, Dev, Debug, AAB', () => {
    assert.equal(
      buildGradleTaskName({ module: 'app', kind: 'bundle', flavorPart: 'Dev', buildType: 'Debug' }),
      ':app:bundleDevDebug',
    )
  })

  it('app, Dev + Free（多维度）, Release, APK', () => {
    assert.equal(
      buildGradleTaskName({
        module: 'app',
        kind: 'assemble',
        flavorPart: composeFlavorPart(['Dev', 'Free']),
        buildType: 'Release',
      }),
      ':app:assembleDevFreeRelease',
    )
  })

  it('capitalizes lowercase buildType and strips module colon', () => {
    assert.equal(
      buildGradleTaskName({ module: ':app', kind: 'assemble', flavorPart: '', buildType: 'release' }),
      ':app:assembleRelease',
    )
  })
})
