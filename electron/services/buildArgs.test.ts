import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseBuildRequest,
  redactSecrets,
  secretsFromSigningArgs,
  splitGradleArgs,
} from './buildArgs.ts'

describe('splitGradleArgs', () => {
  it('splits whitespace and respects quotes', () => {
    assert.deepEqual(splitGradleArgs('--stacktrace --info'), ['--stacktrace', '--info'])
    assert.deepEqual(splitGradleArgs(`--foo "bar baz" '--x y'`), ['--foo', 'bar baz', '--x y'])
  })
})

describe('redactSecrets', () => {
  it('masks passwords from signing args and free text', () => {
    const args = [
      '-Pandroid.injected.signing.store.password=s3cret',
      '-Pandroid.injected.signing.key.password=k3y',
    ]
    const secrets = secretsFromSigningArgs(args)
    assert.deepEqual(secrets, ['s3cret', 'k3y'])
    assert.equal(redactSecrets('store=s3cret key=k3y', secrets), 'store=*** key=***')
    assert.equal(
      redactSecrets('-Pandroid.injected.signing.store.password=s3cret', []),
      '-Pandroid.injected.signing.store.password=***',
    )
  })
})

describe('parseBuildRequest', () => {
  it('requires project module jdk and kind', () => {
    assert.equal(parseBuildRequest({}), null)
    const parsed = parseBuildRequest({
      projectPath: '/p',
      module: 'app',
      kind: 'assemble',
      flavorPart: 'Prod',
      buildType: 'Release',
      jdkId: '/jdk',
      signingProfileId: null,
      extraArgs: ['--offline'],
    })
    assert.ok(parsed)
    assert.equal(parsed?.module, 'app')
    assert.equal(parsed?.signingProfileId, null)
    assert.deepEqual(parsed?.extraArgs, ['--offline'])
  })
})
