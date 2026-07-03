import type { MarkerKey } from '../shared/markers'

/** 速度メニューのプリセット（SPEC §6 / 高い順に表示） */
export const SPEED_PRESETS = [2.0, 1.75, 1.5, 1.25, 1.0, 0.75]

/** フォントサイズ倍率（SPEC §7） 100%〜50% を 10% 刻み */
export const FONT_SCALES = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5]

/** コメント不透明度（SPEC §7） 100%〜50% を 10% 刻み */
export const OPACITY_LEVELS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5]

/** 大きいシーク量プリセット（秒、↑↓） */
export const BIG_SEEK_PRESETS = [3, 5, 10, 15, 30]

/** コメント最大表示数プリセット（秒間の最大表示件数。0 = 制限なし / SPEC §7） */
export const THINNING_PRESETS = [
  { value: 0, label: '制限なし' },
  { value: 100, label: '秒間 100件' },
  { value: 50, label: '秒間 50件' },
  { value: 25, label: '秒間 25件' },
]

/** この件数を超えるコメントを読み込んだ場合のみ lazy レンダリングを有効化（SPEC §7） */
export const LAZY_THRESHOLD = 30000

/** ウィンドウ背景の選択肢（SPEC §2.4）。デフォルトは透明。 */
export interface BackgroundOption {
  key: string
  label: string
  css: string
}
// グレーは不透明の単色（%は黒に近づく濃さの段階）
export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { key: 'transparent', label: '透明', css: 'transparent' },
  { key: 'gray25', label: 'グレー 25%', css: '#bfbfbf' },
  { key: 'gray50', label: 'グレー 50%', css: '#808080' },
  { key: 'gray75', label: 'グレー 75%', css: '#404040' },
  { key: 'black', label: '黒', css: '#000000' },
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
