import { contextBridge, ipcRenderer } from 'electron'
import type { Settings } from '../src/shared/settings'

const api = {
  // 設定
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (partial: Partial<Settings>): void =>
    ipcRenderer.send('settings:save', partial),

  // ウィンドウ操作
  minimize: (): void => ipcRenderer.send('window:minimize'),
  close: (): void => ipcRenderer.send('window:close'),
  setAlwaysOnTop: (on: boolean): void =>
    ipcRenderer.send('window:setAlwaysOnTop', on),
  setIgnoreMouse: (ignore: boolean): void =>
    ipcRenderer.send('window:setIgnoreMouse', ignore),
  setPseudoFullscreen: (on: boolean): void =>
    ipcRenderer.send('window:setPseudoFullscreen', on),

  // アプリ情報 / 外部リンク
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string): void => ipcRenderer.send('app:openExternal', url),

  // ファイル
  openFile: (): Promise<{ name: string; content: string } | null> =>
    ipcRenderer.invoke('dialog:openFile'),

  // komenasne サーバから再生中番組のコメントを取得
  fetchKomenasne: (
    baseUrl: string
  ): Promise<{ error?: string; title?: string; filename?: string; xml?: string }> =>
    ipcRenderer.invoke('komenasne:fetch', baseUrl),

  // アイコンへのドロップ / 関連付け起動で開かれた XML を受け取る（SPEC §11）
  onOpenFile: (cb: (file: { name: string; content: string }) => void): (() => void) => {
    const listener = (_e: unknown, file: { name: string; content: string }) => cb(file)
    ipcRenderer.on('file:open', listener)
    return () => ipcRenderer.removeListener('file:open', listener)
  },
}

export type NcoApi = typeof api

contextBridge.exposeInMainWorld('api', api)
