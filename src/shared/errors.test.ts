import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isPackForgeErrorCode, PACKFORGE_ERROR_CODES } from './errors.ts'

const required = [
  'E_NO_WRAPPER',
  'E_NO_SETTINGS',
  'E_NO_SDK',
  'E_NO_JDK',
  'E_JDK_INVALID',
  'E_SIGN_MISSING',
  'E_VARIANT_PARSE',
  'E_BUILD_FAILED',
  'E_BUILD_CANCELLED',
  'E_ARTIFACT_NONE',
  'E_COPY_FAILED',
] as const

test('PRD §15 错误码全部导出', () => {
  for (const code of required) {
    assert.equal(isPackForgeErrorCode(code), true, code)
    assert.equal(PACKFORGE_ERROR_CODES.includes(code), true, code)
  }
})

test('未知字符串不是错误码', () => {
  assert.equal(isPackForgeErrorCode('E_UNKNOWN'), false)
})
