import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mergeVariantDiscovery,
  parseGradleTasksOutput,
  parseStaticBuildScript,
  splitVariantSuffix,
} from './parseVariants.ts'

describe('splitVariantSuffix', () => {
  it('treats Debug/Release as buildType', () => {
    assert.deepEqual(splitVariantSuffix('Debug'), { flavorPart: '', buildType: 'Debug' })
    assert.deepEqual(splitVariantSuffix('Release'), { flavorPart: '', buildType: 'Release' })
    assert.deepEqual(splitVariantSuffix('ProdRelease'), { flavorPart: 'Prod', buildType: 'Release' })
    assert.deepEqual(splitVariantSuffix('DevFreeRelease'), { flavorPart: 'DevFree', buildType: 'Release' })
    assert.deepEqual(splitVariantSuffix('DevDebug'), { flavorPart: 'Dev', buildType: 'Debug' })
  })

  it('ignores flavor aggregators and non-variant assemble tasks', () => {
    assert.equal(splitVariantSuffix('Dev'), null)
    assert.equal(splitVariantSuffix('Prod'), null)
    assert.equal(splitVariantSuffix('Test'), null)
    assert.equal(splitVariantSuffix('AndroidTest'), null)
    assert.equal(splitVariantSuffix('Jar'), null)
    assert.equal(splitVariantSuffix('Resources'), null)
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

  it('does not promote flavor or java plugin tasks to buildTypes', () => {
    const output = `
assemble
assembleDebug
assembleRelease
assembleDev
assembleProd
assembleDevDebug
assembleDevRelease
assembleProdRelease
assembleAndroidTest
assembleJar
assembleResources
assembleTest
assembleUnitTest
bundleDevRelease
    `
    const parsed = parseGradleTasksOutput(output)
    assert.deepEqual(parsed.buildTypes.sort(), ['Debug', 'Release'])
    assert.deepEqual(parsed.flavorDimensions, [{ name: 'flavor', flavors: ['Dev', 'Prod'] }])
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

  it('ignores signingConfigs.getByName inside a build type', () => {
    const parsed = parseStaticBuildScript(`
      android {
        buildTypes {
          debug {}
          release {
            signingConfig = signingConfigs.getByName("sign")
          }
        }
      }
    `)
    assert.ok(parsed)
    assert.deepEqual(parsed?.buildTypes.sort(), ['Debug', 'Release'])
  })

  it('reads only top-level buildTypes, not nested optimization blocks', () => {
    const parsed = parseStaticBuildScript(`
      android {
        flavorDimensions += "environment"
        productFlavors {
          create("dev") { dimension = "environment" }
          create("prod") { dimension = "environment" }
        }
        buildTypes {
          debug {
            isDebuggable = true
          }
          release {
            isDebuggable = false
            optimization {
              enable = true
            }
          }
        }
      }
    `)
    assert.ok(parsed)
    assert.deepEqual(parsed?.buildTypes.sort(), ['Debug', 'Release'])
    assert.deepEqual(parsed?.flavorDimensions, [{ name: 'environment', flavors: ['dev', 'prod'] }])
  })
})

describe('mergeVariantDiscovery', () => {
  it('prefers static buildTypes and flavor dimensions', () => {
    const merged = mergeVariantDiscovery(
      {
        buildTypes: ['Debug', 'Release', 'Staging'],
        flavorDimensions: [{ name: 'flavor', flavors: ['Dev', 'Prod'] }],
        assembleTasks: ['assembleDevRelease'],
        bundleTasks: [],
      },
      {
        buildTypes: ['Debug', 'Release'],
        flavorDimensions: [{ name: 'environment', flavors: ['dev', 'prod'] }],
        assembleTasks: [],
        bundleTasks: [],
      },
    )
    assert.deepEqual(merged.buildTypes, ['Debug', 'Release'])
    assert.deepEqual(merged.flavorDimensions, [{ name: 'environment', flavors: ['dev', 'prod'] }])
    assert.deepEqual(merged.assembleTasks, ['assembleDevRelease'])
  })
})
