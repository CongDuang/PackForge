/// <reference types="vite/client" />

import type { PackforgeApi } from './shared/api'

declare global {
  interface Window {
    packforge: PackforgeApi
  }
}

export {}
