import { capitalizeAgp } from './taskName.ts'
import type { VariantDiscovery } from './types.ts'

const TASK_NAME_RE = /^(assemble|bundle)([A-Z][\w]*)?$/
const COMMON_BUILD_TYPES = new Set(['Debug', 'Release', 'Staging', 'Benchmark'])

export function parseGradleTasksOutput(output: string): Omit<VariantDiscovery, 'source' | 'warning'> {
  const assembleTasks: string[] = []
  const bundleTasks: string[] = []
  const buildTypeSet = new Set<string>()
  const flavorPartSet = new Set<string>()

  for (const rawLine of output.split(/\r?\n/)) {
    const token = rawLine.trim().split(/\s+/)[0] ?? ''
    const match = TASK_NAME_RE.exec(token)
    if (!match) continue
    const kind = match[1]
    const suffix = match[2] ?? ''
    if (kind === 'assemble') assembleTasks.push(token)
    else bundleTasks.push(token)
    if (!suffix) continue
    const parsed = splitVariantSuffix(suffix)
    if (!parsed) continue
    buildTypeSet.add(parsed.buildType)
    if (parsed.flavorPart) flavorPartSet.add(parsed.flavorPart)
  }

  const flavorParts = [...flavorPartSet]
  return {
    buildTypes: [...buildTypeSet],
    flavorDimensions:
      flavorParts.length === 0 ? [] : [{ name: 'flavor', flavors: flavorParts }],
    assembleTasks,
    bundleTasks,
  }
}

/** 去掉 assemble/bundle 前缀后：末段为 buildType，前缀为 flavorPart。 */
export function splitVariantSuffix(suffix: string): { flavorPart: string; buildType: string } | null {
  if (!suffix) return null
  const parts = suffix.replace(/([a-z])([A-Z])/g, '$1|$2').split('|')
  if (parts.length === 0) return null
  const last = parts[parts.length - 1] ?? ''
  if (COMMON_BUILD_TYPES.has(last) || parts.length === 1) {
    return { flavorPart: parts.slice(0, -1).join(''), buildType: last }
  }
  return { flavorPart: parts.slice(0, -1).join(''), buildType: last }
}

export function parseStaticBuildScript(source: string): Omit<VariantDiscovery, 'source' | 'warning'> | null {
  const text = stripComments(source)
  const buildTypes = extractBuildTypes(text).map(capitalizeAgp)
  const flavorDimensions = extractFlavorDimensions(text)
  const flavors = extractProductFlavors(text)

  if (buildTypes.length === 0 && flavors.length === 0) return null

  const types = buildTypes.length > 0 ? buildTypes : ['Debug', 'Release']
  const dimensions = mergeFlavorDimensions(flavorDimensions, flavors)

  return {
    buildTypes: unique(types),
    flavorDimensions: dimensions,
    assembleTasks: [],
    bundleTasks: [],
  }
}

function extractBuildTypes(source: string): string[] {
  const block = extractNamedBlock(source, 'buildTypes')
  if (!block) return []
  const names: string[] = []
  const createRe = /\b(?:getByName|create|maybeCreate|register)\s*\(\s*["']([^"']+)["']/g
  let match = createRe.exec(block)
  while (match) {
    names.push(match[1] ?? '')
    match = createRe.exec(block)
  }
  const identRe = /(?:^|[{\n;])\s*(debug|release|staging|benchmark|[a-zA-Z][\w]*)\s*\{/g
  match = identRe.exec(block)
  while (match) {
    const name = match[1] ?? ''
    if (name && name !== 'initWith') names.push(name)
    match = identRe.exec(block)
  }
  return unique(names.filter(Boolean))
}

function extractFlavorDimensions(source: string): string[] {
  const names: string[] = []
  const listRe = /flavorDimensions\s*(?:\+=|=)\s*(?:listOf\s*)?(?:\(|\[)\s*([^)\]]*)(?:\)|\])/g
  let match = listRe.exec(source)
  while (match) {
    names.push(...quotedStrings(match[1] ?? ''))
    match = listRe.exec(source)
  }
  const bareRe = /flavorDimensions\s+((?:["'][^"']+["']\s*,\s*)*["'][^"']+["'])/g
  match = bareRe.exec(source)
  while (match) {
    names.push(...quotedStrings(match[1] ?? ''))
    match = bareRe.exec(source)
  }
  const plusRe = /flavorDimensions\s*\+=\s*["']([^"']+)["']/g
  match = plusRe.exec(source)
  while (match) {
    names.push(match[1] ?? '')
    match = plusRe.exec(source)
  }
  return unique(names.filter(Boolean))
}

function extractProductFlavors(source: string): { name: string; dimension?: string }[] {
  const block = extractNamedBlock(source, 'productFlavors')
  if (!block) return []
  const flavors: { name: string; dimension?: string }[] = []

  const createRe =
    /\b(?:create|maybeCreate|register)\s*\(\s*["']([^"']+)["']\s*\)\s*\{([\s\S]*?)\}/g
  let match = createRe.exec(block)
  while (match) {
    flavors.push({
      name: match[1] ?? '',
      dimension: dimensionIn(match[2] ?? ''),
    })
    match = createRe.exec(block)
  }

  const identRe = /(?:^|[{\n;])\s*([a-zA-Z][\w]*)\s*\{([\s\S]*?)\}/g
  match = identRe.exec(block)
  while (match) {
    const name = match[1] ?? ''
    if (name && !['create', 'maybeCreate', 'register', 'getByName'].includes(name)) {
      flavors.push({ name, dimension: dimensionIn(match[2] ?? '') })
    }
    match = identRe.exec(block)
  }

  return flavors.filter((item) => item.name)
}

function mergeFlavorDimensions(
  dimensionNames: string[],
  flavors: { name: string; dimension?: string }[],
): VariantDiscovery['flavorDimensions'] {
  if (flavors.length === 0) return []
  const buckets = new Map<string, string[]>()
  const fallback = dimensionNames[0] ?? 'flavor'
  for (const flavor of flavors) {
    const dim = flavor.dimension || fallback
    const list = buckets.get(dim) ?? []
    if (!list.includes(flavor.name)) list.push(flavor.name)
    buckets.set(dim, list)
  }
  const ordered = dimensionNames.length > 0 ? dimensionNames : [...buckets.keys()]
  return ordered
    .filter((name) => buckets.has(name))
    .map((name) => ({ name, flavors: buckets.get(name) ?? [] }))
}

function dimensionIn(body: string): string | undefined {
  const match = /dimension\s*=\s*["']([^"']+)["']/.exec(body) ?? /dimension\s+["']([^"']+)["']/.exec(body)
  return match?.[1]
}

function extractNamedBlock(source: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*\\{`)
  const found = re.exec(source)
  if (!found) return null
  const open = found.index + found[0].length - 1
  const close = matchingBrace(source, open)
  if (close < 0) return null
  return source.slice(open + 1, close)
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

function quotedStrings(chunk: string): string[] {
  const found: string[] = []
  const re = /['"]([^'"]+)['"]/g
  let match = re.exec(chunk)
  while (match) {
    found.push(match[1] ?? '')
    match = re.exec(chunk)
  }
  return found
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}
