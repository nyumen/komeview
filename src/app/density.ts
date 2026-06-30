// コメントの勢い（コメ/分）— スライディングウィンドウ方式（SPEC §8）

export interface DensityResult {
  /** 総コメント数 */
  total: number
  /** 平均（総数 ÷ 総時間[分]） */
  avgPerMin: number
  /** 最大（60秒スライディング窓のコメ/分の最大値） */
  maxPerMin: number
  /** 勢い波形グラフ用のビン（各ビン = コメ/分、中心化 W=10秒） */
  bins: number[]
  /** bins の最大値（描画の正規化用） */
  binMax: number
  /** コメント時刻（秒）昇順。momentumAt のために保持 */
  sortedSec: number[]
}

/** sortedSec から target 以上になる最初のインデックスを返す（二分探索） */
function lowerBound(sortedSec: number[], target: number): number {
  let lo = 0
  let hi = sortedSec.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sortedSec[mid] < target) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** 時刻 timeSec における勢い（コメ/分）。中心化スライディングウィンドウ。 */
export function momentumAt(
  sortedSec: number[],
  timeSec: number,
  windowSec = 10
): number {
  const half = windowSec / 2
  const lo = lowerBound(sortedSec, timeSec - half)
  const hi = lowerBound(sortedSec, timeSec + half)
  const count = hi - lo
  return count * (60 / windowSec)
}

export function computeDensity(
  vposSecList: number[],
  durationSec: number,
  binCount = 400
): DensityResult {
  const sortedSec = [...vposSecList].sort((a, b) => a - b)
  const total = sortedSec.length
  const avgPerMin = durationSec > 0 ? total / (durationSec / 60) : 0

  // max: 60秒スライディング窓に入る最大コメント数（= コメ/分）
  let maxCount = 0
  let lo = 0
  for (let hi = 0; hi < sortedSec.length; hi++) {
    while (sortedSec[hi] - sortedSec[lo] > 60) lo++
    const count = hi - lo + 1
    if (count > maxCount) maxCount = count
  }
  const maxPerMin = maxCount

  // bins: 中心化 W=10秒 の勢いを binCount 点サンプリング
  const bins = new Array<number>(binCount).fill(0)
  let binMax = 0
  for (let i = 0; i < binCount; i++) {
    const tc = ((i + 0.5) / binCount) * durationSec
    const v = momentumAt(sortedSec, tc, 10)
    bins[i] = v
    if (v > binMax) binMax = v
  }

  return { total, avgPerMin, maxPerMin, bins, binMax, sortedSec }
}
