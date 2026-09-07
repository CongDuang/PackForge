import Store from 'electron-store'
import { DEFAULT_SETTINGS, type AppSettings, type JdkInstall, type ProjectRef, type SigningProfileMeta } from '../../src/shared/types'

export type StoreSchema = {
  settings: AppSettings
  projects: { recent: ProjectRef[] }
  jdk: { installs: JdkInstall[]; defaultId: string | null }
  signing: { profiles: SigningProfileMeta[] }
}

const defaults: StoreSchema = {
  settings: { ...DEFAULT_SETTINGS },
  projects: { recent: [] },
  jdk: { installs: [], defaultId: null },
  signing: { profiles: [] },
}

let instance: Store<StoreSchema> | undefined

export function getAppStore(): Store<StoreSchema> {
  if (!instance) {
    instance = new Store<StoreSchema>({
      name: 'packforge',
      defaults,
    })
  }
  return instance
}

export function getSettingsFromStore(): AppSettings {
  return getAppStore().get('settings')
}

export function setSettingsInStore(partial: Partial<AppSettings>): AppSettings {
  const next = { ...getSettingsFromStore(), ...partial }
  getAppStore().set('settings', next)
  return next
}

export function getRecentProjects(): ProjectRef[] {
  return getAppStore().get('projects.recent')
}

export function getJdkState(): { installs: JdkInstall[]; defaultId: string | null } {
  return getAppStore().get('jdk')
}

export function getSigningProfiles(): SigningProfileMeta[] {
  return getAppStore().get('signing.profiles')
}
