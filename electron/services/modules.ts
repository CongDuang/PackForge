import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseSettingsIncludes, type ParsedModules } from '../../src/shared/parseSettings.ts'
import { ok, type Result } from '../../src/shared/result.ts'
import { validateProject } from './project.ts'

export function listModules(projectPath: string): Result<ParsedModules> {
  const validated = validateProject(projectPath)
  if (!validated.ok) return validated
  const settingsPath = path.join(validated.data.path, validated.data.settingsFile)
  try {
    const source = readFileSync(settingsPath, 'utf8')
    return ok(parseSettingsIncludes(source))
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    return ok({
      modules: [],
      defaultModule: 'app',
      parseWarning: `无法读取 settings 文件，请手动填写模块名（${detail}）`,
    })
  }
}
