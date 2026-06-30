/// <reference types="vite/client" />

import type { NcoApi } from '../electron/preload'

declare global {
  interface Window {
    api: NcoApi
  }
}

export {}
