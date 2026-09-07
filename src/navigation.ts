export const PAGE_IDS = ['workbench', 'jdk', 'settings'] as const

export type PageId = (typeof PAGE_IDS)[number]

export const PAGE_LABELS: Record<PageId, string> = {
  workbench: '工作台',
  jdk: 'JDK 管理',
  settings: '设置',
}

export const DEFAULT_PAGE: PageId = 'workbench'
