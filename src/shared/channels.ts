/** IPC channel 前缀（冻结）。完整名为 `packforge:<methodName>`。 */
export const PACKFORGE_CHANNEL_PREFIX = 'packforge:'

export const INVOKE_METHODS = [
  'getSettings',
  'setSettings',
  'pickDirectory',
  'pickFile',
  'validateProject',
  'listRecentProjects',
  'openProject',
  'removeRecentProject',
  'pinRecentProject',
  'listModules',
  'discoverVariants',
  'cancelVariantDiscovery',
  'previewTaskName',
  'listJdks',
  'importJdk',
  'removeJdk',
  'setDefaultJdk',
  'setProjectJdk',
  'getProjectSigning',
  'upsertProjectSigning',
  'clearProjectSigning',
  'buildSigningInjectArgs',
  'resolveBuildEnv',
  'startBuild',
  'cancelBuild',
  'scanArtifacts',
  'copyArtifactsToFolder',
  'showItemInFolder',
  'toggleDevTools',
  'listAdbDevices',
  'installApk',
] as const

export type InvokeMethod = (typeof INVOKE_METHODS)[number]

export function invokeChannel(method: InvokeMethod): string {
  return `${PACKFORGE_CHANNEL_PREFIX}${method}`
}

export const EVENT_CHANNELS = {
  buildLog: `${PACKFORGE_CHANNEL_PREFIX}buildLog`,
  buildStatus: `${PACKFORGE_CHANNEL_PREFIX}buildStatus`,
  menuPickProject: `${PACKFORGE_CHANNEL_PREFIX}menuPickProject`,
  menuOpenRecent: `${PACKFORGE_CHANNEL_PREFIX}menuOpenRecent`,
  buildNotificationClick: `${PACKFORGE_CHANNEL_PREFIX}buildNotificationClick`,
} as const
