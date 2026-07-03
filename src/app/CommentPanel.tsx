import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import type { FormattedComment } from './xml'
import { formatTime } from './format'

interface Props {
  /** 全コメント（NG含む・vpos昇順）。NG行は色分け表示され、右クリックで解除できる */
  comments: FormattedComment[]
  /** comments と同順の生 user_id（空文字は ID なし） */
  userIds: string[]
  ngUserIds: string[]
  ngWords: string[]
  currentTime: number
  onSeek: (time: number) => void
  onToggleNgUser: (userId: string) => void
  onToggleNgWord: (word: string) => void
  onClose: () => void
}

/** currentTime（秒）以下で最大の vpos を持つコメントのインデックス（二分探索） */
function indexForTime(comments: FormattedComment[], timeSec: number): number {
  const target = timeSec * 100
  let lo = 0
  let hi = comments.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (comments[mid].vpos <= target) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}

interface RowMenuState {
  x: number
  y: number
  index: number
}

// コメントリストパネル（SPEC §13将来構想の実装）。
// 再生位置に追従してスクロールし、行クリックでシーク、行の右クリックでコピー/NG設定メニューを開く。
// NG行もリストには表示したまま色分けし、同じメニューから解除できる（描画からのみ除外）。
export function CommentPanel({
  comments,
  userIds,
  ngUserIds,
  ngWords,
  currentTime,
  onSeek,
  onToggleNgUser,
  onToggleNgWord,
  onClose,
}: Props) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  // パネルにマウスが乗っている間は自動追従を止める（ユーザーのスクロールを邪魔しない）
  const [hovering, setHovering] = useState(false)
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null)
  const lastIndexRef = useRef(-1)

  const ngUserSet = useMemo(() => new Set(ngUserIds), [ngUserIds])
  const ngWordSet = useMemo(() => new Set(ngWords), [ngWords])
  const ngCount = useMemo(() => {
    if (ngUserSet.size === 0 && ngWordSet.size === 0) return 0
    let n = 0
    for (let i = 0; i < comments.length; i++) {
      if (ngUserSet.has(userIds[i]) || ngWordSet.has(comments[i].content)) n++
    }
    return n
  }, [comments, userIds, ngUserSet, ngWordSet])

  // 再生位置・シーク位置にリストを同期
  useEffect(() => {
    if (hovering || rowMenu || comments.length === 0) return
    const idx = indexForTime(comments, currentTime)
    if (idx === lastIndexRef.current) return
    lastIndexRef.current = idx
    virtuosoRef.current?.scrollToIndex({ index: idx, align: 'end' })
  }, [currentTime, hovering, rowMenu, comments])

  // 行メニューの画面内クランプ
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 })
  useLayoutEffect(() => {
    if (!rowMenu) return
    const el = menuRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const margin = 4
    let left = rowMenu.x
    let top = rowMenu.y
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin
    if (top + height > window.innerHeight - margin) top = window.innerHeight - height - margin
    setMenuPos({ left: Math.max(margin, left), top: Math.max(margin, top) })
  }, [rowMenu])

  const menuComment = rowMenu ? comments[rowMenu.index] : null
  const menuUserId = rowMenu ? userIds[rowMenu.index] : ''
  const menuWordNg = menuComment ? ngWordSet.has(menuComment.content) : false
  const menuUserNg = menuUserId ? ngUserSet.has(menuUserId) : false

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div
      className="comment-panel"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        // パネル内はアプリ全体の右クリックメニューを出さない
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="comment-panel-header">
        <span>コメントリスト</span>
        <span className="comment-panel-count">
          {comments.length}件{ngCount > 0 ? `（NG ${ngCount}）` : ''}
        </span>
        <button className="win-btn" onClick={onClose} title="閉じる">
          ×
        </button>
      </div>

      <Virtuoso
        ref={virtuosoRef}
        className="comment-panel-list"
        totalCount={comments.length}
        itemContent={(index) => {
          const c = comments[index]
          const uid = userIds[index]
          const active = c.vpos <= currentTime * 100
          const ngByUser = ngUserSet.has(uid)
          const ngByWord = ngWordSet.has(c.content)
          const ngClass = ngByUser ? 'ng-user' : ngByWord ? 'ng-word' : ''
          return (
            <div
              className={`comment-row ${active ? 'past' : ''} ${ngClass}`}
              onClick={() => onSeek(c.vpos / 100)}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setRowMenu({ x: e.clientX, y: e.clientY, index })
              }}
              title="クリックでこの位置へシーク / 右クリックでメニュー"
            >
              <span className="comment-row-body">{c.content}</span>
              <span className="comment-row-time">{formatTime(c.vpos / 100)}</span>
            </div>
          )
        }}
      />

      {/* 行の右クリックメニュー（コピー / NG設定） */}
      {rowMenu && menuComment && (
        <div
          className="menu-backdrop"
          onClick={() => setRowMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setRowMenu(null)
          }}
        >
          <div
            ref={menuRef}
            className="menu row-menu"
            style={{ left: menuPos.left, top: menuPos.top }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="menu-header row-menu-title">{menuComment.content}</div>
            <div className="menu-sep" />
            <div className="menu-item row-menu-item" onClick={() => { copy(menuComment.content); setRowMenu(null) }}>
              コメントをコピー
              <span className="row-menu-sub">{menuComment.content}</span>
            </div>
            {menuUserId && (
              <div className="menu-item row-menu-item" onClick={() => { copy(menuUserId); setRowMenu(null) }}>
                ユーザーIDをコピー
                <span className="row-menu-sub">{menuUserId}</span>
              </div>
            )}
            <div className="menu-sep" />
            <div className="menu-label">NG設定</div>
            <div className="menu-item" onClick={() => { onToggleNgWord(menuComment.content); setRowMenu(null) }}>
              {menuWordNg ? '－ コメントのNGを解除' : '＋ コメントを追加'}
            </div>
            {menuUserId && (
              <div className="menu-item" onClick={() => { onToggleNgUser(menuUserId); setRowMenu(null) }}>
                {menuUserNg ? '－ ユーザーIDのNGを解除' : '＋ ユーザーIDを追加'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
