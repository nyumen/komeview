import type { MarkerKey } from '../shared/markers'

/** 速度メニューのプリセット（SPEC §6 / 高い順に表示） */
export const SPEED_PRESETS = [2.0, 1.75, 1.5, 1.25, 1.0, 0.75]

/** フォントサイズ倍率（SPEC §7） 100%〜50% を 10% 刻み */
export const FONT_SCALES = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5]

/** コメント不透明度（SPEC §7） 100%〜50% を 10% 刻み */
export const OPACITY_LEVELS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5]

/** 大きいシーク量プリセット（秒、↑↓） */
export const BIG_SEEK_PRESETS = [3, 5, 10, 15, 30]

/** ウィンドウ背景の選択肢（SPEC §2.4）。デフォルトは透明。 */
export interface BackgroundOption {
  key: string
  label: string
  css: string
}
export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { key: 'transparent', label: '透明', css: 'transparent' },
  { key: 'gray25', label: 'グレー 25%', css: 'rgba(128, 128, 128, 0.25)' },
  { key: 'gray50', label: 'グレー 50%', css: 'rgba(128, 128, 128, 0.5)' },
  { key: 'gray75', label: 'グレー 75%', css: 'rgba(128, 128, 128, 0.75)' },
  { key: 'black', label: '黒', css: 'rgba(0, 0, 0, 1)' },
]
export const backgroundCss = (key: string): string =>
  BACKGROUND_OPTIONS.find((o) => o.key === key)?.css ?? 'transparent'

/** マーカー種別ごとの色（シークバー上の点 / SPEC §5） */
export const MARKER_COLORS: Record<MarkerKey, string> = {
  start: '#22d3ee',
  op: '#a78bfa',
  aPart: '#34d399',
  bPart: '#fbbf24',
  cPart: '#f472b6',
  ed: '#f87171',
}

/** マーカー種別ごとの短いラベル */
export const MARKER_LABELS: Record<MarkerKey, string> = {
  start: 'ｷﾀ',
  op: 'OP',
  aPart: 'A',
  bPart: 'B',
  cPart: 'C',
  ed: 'ED',
}
