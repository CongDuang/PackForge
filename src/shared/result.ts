import type { AppError } from './errors'

/**
 * IPC / 服务层统一返回值（冻结）。
 * 成功：{ ok: true, data }
 * 失败：{ ok: false, error } — 禁止改用 throw 作为常规业务失败。
 */
export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError }

export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function err<T = never>(error: AppError): Result<T> {
  return { ok: false, error }
}
