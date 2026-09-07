import { execFile } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { clipboard, shell } from 'electron'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'

const execFileAsync = promisify(execFile)

function normalizeExistingFiles(paths: string[]): Result<string[]> {
  const list = (Array.isArray(paths) ? paths : []).map((item) => path.resolve(String(item ?? '')))
  if (list.length === 0) {
    return err(appError('E_COPY_FAILED', '未选择要复制的文件'))
  }
  for (const file of list) {
    if (!existsSync(file) || !statSync(file).isFile()) {
      return err(appError('E_COPY_FAILED', '源文件不存在', file))
    }
  }
  return ok(list)
}

export function copyPathsToClipboard(paths: string[]): Result<void> {
  const files = normalizeExistingFiles(paths)
  if (!files.ok) return files
  try {
    clipboard.writeText(files.data.join('\n'))
    return ok(undefined)
  } catch (cause) {
    return err(
      appError(
        'E_COPY_FAILED',
        '复制路径失败',
        cause instanceof Error ? cause.message : String(cause),
      ),
    )
  }
}

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

/** 写入系统文件剪贴板；失败时返回明确错误，UI 可提示平台受限。 */
export async function writeFilesToClipboard(paths: string[]): Promise<Result<void>> {
  const files = normalizeExistingFiles(paths)
  if (!files.ok) return files

  if (process.platform === 'darwin') {
    const asPaths = files.data.map((file) => `POSIX file ${JSON.stringify(file)}`).join(', ')
    const apple = `set the clipboard to {${asPaths}}`
    try {
      await execFileAsync('osascript', ['-e', apple])
      return ok(undefined)
    } catch (cause) {
      return err(
        appError(
          'E_COPY_FAILED',
          '当前平台文件剪贴板不可用',
          cause instanceof Error ? cause.message : String(cause),
        ),
      )
    }
  }

  if (process.platform === 'win32') {
    const joined = files.data.map((file) => `'${file.replace(/'/g, "''")}'`).join(',')
    const ps = `Set-Clipboard -Path @(${joined})`
    try {
      await execFileAsync('powershell.exe', ['-NoProfile', '-Command', ps], {
        windowsHide: true,
      })
      return ok(undefined)
    } catch (cause) {
      return err(
        appError(
          'E_COPY_FAILED',
          '当前平台文件剪贴板不可用',
          cause instanceof Error ? cause.message : String(cause),
        ),
      )
    }
  }

  return err(appError('E_COPY_FAILED', '当前平台文件剪贴板不可用', process.platform))
}
