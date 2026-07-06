// 元のブラウザ拡張 (src/constants/markers.ts, src/utils/api/jikkyo/findMarkers.ts)
// のジャンプ機能を移植し、複数回検出に拡張したもの（SPEC §5）。
// 「該当コメントが 8 秒ウィンドウ内で密集する位置」を種類ごとに複数箇所検出する
// （30分+30分の2話連続放送や、特殊EDで終盤にOPが流れる編成などに対応）。

export interface CommentLike {
  /** vpos は 1/100 秒単位（centiseconds）。formatted コメントの vpos と同じ。 */
  vpos: number
  content: string
}

export const MARKERS = [
  {
    key: 'start',
    label: 'ｷﾀ━━━━(ﾟ∀ﾟ)━━━━!!',
    shortLabel: 'ｷﾀ-',
    shortcutKey: 'K',
    regexp:
      /^(ｷﾀ|キタ)[ｰー━].*[!！]$|^きたあ{0,}$|^(始|はじ)まっ?た|hjmt|ｈｊｍｔ$/i,
  },
  {
    key: 'op',
    label: 'オープニング',
    shortLabel: 'OP',
    shortcutKey: 'O',
    regexp: /^出?(OP|ＯＰ)$/i,
  },
  {
    key: 'aPart',
    label: 'Aパート',
    shortLabel: 'A',
    shortcutKey: 'A',
    regexp: /^(A|Ａ)$/,
  },
  {
    key: 'bPart',
    label: 'Bパート',
    shortLabel: 'B',
    shortcutKey: 'B',
    regexp: /^(B|Ｂ)$/,
  },
  {
    key: 'ed',
    label: 'エンディング',
    shortLabel: 'ED',
    shortcutKey: 'E',
    regexp: /^(ED|ＥＤ)$/i,
  },
  {
    key: 'cPart',
    label: 'Cパート',
    shortLabel: 'C',
    shortcutKey: 'C',
    regexp: /^(C|Ｃ)$/,
  },
] as const satisfies {
  key: string
  label: string
  shortLabel: string
  shortcutKey: string
  regexp: RegExp
}[]

export type MarkerKey = (typeof MARKERS)[number]['key']

/** マーカーの1出現。同じ key が複数回現れうる */
export interface MarkerOccurrence {
  key: MarkerKey
  /** ジャンプ先時刻（ミリ秒） */
  vposMs: number
}

/** 「密集」とみなすウィンドウ幅（元実装と同じ8秒） */
const CLUSTER_WINDOW_MS = 8000
/** 同じ種類のマーカー同士はこれ以上離れていないと別の出現とみなさない（近接統合） */
const MIN_SEPARATION_MS = 5 * 60 * 1000

/**
 * 各マーカーの出現位置（複数可）を時系列順に返す。
 *
 * アルゴリズム:
 * 1. 種類ごとに該当コメントを集め、8秒ウィンドウのクラスタを列挙
 * 2. コメント数の多いクラスタから順に採用し、採用済みと5分未満の近接クラスタは統合（棄却）
 * 3. 誤検出抑制: 最良クラスタは無条件で採用（従来の感度を維持）、
 *    2箇所目以降は「コメント2件以上 かつ 最良の20%以上」を要求
 */
export function findMarkerOccurrences(
  comments: CommentLike[]
): MarkerOccurrence[] {
  const sorted = comments
    .map((c) => ({ vposMs: c.vpos * 10, body: c.content }))
    .sort((a, b) => a.vposMs - b.vposMs)

  if (!sorted.length) return []

  const result: MarkerOccurrence[] = []

  for (const { key, regexp } of MARKERS) {
    const matched = sorted.filter(({ body }) => regexp.test(body))
    if (!matched.length) continue

    // 8秒ウィンドウのクラスタを列挙（開始点を各該当コメントに置く）
    interface Cluster {
      vposMs: number
      count: number
    }
    const clusters: Cluster[] = []
    for (let i = 0; i < matched.length; i++) {
      const first = matched[i]
      let j = i
      while (
        j + 1 < matched.length &&
        matched[j + 1].vposMs - first.vposMs <= CLUSTER_WINDOW_MS
      ) {
        j++
      }
      const last = matched[j]
      // 元実装と同じ位置補正（クラスタ先頭からわずかに後ろへ）
      const adjustOffset = Math.trunc((last.vposMs - first.vposMs) / 10)
      clusters.push({ vposMs: first.vposMs + adjustOffset, count: j - i + 1 })
    }

    // コメント数の多い順に採用し、採用済みの5分以内は統合（棄却）
    const accepted: Cluster[] = []
    const byCount = [...clusters].sort(
      (a, b) => b.count - a.count || a.vposMs - b.vposMs
    )
    for (const c of byCount) {
      if (accepted.some((a) => Math.abs(a.vposMs - c.vposMs) < MIN_SEPARATION_MS)) {
        continue
      }
      accepted.push(c)
    }
    if (!accepted.length) continue

    // 誤検出抑制: 2箇所目以降は最低件数と相対件数を要求
    const bestCount = accepted[0].count
    const kept = accepted.filter(
      (c, idx) => idx === 0 || (c.count >= 2 && c.count >= bestCount * 0.2)
    )

    for (const c of kept) {
      result.push({ key, vposMs: c.vposMs })
    }
  }

  return result.sort((a, b) => a.vposMs - b.vposMs)
}
