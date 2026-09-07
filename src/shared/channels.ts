/** IPC channel 前缀（冻结）。完整名为 `packforge:<methodName>`。 */
export const PACKFORGE_CHANNEL_PREFIX = 'packforge:'

export const INVOKE_METHODS = [
  'getSettings',
  'setSettings',
  'pickDirectory',
  'validateProject',
  'listRecentProjects',
  'openProject',
  'removeRecentProject',
  'pinRecentProject',
  'listModules',
  'discoverVariants',
  'previewTaskName',
  'listJdks',
  'importJdk',
  'removeJdk',
  'setDefaultJdk',
  'listSigningProfiles',
  'upsertSigningProfile',
  'deleteSigningProfile',
  'resolveBuildEnv',
  'startBuild',
  'cancelBuild',
  'scanArtifacts',
  'copyArtifactsToFolder',
  'copyPathsToClipboard',
  'writeFilesToClipboard',
  'showItemInFolder',
] as const

export type InvokeMethod = (typeof INVOKE_METHODS)[number]

export function invokeChannel(method: InvokeMethod): string {
  return `${PACKFORGE_CHANNEL_PREFIX}${method}`
}

export const EVENT_CHANNELS = {
  buildLog: `${PACKFORGE_CHANNEL_PREFIX}buildLog`,
  buildStatus: `${PACKFORGE_CHANNEL_PREFIX}buildStatus`,
} as const
