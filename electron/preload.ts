import { contextBridge } from 'electron'

/**
 * F01 占位：后续 F03 在此暴露 window.packforge 白名单 API。
 * 保持 contextIsolation，不向渲染进程暴露 Node。
 */
contextBridge.exposeInMainWorld('packforgeBootstrap', {
  version: '0.1.0',
})
