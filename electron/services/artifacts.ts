import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { appError } from '../../src/shared/errors.ts'
import { err, ok, type Result } from '../../src/shared/result.ts'
import { capitalizeAgp } from '../../src/shared/taskName.ts'
import type { ArtifactItem, BuildKind } from '../../src/shared/types.ts'

export type ScanArtifactsInput = {
  projectPath: string
  module: string
  flavorPart: string
  buildType: string
  kind: BuildKind
  showAllModuleArtifacts?: boolean
}

function moduleDir(projectPath: string, module: string): string {
  return path.join(path.resolve(projectPath), ...module.replace(/^:+/, '').split(':').filter(Boolean))
}

function walkFiles(root: string, out: string[] = []): string[] {
  if (!existsSync(root)) return out
  let entries
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(root, entry.name)
    if (entry.isDirectory()) {
      walkFiles(full, out)
    } else if (entry.isFile()) {
      out.push(full)
    }
  }
  return out
}

function classify(filePath: string): ArtifactItem['type'] | null {
  const base = path.basename(filePath).toLowerCase()
  if (base.endsWith('.apk')) return 'apk'
  if (base.endsWith('.aab')) return 'aab'
  if (base === 'mapping.txt') return 'mapping'
  if (base === 'output-metadata.json') return 'other'
  return null
}

/** 变体匹配：路径片段含 flavor/buildType 的小写或驼峰形式。 */
export function matchesVariant(filePath: string, flavorPart: string, buildType: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase()
  const typeToken = capitalizeAgp(buildType)
  const typeLower = typeToken.toLowerCase()
  const flavor = flavorPart.trim()
  const flavorLower = flavor.toLowerCase()
  const hasType = normalized.includes(`/${typeLower}/`) || normalized.includes(typeLower)
  if (!flavor) return hasType
  const flavorCamel = capitalizeAgp(flavor)
  return (
    hasType &&
    (normalized.includes(flavorLower) ||
      normalized.includes(flavorCamel.toLowerCase()) ||
      path.basename(filePath).toLowerCase().includes(flavorLower + typeLower) ||
      path.basename(filePath).toLowerCase().includes((flavorCamel + typeToken).toLowerCase()))
  )
}

export function scanArtifacts(input: ScanArtifactsInput): Result<{ items: ArtifactItem[] }> {
  const root = moduleDir(input.projectPath, input.module)
  if (!existsSync(root)) {
    return ok({ items: [] })
  }

  const outputs = path.join(root, 'build', 'outputs')
  const candidates = [
    ...walkFiles(path.join(outputs, 'apk')),
    ...walkFiles(path.join(outputs, 'bundle')),
    ...walkFiles(path.join(outputs, 'mapping')),
    ...walkFiles(outputs).filter((file) => path.basename(file) === 'output-metadata.json'),
  ]

  const seen = new Set<string>()
  const items: ArtifactItem[] = []
  for (const file of candidates) {
    if (seen.has(file)) continue
    seen.add(file)
    const type = classify(file)
    if (!type) continue
    if (input.kind === 'assemble' && type === 'aab') continue
    if (input.kind === 'bundle' && type === 'apk') continue
    if (!input.showAllModuleArtifacts && !matchesVariant(file, input.flavorPart, input.buildType)) {
      continue
    }
    try {
      const st = statSync(file)
      items.push({
        path: file,
        type,
        size: st.size,
        mtime: st.mtimeMs,
      })
    } catch {
      // skip unreadable
    }
  }

  items.sort((a, b) => b.mtime - a.mtime)
  return ok({ items })
}

function stampName(filePath: string, now = new Date()): string {
  const ext = path.extname(filePath)
  const base = path.basename(filePath, ext)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${base}__${y}${m}${d}_${hh}${mm}${ss}${ext}`
}

export function copyArtifactsToFolder(
  paths: string[],
  targetDir: string,
): Result<{ copied: string[] }> {
  const destRoot = path.resolve(String(targetDir ?? '').trim())
  if (!destRoot || !existsSync(destRoot) || !statSync(destRoot).isDirectory()) {
    return err(appError('E_COPY_FAILED', '目标文件夹无效', destRoot))
  }
  const copied: string[] = []
  for (const raw of paths) {
    const src = path.resolve(String(raw ?? ''))
    if (!existsSync(src) || !statSync(src).isFile()) {
      return err(appError('E_COPY_FAILED', '源文件不存在', src))
    }
    let dest = path.join(destRoot, path.basename(src))
    if (existsSync(dest)) {
      dest = path.join(destRoot, stampName(src))
    }
    try {
      copyFileSync(src, dest)
      const srcSize = statSync(src).size
      const destSize = statSync(dest).size
      if (srcSize !== destSize) {
        return err(appError('E_COPY_FAILED', '复制后文件大小不一致', dest))
      }
      copied.push(dest)
    } catch (cause) {
      return err(
        appError(
          'E_COPY_FAILED',
          '复制文件失败',
          cause instanceof Error ? cause.message : String(cause),
        ),
      )
    }
  }
  return ok({ copied })
}

export function parseScanArtifactsInput(raw: unknown): ScanArtifactsInput | null {
  const body = (raw ?? {}) as Record<string, unknown>
  const kind = body.kind
  if (kind !== 'assemble' && kind !== 'bundle') return null
  const projectPath = String(body.projectPath ?? '').trim()
  const module = String(body.module ?? '').trim()
  if (!projectPath || !module) return null
  return {
    projectPath,
    module,
    flavorPart: String(body.flavorPart ?? ''),
    buildType: String(body.buildType ?? 'Release'),
    kind,
    showAllModuleArtifacts: Boolean(body.showAllModuleArtifacts),
  }
}
