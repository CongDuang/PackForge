import { execFile } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { clipboard, shell } from 'electron'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import { filenamesPlistXml } from './filenamesPlist.ts'

export { filenamesPlistXml } from './filenamesPlist.ts'

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

function fileUrlFromPath(absolutePath: string): string {
  const segments = absolutePath.split(path.sep).map((seg) => encodeURIComponent(seg))
  return `file://${segments.join('/')}`
}

/**
 * AppKit 一次写入多种类型（Electron writeBuffer 每次会清空剪贴板，无法叠加）。
 * 单文件时附带 public.file-url。
 */
async function writeMacPasteboardViaAppKit(absolutePaths: string[]): Promise<void> {
  const pathsLiteral = JSON.stringify(absolutePaths)
  const fileUrl =
    absolutePaths.length === 1 ? JSON.stringify(fileUrlFromPath(absolutePaths[0]!)) : 'null'
  const jxa = `
ObjC.import('AppKit');
var pb = $.NSPasteboard.generalPasteboard;
pb.clearContents;
var paths = ${pathsLiteral};
pb.setPropertyListForType($(paths), 'NSFilenamesPboardType');
var fileUrl = ${fileUrl};
if (fileUrl) {
  pb.setStringForType($(fileUrl), 'public.file-url');
}
`
  await execFileAsync('osascript', ['-l', 'JavaScript', '-e', jxa])
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
    try {
      clipboard.writeBuffer(
        'NSFilenamesPboardType',
        Buffer.from(filenamesPlistXml(files.data), 'utf8'),
      )
      // 单文件补 public.file-url；多类型需 AppKit（writeBuffer 无法叠加）
      try {
        await writeMacPasteboardViaAppKit(files.data)
      } catch {
        // 已有 NSFilenamesPboardType，增强失败可忽略
      }
      return ok(undefined)
    } catch (primaryCause) {
      try {
        await writeMacPasteboardViaAppKit(files.data)
        return ok(undefined)
      } catch {
        return err(
          appError(
            'E_COPY_FAILED',
            '当前平台文件剪贴板不可用',
            primaryCause instanceof Error ? primaryCause.message : String(primaryCause),
          ),
        )
      }
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
