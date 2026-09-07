import type { BuildKind } from './types'

export type TaskNameInput = {
  module: string
  kind: BuildKind
  flavorPart: string
  buildType: string
}

/** AGP 任务名：`:module:assemble|bundle + FlavorPart + BuildType` */
export function buildGradleTaskName(input: TaskNameInput): string {
  const module = input.module.replace(/^:+/, '').trim()
  const kind = input.kind
  const flavorPart = input.flavorPart
  const buildType = capitalizeAgp(input.buildType)
  return `:${module}:${kind}${flavorPart}${buildType}`
}

/** 各维度 flavor 按 AGP 顺序拼接成驼峰串；无 flavor 则为空。 */
export function composeFlavorPart(flavors: string[]): string {
  return flavors.filter(Boolean).map(capitalizeAgp).join('')
}

export function capitalizeAgp(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}
