import { randomUUID } from 'node:crypto'
import keytar from 'keytar'
import { appError } from '../../src/shared/errors.ts'
import { KEYTAR_SERVICE, keytarAccount, type SigningProfileMeta } from '../../src/shared/types.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import type { SigningProfileInput } from '../../src/shared/api.ts'
import { composeSigningInjectArgs } from '../../src/shared/signingArgs.ts'
import { validateKeystoreFile } from './signingFiles.ts'
import { getSigningProfiles, setSigningProfiles } from './store.ts'

export function listSigningProfiles(): Result<SigningProfileMeta[]> {
  return ok(getSigningProfiles())
}

export function parseSigningProfileInput(raw: unknown): SigningProfileInput {
  const body = (raw ?? {}) as Record<string, unknown>
  return {
    id: body.id == null || body.id === '' ? undefined : String(body.id),
    name: String(body.name ?? ''),
    storeFile: String(body.storeFile ?? ''),
    keyAlias: String(body.keyAlias ?? ''),
    storeType: body.storeType == null ? undefined : String(body.storeType),
    storePassword: String(body.storePassword ?? ''),
    keyPassword: String(body.keyPassword ?? ''),
    keyPasswordSameAsStore: Boolean(body.keyPasswordSameAsStore),
  }
}

export async function upsertSigningProfile(input: SigningProfileInput): Promise<Result<SigningProfileMeta>> {
  const name = String(input.name ?? '').trim()
  const keyAlias = String(input.keyAlias ?? '').trim()
  const storeType = String(input.storeType ?? '').trim() || undefined
  const same = Boolean(input.keyPasswordSameAsStore)
  const file = validateKeystoreFile(String(input.storeFile ?? ''))
  if (!file.ok) return file
  if (!name || !keyAlias) {
    return err(appError('E_SIGN_MISSING', '签名档案不完整或 keystore 不存在'))
  }

  const id = String(input.id ?? '').trim() || randomUUID()
  const existing = getSigningProfiles().find((item) => item.id === id)
  let storePassword = String(input.storePassword ?? '')
  let keyPassword = same ? storePassword : String(input.keyPassword ?? '')

  if (existing) {
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
    return err(appError('E_SIGN_MISSING', '签名档案不完整或 keystore 不存在', id))
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

  const meta: SigningProfileMeta = {
    id,
    name,
    storeFile: file.data,
    keyAlias,
    keyPasswordSameAsStore: same,
    ...(storeType ? { storeType } : {}),
  }
  const others = getSigningProfiles().filter((item) => item.id !== id)
  setSigningProfiles([...others, meta])
  return ok(meta)
}

export async function deleteSigningProfile(id: string): Promise<Result<void>> {
  const trimmed = id.trim()
  setSigningProfiles(getSigningProfiles().filter((item) => item.id !== trimmed))
  try {
    await keytar.deletePassword(KEYTAR_SERVICE, keytarAccount(trimmed, 'store'))
    await keytar.deletePassword(KEYTAR_SERVICE, keytarAccount(trimmed, 'key'))
  } catch {
    // 列表已删；钥匙串条目可能本就不存在
  }
  return ok(undefined)
}

export async function buildSigningInjectArgs(
  profileId: string | null,
): Promise<Result<{ args: string[]; previewArgs: string[] }>> {
  if (profileId == null || profileId === '') {
    return ok(composeSigningInjectArgs(null))
  }
  const profile = getSigningProfiles().find((item) => item.id === profileId)
  if (!profile) {
    return err(appError('E_SIGN_MISSING', '签名档案不完整或 keystore 不存在', profileId))
  }
  const file = validateKeystoreFile(profile.storeFile)
  if (!file.ok) return file
  const storePassword = await readSecret(profile.id, 'store')
  const keyPassword = await readSecret(profile.id, 'key')
  if (!storePassword || !keyPassword) {
    return err(appError('E_SIGN_MISSING', '签名档案不完整或 keystore 不存在', profile.id))
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

function readSecret(id: string, kind: 'store' | 'key'): Promise<string | null> {
  return keytar.getPassword(KEYTAR_SERVICE, keytarAccount(id, kind))
}
