import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatUserError } from './errorHints.ts'
import { preflightSync } from './preflight.ts'
import type { ProjectValidation, VariantDiscovery } from './types.ts'

const project: ProjectValidation = {
  path: '/proj',
  wrapperCommand: '/proj/gradlew',
  wrapperKind: 'gradlew',
  settingsFile: 'settings.gradle',
}

const discovery: VariantDiscovery = {
  source: 'static',
  buildTypes: ['Release', 'Debug'],
  flavorDimensions: [{ name: 'env', flavors: ['Prod', 'Dev'] }],
  assembleTasks: [],
  bundleTasks: [],
}

describe('preflightSync', () => {
  it('blocks when project or signing missing', () => {
    const noProject = preflightSync({
      project: null,
      module: 'app',
      kind: 'assemble',
      buildType: 'Release',
      discovery,
      flavorByDimension: { env: 'Prod' },
      jdkId: '/jdk',
      projectSigning: null,
    })
    assert.equal(noProject.ok, false)

    const noSign = preflightSync({
      project,
      module: 'app',
      kind: 'assemble',
      buildType: 'Release',
      discovery,
      flavorByDimension: { env: 'Prod' },
      jdkId: '/jdk',
      projectSigning: null,
    })
    assert.equal(noSign.ok, false)
    if (noSign.ok) return
    assert.equal(noSign.error.code, 'E_SIGN_MISSING')
  })

  it('accepts inject=false binding and builds task name', () => {
    const result = preflightSync({
      project,
      module: 'app',
      kind: 'bundle',
      buildType: 'Release',
      discovery,
      flavorByDimension: { env: 'Prod' },
      jdkId: '/jdk',
      projectSigning: { projectPath: '/proj', inject: false, profile: null },
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.signingProfileId, null)
    assert.equal(result.data.taskName, ':app:bundleProdRelease')
  })
})

describe('formatUserError', () => {
  it('appends PRD hint', () => {
    assert.match(formatUserError('E_NO_SDK', '无法解析 Android SDK'), /设置填写 SDK/)
  })
})
