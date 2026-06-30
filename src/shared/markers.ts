// 元のブラウザ拡張 (src/constants/markers.ts, src/utils/api/jikkyo/findMarkers.ts)
// のジャンプ機能を移植したもの。
// 「該当コメントが 8 秒ウィンドウ内で最も密集する位置」へジャンプする。

export interface CommentLike {
  /** vpos は 1/100 秒単位（centiseconds）。formatted コメントの vpos と同じ。 */
  vpos: number
  content: string
}

type Range =
  | [start: number | null, end: number | null]
  | ((durationMs: number) => [start: number | null, end: number | null])

export const MARKERS = [
  {
    key: 'start',
    label: 'ｷﾀ━━━━(ﾟ∀ﾟ)━━━━!!',
    shortLabel: 'ｷﾀ-',
    // Cmd/Ctrl+Shift+K
    shortcutKey: 'K',
    regexp:
      /^(ｷﾀ|キタ)[ｰー━].*[!！]$|^きたあ{0,}$|^(始|はじ)まっ?た|hjmt|ｈｊｍｔ$/i,
    // ミリ秒。先頭〜5分のみ対象
    range: [0, 300000] as Range,
  },
  {
    key: 'op',
    label: 'オープニング',
    shortLabel: 'OP',
    // Cmd/Ctrl+Shift+O
    shortcutKey: 'O',
    regexp: /^出?(OP|ＯＰ)$/i,
    range: ((durationMs) => [null, durationMs / 2]) as Range,
  },
  {
    key: 'aPart',
    label: 'Aパート',
    shortLabel: 'A',
    // Cmd/Ctrl+Shift+A
    shortcutKey: 'A',
    regexp: /^(A|Ａ)$/,
    range: [null, null] as Range,
  },
  {
    key: 'bPart',
    label: 'Bパート',
    shortLabel: 'B',
    // Cmd/Ctrl+Shift+B
    shortcutKey: 'B',
    regexp: /^(B|Ｂ)$/,
    range: [null, null] as Range,
  },
  {
    key: 'ed',
    label: 'エンディング',
    shortLabel: 'ED',
    // Cmd/Ctrl+Shift+E
    shortcutKey: 'E',
    regexp: /^(ED|ＥＤ)$/i,
    range: ((durationMs) => [durationMs / 2, null]) as Range,
  },
  {
    key: 'cPart',
    label: 'Cパート',
    shortLabel: 'C',
    // Cmd/Ctrl+Shift+C
    shortcutKey: 'C',
    regexp: /^(C|Ｃ)$/,
    range: [null, null] as Range,
  },
] as const satisfies {
  key: string
  label: string
  shortLabel: string
  shortcutKey: string
  regexp: RegExp
  range: Range
}[]

export type MarkerKey = (typeof MARKERS)[number]['key']

/** 全マーカーを null で初期化した Record を返す */
export function emptyMarkers(): Record<MarkerKey, number | null> {
  const result = {} as Record<MarkerKey, number | null>
  for (const m of MARKERS) result[m.key] = null
  return result
}

/**
 * 各マーカーのジャンプ先時刻（ミリ秒）を算出する。見つからなければ null。
 * 元の findMarkers と同じく、マーカーは時系列順に連鎖する（後のマーカーは前のマーカーより後ろ）。
 */
export function findMarkers(
  comments: CommentLike[]
): Record<MarkerKey, number | null> {
  const result = emptyMarkers()

  const sorted = comments
    .map((c) => ({ vposMs: c.vpos * 10, body: c.content }))
    .sort((a, b) => a.vposMs - b.vposMs)

  if (!sorted.length) {
    return result
  }

  const lastCmt = sorted.at(-1)!
  let prevVposMs = 0

  for (const { key, regexp, range } of MARKERS) {
    let rangeStart: number
    let rangeEnd: number

    if (typeof range === 'function') {
      // 元実装と同じく、最後のコメントの vposMs を「長さ」として渡す
      const [start, end] = range(lastCmt.vposMs)
      rangeStart = start ?? -Infinity
      rangeEnd = end ?? Infinity
    } else {
      rangeStart = range[0] ?? -Infinity
      rangeEnd = range[1] ?? Infinity
    }

    const minVposMs = Math.max(prevVposMs, rangeStart, 0)
    const maxVposMs = Math.min(lastCmt.vposMs, rangeEnd)

    const filtered = sorted.filter(({ vposMs, body }) => {
      return minVposMs <= vposMs && vposMs <= maxVposMs && regexp.test(body)
    })

    let tmpCount = 0
    let tmpVposMs = 0

    for (let i = 0; i < filtered.length; i++) {
      const { vposMs } = filtered[i]

      // i 番目以降で、8 秒以内に収まる該当コメントの塊
      const cluster = filtered.slice(i).filter((v) => v.vposMs - vposMs <= 8000)

      if (tmpCount < cluster.length) {
        const first = cluster[0]
        const last = cluster.at(-1)!
        const adjustOffset = Math.trunc((last.vposMs - first.vposMs) / 10)

        tmpCount = cluster.length
        tmpVposMs = first.vposMs + adjustOffset
      }
    }

    if (tmpCount) {
      prevVposMs = tmpVposMs
      result[key] = tmpVposMs
    } else {
      result[key] = null
    }
  }

  return result
}
