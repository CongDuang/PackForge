import Store from 'electron-store'
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type JdkInstall,
  type ProjectRef,
  type ProjectSigningBinding,
} from '../../src/shared/types'

export type StoreSchema = {
  settings: AppSettings
  projects: { recent: ProjectRef[] }
  jdk: { installs: JdkInstall[]; defaultId: string | null }
  signing: { bindings: Record<string, ProjectSigningBinding> }
}

const defaults: StoreSchema = {
  settings: { ...DEFAULT_SETTINGS },
  projects: { recent: [] },
  jdk: { installs: [], defaultId: null },
  signing: { bindings: {} },
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
  return { ...DEFAULT_SETTINGS, ...getAppStore().get('settings') }
}

export function setSettingsInStore(partial: Partial<AppSettings>): AppSettings {
  const next = { ...getSettingsFromStore(), ...partial }
  getAppStore().set('settings', next)
  return next
}

export function getRecentProjects(): ProjectRef[] {
  return getAppStore().get('projects.recent')
}

export function setRecentProjects(recent: ProjectRef[]): ProjectRef[] {
  getAppStore().set('projects.recent', recent)
  return recent
}

export function getJdkState(): { installs: JdkInstall[]; defaultId: string | null } {
  return getAppStore().get('jdk')
}

export function setJdkState(jdk: { installs: JdkInstall[]; defaultId: string | null }): void {
  getAppStore().set('jdk', jdk)
}

export function getSigningBindings(): Record<string, ProjectSigningBinding> {
  return getAppStore().get('signing.bindings') ?? {}
}

export function setSigningBindings(bindings: Record<string, ProjectSigningBinding>): void {
  getAppStore().set('signing.bindings', bindings)
}

export function getSigningBinding(projectPath: string): ProjectSigningBinding | null {
  return getSigningBindings()[projectPath] ?? null
}

export function setSigningBinding(binding: ProjectSigningBinding): void {
  const next = { ...getSigningBindings(), [binding.projectPath]: binding }
  setSigningBindings(next)
}

export function removeSigningBinding(projectPath: string): ProjectSigningBinding | null {
  const bindings = { ...getSigningBindings() }
  const removed = bindings[projectPath] ?? null
  if (removed) {
    delete bindings[projectPath]
    setSigningBindings(bindings)
  }
  return removed
}
