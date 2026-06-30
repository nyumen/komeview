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
