import { appError, type AppError } from './errors.ts'
import { err, ok, type Result } from './result.ts'
import { buildGradleTaskName, composeFlavorPart } from './taskName.ts'
import type {
  BuildKind,
  ProjectSigningBinding,
  ProjectValidation,
  VariantDiscovery,
} from './types.ts'

export type PreflightInput = {
  project: ProjectValidation | null
  module: string
  kind: BuildKind
  buildType: string
  discovery: VariantDiscovery | null
  flavorByDimension: Record<string, string>
  jdkId: string
  projectSigning: ProjectSigningBinding | null
}

export type PreflightOk = {
  taskName: string
  flavorPart: string
  signingProfileId: string | null
}

/** 同步预检：项目 / 模块 / 变体 / JDK / 签名绑定是否齐全。 */
export function preflightSync(input: PreflightInput): Result<PreflightOk> {
  if (!input.project) {
    return err(appError('E_NO_SETTINGS', '请先打开 Android 工程'))
  }
  const module = input.module.replace(/^:+/, '').trim()
  if (!module) {
    return err(appError('E_VARIANT_PARSE', '请先选择模块'))
  }
  if (!input.jdkId.trim()) {
    return err(appError('E_NO_JDK', '未选择有效 JDK'))
  }
  if (!input.buildType.trim()) {
    return err(appError('E_VARIANT_PARSE', '请选择 Build Type'))
  }
  if (input.discovery) {
    for (const dim of input.discovery.flavorDimensions) {
      const flavor = input.flavorByDimension[dim.name]?.trim()
      if (!flavor && dim.flavors.length > 0) {
        return err(appError('E_VARIANT_PARSE', `请为维度 ${dim.name} 选择 flavor`))
      }
    }
  }
  if (!input.projectSigning) {
    return err(appError('E_SIGN_MISSING', '请先保存本工程签名绑定（可选择不注入）'))
  }
  if (input.projectSigning.inject && !input.projectSigning.profile) {
    return err(appError('E_SIGN_MISSING', '本工程签名绑定不完整或 keystore 不存在'))
  }

  const flavorPart = input.discovery
    ? composeFlavorPart(
        input.discovery.flavorDimensions.map(
          (dim) => input.flavorByDimension[dim.name] ?? dim.flavors[0] ?? '',
        ),
      )
    : ''

  const taskName = buildGradleTaskName({
    module,
    kind: input.kind,
    flavorPart,
    buildType: input.buildType,
  })

  const signingProfileId =
    input.projectSigning.inject && input.projectSigning.profile
      ? input.projectSigning.profile.id
      : null

  return ok({ taskName, flavorPart, signingProfileId })
}

export function asBannerError(error: AppError): string {
  return `${error.code}：${error.message}`
}
