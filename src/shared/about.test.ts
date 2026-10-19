import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PRIVACY_POINTS, PRODUCT_NAME, PRODUCT_SLOGAN } from './about.ts'
import {
  clampVariantDiscoverTimeoutSec,
  DEFAULT_SETTINGS,
  VARIANT_DISCOVER_TIMEOUT_DEFAULT_SEC,
} from './types.ts'

describe('about copy', () => {
  it('keeps product name and slogan', () => {
    assert.equal(PRODUCT_NAME, '匠包')
    assert.equal(PRODUCT_SLOGAN, '本地锻造，不上云')
  })

  it('keeps required privacy disclosures', () => {
    const text = PRIVACY_POINTS.join('\n')
    assert.match(text, /不上传签名/)
    assert.match(text, /不上传工程源码/)
    assert.match(text, /无使用分析遥测/)
    assert.match(text, /无出站网络/)
    assert.match(text, /钥匙串/)
    assert.match(text, /keystore 仅存本地路径/)
    assert.match(text, /Gradle Wrapper/)
    assert.match(text, /不经 Android Studio IDE/)
  })
})

describe('settings defaults', () => {
  it('disables system JDK fallback by default', () => {
    assert.equal(DEFAULT_SETTINGS.allowSystemJdkFallback, false)
    assert.equal(DEFAULT_SETTINGS.androidSdkPath, '')
    assert.equal(DEFAULT_SETTINGS.advancedGradleArgs, '')
    assert.equal(DEFAULT_SETTINGS.theme, 'system')
    assert.equal(DEFAULT_SETTINGS.variantDiscoverTimeoutSec, VARIANT_DISCOVER_TIMEOUT_DEFAULT_SEC)
    assert.equal(DEFAULT_SETTINGS.gradleUserHome, '')
    assert.equal(DEFAULT_SETTINGS.gradleUserHomePrompted, false)
    assert.equal(clampVariantDiscoverTimeoutSec(''), 30)
    assert.equal(clampVariantDiscoverTimeoutSec('nope'), 30)
    assert.equal(clampVariantDiscoverTimeoutSec(1), 5)
    assert.equal(clampVariantDiscoverTimeoutSec(999), 300)
    assert.equal(clampVariantDiscoverTimeoutSec(45.2), 45)
  })
})
