export const SIGNING_INJECT_KEYS = {
  storeFile: 'android.injected.signing.store.file',
  storePassword: 'android.injected.signing.store.password',
  keyAlias: 'android.injected.signing.key.alias',
  keyPassword: 'android.injected.signing.key.password',
  storeType: 'android.injected.signing.store.type',
} as const

export const SIGNING_PREVIEW_SECRET = '***'

export type SigningInjectFields = {
  storeFile: string
  storePassword: string
  keyAlias: string
  keyPassword: string
  storeType?: string
}

export function composeSigningInjectArgs(fields: SigningInjectFields | null): {
  args: string[]
  previewArgs: string[]
} {
  if (!fields) return { args: [], previewArgs: [] }
  const pairs: { key: string; value: string; secret: boolean }[] = [
    { key: SIGNING_INJECT_KEYS.storeFile, value: fields.storeFile, secret: false },
    { key: SIGNING_INJECT_KEYS.storePassword, value: fields.storePassword, secret: true },
    { key: SIGNING_INJECT_KEYS.keyAlias, value: fields.keyAlias, secret: false },
    { key: SIGNING_INJECT_KEYS.keyPassword, value: fields.keyPassword, secret: true },
  ]
  const storeType = fields.storeType?.trim()
  if (storeType) {
    pairs.push({ key: SIGNING_INJECT_KEYS.storeType, value: storeType, secret: false })
  }
  return {
    args: pairs.map((item) => `-P${item.key}=${item.value}`),
    previewArgs: pairs.map((item) => `-P${item.key}=${item.secret ? SIGNING_PREVIEW_SECRET : item.value}`),
  }
}
