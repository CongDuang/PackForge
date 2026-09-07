export type ParsedModules = {
  modules: string[]
  defaultModule: string
  parseWarning?: string
}

const IGNORED_BLOCKS = ['pluginManagement', 'dependencyResolutionManagement'] as const

export function parseSettingsIncludes(source: string): ParsedModules {
  const scanned = stripIgnoredBlocks(stripComments(source))
  const modules = unique(extractIncludeNames(scanned).map(normalizeModule).filter(Boolean))
  if (modules.length === 0) {
    return {
      modules: [],
      defaultModule: 'app',
      parseWarning: '未能解析 include，请手动填写模块名',
    }
  }
  return {
    modules,
    defaultModule: pickDefaultModule(modules),
  }
}

export function pickDefaultModule(modules: string[]): string {
  const exact = modules.find((name) => name === 'app')
  if (exact) return exact
  const lastSeg = modules.find((name) => name.split(':').at(-1) === 'app')
  if (lastSeg) return lastSeg
  return modules[0] ?? 'app'
}

export function normalizeModule(name: string): string {
  return name.replace(/^:+/, '').trim()
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
}

function stripIgnoredBlocks(source: string): string {
  let result = source
  for (const name of IGNORED_BLOCKS) {
    const re = new RegExp(`\\b${name}\\s*\\{`, 'g')
    let match = re.exec(result)
    while (match) {
      const start = match.index
      const open = match.index + match[0].length - 1
      const close = matchingBrace(result, open)
      if (close < 0) break
      result = `${result.slice(0, start)}${result.slice(close + 1)}`
      re.lastIndex = start
      match = re.exec(result)
    }
  }
  return result
}

function matchingBrace(source: string, openIndex: number): number {
  let depth = 0
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

function extractIncludeNames(source: string): string[] {
  const names: string[] = []
  const re = /\binclude(?!Build)\s*/g
  let match = re.exec(source)
  while (match) {
    let cursor = match.index + match[0].length
    if (source[cursor] === '(') {
      const close = matchingParen(source, cursor)
      if (close < 0) break
      names.push(...extractQuoted(source.slice(cursor + 1, close)))
      re.lastIndex = close + 1
    } else {
      const end = source.indexOf('\n', cursor)
      const line = source.slice(cursor, end === -1 ? source.length : end)
      names.push(...extractQuoted(line))
      re.lastIndex = end === -1 ? source.length : end
    }
    match = re.exec(source)
  }
  return names
}

function matchingParen(source: string, openIndex: number): number {
  let depth = 0
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === '(') depth += 1
    else if (ch === ')') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

function extractQuoted(chunk: string): string[] {
  const found: string[] = []
  const re = /['"]([^'"]+)['"]/g
  let match = re.exec(chunk)
  while (match) {
    found.push(match[1] ?? '')
    match = re.exec(chunk)
  }
  return found
}
