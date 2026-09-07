import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'

export function validateKeystoreFile(storeFile: string): Result<string> {
  const trimmed = storeFile.trim()
  if (!trimmed) {
    return err(appError('E_SIGN_MISSING', '签名档案不完整或 keystore 不存在'))
  }
  const abs = path.resolve(trimmed)
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    return err(appError('E_SIGN_MISSING', '签名档案不完整或 keystore 不存在', abs))
  }
  return ok(abs)
}
