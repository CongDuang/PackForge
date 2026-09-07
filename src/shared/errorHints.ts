import type { PackForgeErrorCode } from './errors'

/** PRD §15 用户提示要点 */
export const ERROR_HINTS: Record<PackForgeErrorCode, string> = {
  E_NO_WRAPPER: '请选择含 Wrapper 的 Android 工程目录',
  E_NO_SETTINGS: '目录不像 Gradle 工程',
  E_NO_SDK: '去设置填写 SDK，或配置环境变量 / local.properties',
  E_NO_JDK: '去 JDK 管理导入本机已安装的 JDK',
  E_JDK_INVALID: '重新选择 JDK 根目录',
  E_SIGN_MISSING: '在工作台检查路径与钥匙串中的密码',
  E_VARIANT_PARSE: '尝试刷新变体；核对模块与构建类型',
  E_BUILD_FAILED: '查看日志；常见为依赖/签名/SDK 组件缺失',
  E_BUILD_CANCELLED: '可重新打包',
  E_ARTIFACT_NONE: '检查模块路径与变体是否匹配',
  E_COPY_FAILED: '检查权限、磁盘空间与目标路径',
  E_NOT_IMPLEMENTED: '该能力尚未实现',
}

export function formatUserError(code: PackForgeErrorCode, message: string): string {
  const hint = ERROR_HINTS[code]
  return hint ? `${message} — ${hint}` : message
}
