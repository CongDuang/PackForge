import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { shell } from 'electron'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'

export function showItemInFolder(filePath: string): Result<void> {
  const abs = path.resolve(String(filePath ?? ''))
  if (!existsSync(abs)) {
    return err(appError('E_COPY_FAILED', '文件不存在', abs))
  }
  try {
    shell.showItemInFolder(abs)
    return ok(undefined)
  } catch (cause) {
    return err(
      appError(
        'E_COPY_FAILED',
        '无法在文件管理器中显示',
        cause instanceof Error ? cause.message : String(cause),
      ),
    )
  }
}
