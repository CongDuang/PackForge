import { SIGNING_INJECT_KEYS, SIGNING_PREVIEW_SECRET } from '../../src/shared/signingArgs.ts'

/** 从签名注入 argv 提取需脱敏的明文密码。 */
export function secretsFromSigningArgs(args: string[]): string[] {
  const secrets: string[] = []
  const prefixes = [
    `-P${SIGNING_INJECT_KEYS.storePassword}=`,
    `-P${SIGNING_INJECT_KEYS.keyPassword}=`,
  ]
  for (const arg of args) {
    for (const prefix of prefixes) {
      if (arg.startsWith(prefix)) {
        const value = arg.slice(prefix.length)
        if (value) secrets.push(value)
      }
    }
  }
  return secrets
}

/** 将日志行中的明文密码替换为 ***（按长度降序避免短串误伤）。 */
export function redactSecrets(line: string, secrets: string[]): string {
  let out = line
  const unique = [...new Set(secrets.filter(Boolean))].sort((a, b) => b.length - a.length)
  for (const secret of unique) {
    if (!secret) continue
    out = out.split(secret).join(SIGNING_PREVIEW_SECRET)
  }
  // 兜底：常见 -P...password= 回显
  out = out.replace(
    /(-Pandroid\.injected\.signing\.(?:store|key)\.password=)([^\s"']+)/gi,
    `$1${SIGNING_PREVIEW_SECRET}`,
  )
  return out
}

/** 拆分高级 Gradle 参数（支持简单引号）。 */
export function splitGradleArgs(raw: string): string[] {
  const text = raw.trim()
  if (!text) return []
  const args: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!
    if (quote) {
      if (ch === quote) {
        quote = null
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (current) {
        args.push(current)
        current = ''
      }
      continue
    }
    current += ch
  }
  if (current) args.push(current)
  return args
}

export function parseBuildRequest(raw: unknown): {
  projectPath: string
  module: string
  kind: 'assemble' | 'bundle'
  flavorPart: string
  buildType: string
  jdkId: string
  signingProfileId: string | null
  extraArgs: string[]
} | null {
  const body = (raw ?? {}) as Record<string, unknown>
  const kind = body.kind
  if (kind !== 'assemble' && kind !== 'bundle') return null
  const projectPath = String(body.projectPath ?? '').trim()
  const module = String(body.module ?? '').trim()
  const jdkId = String(body.jdkId ?? '').trim()
  if (!projectPath || !module || !jdkId) return null
  const signingRaw = body.signingProfileId
  const signingProfileId =
    signingRaw == null || signingRaw === '' ? null : String(signingRaw)
  const extraArgs = Array.isArray(body.extraArgs)
    ? body.extraArgs.map((item) => String(item))
    : []
  return {
    projectPath,
    module,
    kind,
    flavorPart: String(body.flavorPart ?? ''),
    buildType: String(body.buildType ?? 'Release'),
    jdkId,
    signingProfileId,
    extraArgs,
  }
}
