import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  compareBuildToolsVersion,
  isSignatureConflict,
  parseAdbDevices,
  parsePackageNameFromBadging,
  parsePackageNameFromInstallError,
} from './adbInstall.ts'

describe('parseAdbDevices', () => {
  it('keeps authorized devices and reads model', () => {
    const text = [
      'List of devices attached',
      'emulator-5554          device product:sdk model:sdk_gphone64 device:emu transport_id:1',
      'R58M123                unauthorized',
      'offline1               offline',
      '',
    ].join('\n')
    assert.deepEqual(parseAdbDevices(text), [{ serial: 'emulator-5554', model: 'sdk gphone64' }])
  })
})

describe('isSignatureConflict', () => {
  it('matches update incompatible and signature text', () => {
    assert.equal(isSignatureConflict('Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]'), true)
    assert.equal(
      isSignatureConflict('Package com.foo signatures do not match previously installed version'),
      true,
    )
    assert.equal(isSignatureConflict('INSTALL_FAILED_INSUFFICIENT_STORAGE'), false)
  })
})

describe('package name parsers', () => {
  it('reads aapt badging and install error', () => {
    assert.equal(
      parsePackageNameFromBadging("package: name='com.example.app' versionCode='1'"),
      'com.example.app',
    )
    assert.equal(
      parsePackageNameFromInstallError(
        'INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package com.foo.bar signatures do not match',
      ),
      'com.foo.bar',
    )
  })
})

describe('compareBuildToolsVersion', () => {
  it('orders dotted versions', () => {
    assert.ok(compareBuildToolsVersion('35.0.0', '34.0.0') > 0)
    assert.ok(compareBuildToolsVersion('30.0.3', '34.0.0') < 0)
    assert.equal(compareBuildToolsVersion('34.0.0', '34.0.0'), 0)
  })
})
