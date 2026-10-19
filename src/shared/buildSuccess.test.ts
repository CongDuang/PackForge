import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ArtifactItem, ProjectValidation } from './types.ts'
import { useWorkbenchStore, withoutBuildSuccess } from '../store/workbenchStore.ts'

function project(path: string): ProjectValidation {
  return {
    path,
    wrapperCommand: './gradlew',
    wrapperKind: 'gradlew',
    settingsFile: 'settings.gradle',
  }
}

describe('withoutBuildSuccess', () => {
  it('hides only the success card and succeeded label', () => {
    assert.deepEqual(withoutBuildSuccess({ banner: '构建成功', buildStatus: 'succeeded' }), {
      banner: null,
      buildStatus: 'idle',
    })
    assert.deepEqual(withoutBuildSuccess({ banner: '已打开 /tmp', buildStatus: 'failed' }), {
      banner: '已打开 /tmp',
      buildStatus: 'failed',
    })
  })

  it('clearLogs and a different project drop a finished success', () => {
    const store = useWorkbenchStore
    store.setState({
      banner: '构建成功',
      buildStatus: 'succeeded',
      logLines: [{ id: 1, line: 'ok', stream: 'stdout' }],
      project: project('/a'),
    })
    store.getState().clearLogs()
    assert.equal(store.getState().banner, null)
    assert.equal(store.getState().buildStatus, 'idle')
    assert.equal(store.getState().logLines.length, 0)

    store.setState({
      banner: '构建成功',
      buildStatus: 'succeeded',
      project: project('/a'),
    })
    store.getState().setProject(project('/a'))
    assert.equal(store.getState().banner, '构建成功')
    assert.equal(store.getState().buildStatus, 'succeeded')

    store.getState().setProject(project('/b'))
    assert.equal(store.getState().banner, null)
    assert.equal(store.getState().buildStatus, 'idle')
    assert.equal(store.getState().project?.path, '/b')
  })
})

describe('setArtifacts', () => {
  it('keeps the panel collapsed when a scan finds files', () => {
    const item: ArtifactItem = { path: '/tmp/app.apk', type: 'apk', size: 1, mtime: 1 }
    const store = useWorkbenchStore
    store.setState({ artifactsExpanded: false, artifacts: [] })
    store.getState().setArtifacts([item])
    assert.equal(store.getState().artifactsExpanded, false)
    assert.equal(store.getState().artifacts.length, 1)
  })
})
