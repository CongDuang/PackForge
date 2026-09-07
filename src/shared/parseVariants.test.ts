import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseGradleTasksOutput, parseStaticBuildScript, splitVariantSuffix } from './parseVariants.ts'

describe('splitVariantSuffix', () => {
  it('treats Debug/Release as buildType', () => {
    assert.deepEqual(splitVariantSuffix('Debug'), { flavorPart: '', buildType: 'Debug' })
    assert.deepEqual(splitVariantSuffix('Release'), { flavorPart: '', buildType: 'Release' })
    assert.deepEqual(splitVariantSuffix('ProdRelease'), { flavorPart: 'Prod', buildType: 'Release' })
    assert.deepEqual(splitVariantSuffix('DevFreeRelease'), { flavorPart: 'DevFree', buildType: 'Release' })
    assert.deepEqual(splitVariantSuffix('DevDebug'), { flavorPart: 'Dev', buildType: 'Debug' })
  })
})

describe('parseGradleTasksOutput', () => {
  it('extracts build types and a single flavor dimension', () => {
    const output = `
assemble - Assembles the outputs of this project.
assembleDebug - Assembles all Debug builds.
assembleRelease
assembleProdRelease
assembleDevDebug
bundleProdRelease
bundleRelease
    `
    const parsed = parseGradleTasksOutput(output)
    assert.deepEqual(parsed.buildTypes.sort(), ['Debug', 'Release'])
    assert.deepEqual(parsed.flavorDimensions, [{ name: 'flavor', flavors: ['Prod', 'Dev'] }])
    assert.ok(parsed.assembleTasks.includes('assembleProdRelease'))
    assert.ok(parsed.bundleTasks.includes('bundleProdRelease'))
  })
})

describe('parseStaticBuildScript', () => {
  it('parses groovy buildTypes and productFlavors', () => {
    const parsed = parseStaticBuildScript(`
      android {
        flavorDimensions "env", "store"
        productFlavors {
          prod { dimension "env" }
          dev { dimension "env" }
          free { dimension "store" }
          paid { dimension "store" }
        }
        buildTypes {
          debug {}
          release {}
        }
      }
    `)
    assert.ok(parsed)
    assert.deepEqual(parsed?.buildTypes.sort(), ['Debug', 'Release'])
    assert.deepEqual(parsed?.flavorDimensions.map((d) => d.name), ['env', 'store'])
    assert.deepEqual(parsed?.flavorDimensions[0]?.flavors, ['prod', 'dev'])
    assert.deepEqual(parsed?.flavorDimensions[1]?.flavors, ['free', 'paid'])
  })

  it('parses kts create() flavors and listOf dimensions', () => {
    const parsed = parseStaticBuildScript(`
      android {
        flavorDimensions += listOf("tier")
        productFlavors {
          create("free") { dimension = "tier" }
          create("paid") { dimension = "tier" }
        }
        buildTypes {
          getByName("debug") {}
          create("release") {}
        }
      }
    `)
    assert.ok(parsed)
    assert.ok(parsed?.buildTypes.includes('Debug'))
    assert.ok(parsed?.buildTypes.includes('Release'))
    assert.deepEqual(parsed?.flavorDimensions, [{ name: 'tier', flavors: ['free', 'paid'] }])
  })

  it('returns null when nothing useful is found', () => {
    assert.equal(parseStaticBuildScript('plugins { id("java") }'), null)
  })
})
