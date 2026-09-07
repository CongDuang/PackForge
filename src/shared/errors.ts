/** PRD §15 产品错误码（冻结）。E_NOT_IMPLEMENTED 仅用于尚未落地的 IPC stub。 */
export const PACKFORGE_ERROR_CODES = [
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
  'E_NOT_IMPLEMENTED',
] as const

export type PackForgeErrorCode = (typeof PACKFORGE_ERROR_CODES)[number]

export type AppError = {
  code: PackForgeErrorCode
  message: string
  detail?: string
}

export function isPackForgeErrorCode(value: string): value is PackForgeErrorCode {
  return (PACKFORGE_ERROR_CODES as readonly string[]).includes(value)
}

export function appError(
  code: PackForgeErrorCode,
  message: string,
  detail?: string,
): AppError {
  return detail === undefined ? { code, message } : { code, message, detail }
}
