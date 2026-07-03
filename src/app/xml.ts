// ニコニコ動画コメント XML を @xpadev-net/niconicomments の `formatted` 形式へ変換する。
// （旧 controller/main.tsx から移植）

export interface FormattedComment {
  id: number
  vpos: number
  content: string
  date: number
  date_usec: number
  owner: boolean
  premium: boolean
  mail: string[]
  user_id: number
  layer: number
  is_my_post: boolean
}

export function parseNicoXML(xmlText: string): FormattedComment[] {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml')
  const chats = xmlDoc.getElementsByTagName('chat')
  const comments: FormattedComment[] = []

  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i]
    const content = chat.textContent || ''
    if (!content) continue

    const no = parseInt(chat.getAttribute('no') || '0', 10)
    const vpos = parseInt(chat.getAttribute('vpos') || '0', 10)
    const date = parseInt(chat.getAttribute('date') || '0', 10)
    const mail = (chat.getAttribute('mail') || '').split(/\s+/).filter(Boolean)
    // user_id は匿名コメントだと文字列ハッシュのことがあるので、数値化できなければ 0
    const user_id = parseInt(chat.getAttribute('user_id') || '0', 10) || 0
    const premium = parseInt(chat.getAttribute('premium') || '0', 10) > 0

    comments.push({
      id: no,
      vpos,
      content,
      date,
      date_usec: 0,
      owner: false,
      premium,
      mail,
      user_id,
      layer: -1,
      is_my_post: false,
    })
  }

  return comments.sort((a, b) => a.vpos - b.vpos)
}

/**
 * 描画用のコメント間引き（SPEC §7）。
 * 1秒バケットごとに最大 perSec 件を等間隔サンプリングして残す。
 * 統計（勢い・total/max/avg）は間引き前の全コメントから計算するため、ここでは描画分だけを削る。
 */
export function thinComments(
  comments: FormattedComment[],
  perSec: number
): FormattedComment[] {
  if (perSec <= 0) return comments

  // vpos 昇順前提で1秒（100 vpos）ごとにまとめる
  const result: FormattedComment[] = []
  let bucketStart = 0
  const flush = (end: number) => {
    const m = end - bucketStart
    if (m <= perSec) {
      for (let i = bucketStart; i < end; i++) result.push(comments[i])
    } else {
      // 等間隔に perSec 件を抽出
      for (let k = 0; k < perSec; k++) {
        result.push(comments[bucketStart + Math.floor((k * m) / perSec)])
      }
    }
    bucketStart = end
  }

  let currentSec = comments.length ? Math.floor(comments[0].vpos / 100) : 0
  for (let i = 0; i < comments.length; i++) {
    const sec = Math.floor(comments[i].vpos / 100)
    if (sec !== currentSec) {
      flush(i)
      currentSec = sec
    }
  }
  flush(comments.length)
  return result
}
