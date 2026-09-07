import { randomUUID } from 'node:crypto'
import path from 'node:path'
import keytar from 'keytar'
import type { ProjectSigningInput } from '../../src/shared/api.ts'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import { composeSigningInjectArgs } from '../../src/shared/signingArgs.ts'
import {
  KEYTAR_SERVICE,
  keytarAccount,
  type ProjectSigningBinding,
  type SigningProfileMeta,
} from '../../src/shared/types.ts'
import { validateKeystoreFile } from './signingFiles.ts'
import {
  getSigningBinding,
  removeSigningBinding,
  setSigningBinding,
} from './store.ts'

export function normalizeProjectPath(projectPath: string): string {
  return path.resolve(projectPath.trim())
}

export function getProjectSigning(projectPath: string): Result<ProjectSigningBinding | null> {
  const key = normalizeProjectPath(projectPath)
  if (!key) return ok(null)
  return ok(getSigningBinding(key))
}

export function parseProjectSigningInput(raw: unknown): ProjectSigningInput {
  const body = (raw ?? {}) as Record<string, unknown>
  return {
    inject: Boolean(body.inject),
    storeFile: body.storeFile == null ? undefined : String(body.storeFile),
    keyAlias: body.keyAlias == null ? undefined : String(body.keyAlias),
    storeType: body.storeType == null ? undefined : String(body.storeType),
    storePassword: body.storePassword == null ? undefined : String(body.storePassword),
    keyPassword: body.keyPassword == null ? undefined : String(body.keyPassword),
    keyPasswordSameAsStore:
      body.keyPasswordSameAsStore == null ? undefined : Boolean(body.keyPasswordSameAsStore),
  }
}

export async function upsertProjectSigning(
  projectPath: string,
  input: ProjectSigningInput,
): Promise<Result<ProjectSigningBinding>> {
  const key = normalizeProjectPath(projectPath)
  if (!key) {
    return err(appError('E_SIGN_MISSING', '本工程签名绑定不完整或 keystore 不存在'))
  }

  const existing = getSigningBinding(key)

  if (!input.inject) {
    if (existing?.profile) {
      await deleteKeytarSecrets(existing.profile.id)
    }
    const binding: ProjectSigningBinding = {
      projectPath: key,
      inject: false,
      profile: null,
    }
    setSigningBinding(binding)
    return ok(binding)
  }

  const keyAlias = String(input.keyAlias ?? '').trim()
  const storeType = String(input.storeType ?? '').trim() || undefined
  const same = input.keyPasswordSameAsStore ?? existing?.profile?.keyPasswordSameAsStore ?? true
  const file = validateKeystoreFile(String(input.storeFile ?? existing?.profile?.storeFile ?? ''))
  if (!file.ok) return file
  if (!keyAlias) {
    return err(appError('E_SIGN_MISSING', '本工程签名绑定不完整或 keystore 不存在'))
  }

  const id = existing?.profile?.id ?? randomUUID()
  let storePassword = String(input.storePassword ?? '')
  let keyPassword = same ? storePassword : String(input.keyPassword ?? '')

  if (existing?.profile) {
    if (!storePassword) {
      storePassword = (await readSecret(id, 'store')) ?? ''
    }
    if (same) {
      keyPassword = storePassword
    } else if (!keyPassword) {
      keyPassword = (await readSecret(id, 'key')) ?? ''
    }
  }

  if (!storePassword || !keyPassword) {
    return err(appError('E_SIGN_MISSING', '本工程签名绑定不完整或 keystore 不存在', id))
  }

  try {
    await keytar.setPassword(KEYTAR_SERVICE, keytarAccount(id, 'store'), storePassword)
    await keytar.setPassword(KEYTAR_SERVICE, keytarAccount(id, 'key'), keyPassword)
  } catch (error) {
    return err(
      appError(
        'E_SIGN_MISSING',
        '无法写入系统钥匙串，请执行 pnpm rebuild',
        error instanceof Error ? error.message : String(error),
      ),
    )
  }

  const profile: SigningProfileMeta = {
    id,
    storeFile: file.data,
    keyAlias,
    keyPasswordSameAsStore: same,
    ...(storeType ? { storeType } : {}),
  }
  const binding: ProjectSigningBinding = {
    projectPath: key,
    inject: true,
    profile,
  }
  setSigningBinding(binding)
  return ok(binding)
}

export async function clearProjectSigning(projectPath: string): Promise<Result<void>> {
  const key = normalizeProjectPath(projectPath)
  const removed = removeSigningBinding(key)
  if (removed?.profile) {
    await deleteKeytarSecrets(removed.profile.id)
  }
  return ok(undefined)
}

export async function buildSigningInjectArgs(
  projectPath: string,
): Promise<Result<{ args: string[]; previewArgs: string[] }>> {
  const key = normalizeProjectPath(projectPath)
  const binding = getSigningBinding(key)
  if (!binding || !binding.inject || !binding.profile) {
    return ok(composeSigningInjectArgs(null))
  }
  const profile = binding.profile
  const file = validateKeystoreFile(profile.storeFile)
  if (!file.ok) return file
  const storePassword = await readSecret(profile.id, 'store')
  const keyPassword = await readSecret(profile.id, 'key')
  if (!storePassword || !keyPassword) {
    return err(appError('E_SIGN_MISSING', '本工程签名绑定不完整或 keystore 不存在', profile.id))
  }
  return ok(
    composeSigningInjectArgs({
      storeFile: file.data,
      storePassword,
      keyAlias: profile.keyAlias,
      keyPassword,
      storeType: profile.storeType,
    }),
  )
}

async function deleteKeytarSecrets(id: string): Promise<void> {
  try {
    await keytar.deletePassword(KEYTAR_SERVICE, keytarAccount(id, 'store'))
    await keytar.deletePassword(KEYTAR_SERVICE, keytarAccount(id, 'key'))
  } catch {
    // 条目可能本就不存在
  }
}

function readSecret(id: string, kind: 'store' | 'key'): Promise<string | null> {
  return keytar.getPassword(KEYTAR_SERVICE, keytarAccount(id, kind))
}
