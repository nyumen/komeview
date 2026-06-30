// メインプロセスとレンダラーで共有する設定の型とデフォルト値。
// 保存先は app.getPath('userData')/settings.json（SPEC §10）。

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Settings {
  /** 再生速度（倍率） */
  playbackRate: number
  /** コメントのフォントサイズ倍率（1.0 = 100%、最小 0.5）SPEC §7 */
  fontScale: number
  /** コメントの不透明度（1.0 = 100%、最小 0.5）SPEC §7 */
  commentOpacity: number
  /** 大きいシーク量（秒、↑↓）SPEC §4 */
  bigSeekSec: number
  /** ウィンドウ背景の種類キー（SPEC §2.4） */
  background: string
  /** 常時最前面 */
  alwaysOnTop: boolean
  /** クリック透過 */
  clickThrough: boolean
  /** 擬似全画面モード SPEC §2.3 */
  pseudoFullscreen: boolean
  /** 操作パネルを常時表示 SPEC §3 */
  controlBarAlwaysVisible: boolean
  /** 通常時のウィンドウ位置/サイズ（擬似全画面の復元先） */
  windowBounds: WindowBounds | null
}

export const DEFAULT_SETTINGS: Settings = {
  playbackRate: 1.0,
  fontScale: 1.0,
  commentOpacity: 1.0,
  bigSeekSec: 15,
  background: 'transparent',
  alwaysOnTop: true,
  clickThrough: false,
  pseudoFullscreen: false,
  controlBarAlwaysVisible: false,
  windowBounds: null,
}
