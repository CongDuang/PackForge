import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { composeSigningInjectArgs, SIGNING_INJECT_KEYS, SIGNING_PREVIEW_SECRET } from './signingArgs.ts'

describe('composeSigningInjectArgs', () => {
  it('returns empty arrays when not injecting', () => {
    assert.deepEqual(composeSigningInjectArgs(null), { args: [], previewArgs: [] })
  })

  it('masks passwords in preview and keeps them out of preview text', () => {
    const storePassword = 'store-s3cret-9f2a'
    const keyPassword = 'key-s3cret-1c8b'
    const composed = composeSigningInjectArgs({
      storeFile: '/keys/upload.jks',
      storePassword,
      keyAlias: 'upload',
      keyPassword,
      storeType: 'PKCS12',
    })
    assert.deepEqual(composed.args, [
      `-P${SIGNING_INJECT_KEYS.storeFile}=/keys/upload.jks`,
      `-P${SIGNING_INJECT_KEYS.storePassword}=${storePassword}`,
      `-P${SIGNING_INJECT_KEYS.keyAlias}=upload`,
      `-P${SIGNING_INJECT_KEYS.keyPassword}=${keyPassword}`,
      `-P${SIGNING_INJECT_KEYS.storeType}=PKCS12`,
    ])
    assert.deepEqual(composed.previewArgs, [
      `-P${SIGNING_INJECT_KEYS.storeFile}=/keys/upload.jks`,
      `-P${SIGNING_INJECT_KEYS.storePassword}=${SIGNING_PREVIEW_SECRET}`,
      `-P${SIGNING_INJECT_KEYS.keyAlias}=upload`,
      `-P${SIGNING_INJECT_KEYS.keyPassword}=${SIGNING_PREVIEW_SECRET}`,
      `-P${SIGNING_INJECT_KEYS.storeType}=PKCS12`,
    ])
    const previewText = composed.previewArgs.join('\n')
    assert.equal(previewText.includes(storePassword), false)
    assert.equal(previewText.includes(keyPassword), false)
  })

  it('omits store type when blank', () => {
    const composed = composeSigningInjectArgs({
      storeFile: '/a.jks',
      storePassword: 'p',
      keyAlias: 'a',
      keyPassword: 'p',
      storeType: '  ',
    })
    assert.equal(
      composed.args.some((item) => item.includes(SIGNING_INJECT_KEYS.storeType)),
      false,
    )
  })
})
