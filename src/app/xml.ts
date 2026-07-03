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

export interface ParsedXml {
  comments: FormattedComment[]
  /** comments と同じ順序の生 user_id 文字列（NG判定・匿名IDは文字列ハッシュのため別持ち） */
  userIds: string[]
}

export function parseNicoXML(xmlText: string): ParsedXml {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml')
  const chats = xmlDoc.getElementsByTagName('chat')
  const entries: { comment: FormattedComment; userId: string }[] = []

  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i]
    const content = chat.textContent || ''
    if (!content) continue

    const no = parseInt(chat.getAttribute('no') || '0', 10)
    const vpos = parseInt(chat.getAttribute('vpos') || '0', 10)
    const date = parseInt(chat.getAttribute('date') || '0', 10)
    const mail = (chat.getAttribute('mail') || '').split(/\s+/).filter(Boolean)
    const rawUserId = chat.getAttribute('user_id') || ''
    // niconicomments の formatted 型は user_id: number。匿名IDは数値化できないので 0 に落とす
    const user_id = parseInt(rawUserId || '0', 10) || 0
    const premium = parseInt(chat.getAttribute('premium') || '0', 10) > 0

    entries.push({
      comment: {
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
      },
      userId: rawUserId,
    })
  }

  entries.sort((a, b) => a.comment.vpos - b.comment.vpos)
  return {
    comments: entries.map((e) => e.comment),
    userIds: entries.map((e) => e.userId),
  }
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
