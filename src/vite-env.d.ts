/// <reference types="vite/client" />

import type { PackforgeApi } from './shared/api'

declare global {
  const __APP_VERSION__: string
  interface Window {
    packforge: PackforgeApi
  }
}

export {}
