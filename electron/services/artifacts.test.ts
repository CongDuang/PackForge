import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { copyArtifactsToFolder, matchesVariant, scanArtifacts } from './artifacts.ts'

const fixtures: string[] = []

function makeDir(name: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `packforge-art-${name}-`))
  fixtures.push(dir)
  return dir
}

afterEach(() => {
  while (fixtures.length > 0) {
    const dir = fixtures.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('matchesVariant', () => {
  it('matches flavor+buildType path segments', () => {
    assert.equal(
      matchesVariant('/app/build/outputs/apk/prod/release/app-prod-release.apk', 'Prod', 'Release'),
      true,
    )
    assert.equal(
      matchesVariant('/app/build/outputs/apk/debug/app-debug.apk', '', 'Debug'),
      true,
    )
    assert.equal(
      matchesVariant('/app/build/outputs/apk/debug/app-debug.apk', 'Prod', 'Release'),
      false,
    )
  })
})

describe('scanArtifacts', () => {
  it('finds apk aab mapping under module outputs', () => {
    const project = makeDir('proj')
    const apkDir = path.join(project, 'app', 'build', 'outputs', 'apk', 'release')
    const aabDir = path.join(project, 'app', 'build', 'outputs', 'bundle', 'release')
    const mapDir = path.join(project, 'app', 'build', 'outputs', 'mapping', 'release')
    mkdirSync(apkDir, { recursive: true })
    mkdirSync(aabDir, { recursive: true })
    mkdirSync(mapDir, { recursive: true })
    writeFileSync(path.join(apkDir, 'app-release.apk'), 'apk')
    writeFileSync(path.join(aabDir, 'app-release.aab'), 'aab')
    writeFileSync(path.join(mapDir, 'mapping.txt'), 'map')

    const apkScan = scanArtifacts({
      projectPath: project,
      module: 'app',
      flavorPart: '',
      buildType: 'Release',
      kind: 'assemble',
    })
    assert.equal(apkScan.ok, true)
    if (!apkScan.ok) return
    assert.equal(apkScan.data.items.filter((i) => i.type === 'apk').length, 1)
    assert.equal(apkScan.data.items.filter((i) => i.type === 'aab').length, 0)
    assert.ok(apkScan.data.items.some((i) => i.type === 'mapping'))

    const all = scanArtifacts({
      projectPath: project,
      module: 'app',
      flavorPart: '',
      buildType: 'Release',
      kind: 'bundle',
      showAllModuleArtifacts: true,
    })
    assert.equal(all.ok, true)
    if (!all.ok) return
    assert.ok(all.data.items.some((i) => i.type === 'aab'))
  })
})

describe('copyArtifactsToFolder', () => {
  it('copies files and renames on conflict', () => {
    const srcDir = makeDir('src')
    const destDir = makeDir('dest')
    const src = path.join(srcDir, 'app.apk')
    writeFileSync(src, 'hello-apk')
    writeFileSync(path.join(destDir, 'app.apk'), 'old')

    const result = copyArtifactsToFolder([src], destDir)
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.copied.length, 1)
    assert.equal(readFileSync(result.data.copied[0]!, 'utf8'), 'hello-apk')
    assert.notEqual(path.basename(result.data.copied[0]!), 'app.apk')
  })
})
