import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PRIVACY_POINTS, PRODUCT_NAME, PRODUCT_SLOGAN } from './about.ts'
import { DEFAULT_SETTINGS } from './types.ts'

describe('about copy', () => {
  it('keeps product name and slogan', () => {
    assert.equal(PRODUCT_NAME, '匠包 PackForge')
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
  })
})
