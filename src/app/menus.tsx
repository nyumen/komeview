import { useLayoutEffect, useRef, useState } from 'react'
import { formatRate } from './format'
import {
  SPEED_PRESETS,
  FONT_SCALES,
  OPACITY_LEVELS,
  BIG_SEEK_PRESETS,
  BACKGROUND_OPTIONS,
} from './constants'

// ───────────────────────────────────────────────────────────
// 速度メニュー（SPEC §6）
// ───────────────────────────────────────────────────────────
interface SpeedMenuProps {
  x: number
  y: number
  current: number
  onPick: (rate: number) => void
  onDelta: (delta: number) => void
  onClose: () => void
}

export function SpeedMenu({ x, y, current, onPick, onDelta, onClose }: SpeedMenuProps) {
  return (
    <div className="menu-backdrop" onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        className="menu speed-menu"
        style={{ left: x, top: y, transform: 'translateY(-100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menu-header">現在 {current.toFixed(2)}倍</div>
        <div className="menu-item" onClick={() => { onDelta(0.1); onClose() }}>
          少し速く (+0.1倍)
        </div>
        <div className="menu-item" onClick={() => { onDelta(-0.1); onClose() }}>
          少し遅く (-0.1倍)
        </div>
        <div className="menu-sep" />
        {SPEED_PRESETS.map((r) => (
          <div
            key={r}
            className="menu-item"
            onClick={() => { onPick(r); onClose() }}
          >
            <span className="menu-check">{Math.abs(current - r) < 0.001 ? '✓' : ''}</span>
            {formatRate(r)}倍{r === 1.0 ? ' (標準速度)' : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// 右クリック コンテキストメニュー（SPEC §9）
// ───────────────────────────────────────────────────────────
interface ContextMenuProps {
  x: number
  y: number
  fontScale: number
  commentOpacity: number
  bigSeekSec: number
  background: string
  alwaysOnTop: boolean
  clickThrough: boolean
  pseudoFullscreen: boolean
  controlBarAlwaysVisible: boolean
  markerLabelsAlwaysVisible: boolean
  onOpenFile: () => void
  onToggleFullscreen: () => void
  onPickFontScale: (scale: number) => void
  onPickOpacity: (opacity: number) => void
  onPickBigSeek: (sec: number) => void
  onPickBackground: (key: string) => void
  onToggleControlBar: () => void
  onToggleMarkerLabels: () => void
  onToggleAlwaysOnTop: () => void
  onToggleClickThrough: () => void
  onShowAbout: () => void
  onCloseApp: () => void
  onClose: () => void
}

export function ContextMenu(props: ContextMenuProps) {
  const {
    x, y, fontScale, commentOpacity, bigSeekSec, background,
    alwaysOnTop, clickThrough, pseudoFullscreen, controlBarAlwaysVisible,
    markerLabelsAlwaysVisible,
    onOpenFile, onToggleFullscreen, onPickFontScale, onPickOpacity,
    onPickBigSeek, onPickBackground, onToggleControlBar, onToggleMarkerLabels,
    onToggleAlwaysOnTop, onToggleClickThrough, onShowAbout, onCloseApp, onClose,
  } = props

  const run = (fn: () => void) => () => { fn(); onClose() }

  // 実寸を測って画面内に収まる位置へ補正する（下端/右端の見切れ対策）
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y })
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const margin = 4
    let left = x
    let top = y
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin
    if (top + height > window.innerHeight - margin) top = window.innerHeight - height - margin
    setPos({ left: Math.max(margin, left), top: Math.max(margin, top) })
  }, [x, y])

  return (
    <div className="menu-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
      <div ref={menuRef} className="menu context-menu" style={{ left: pos.left, top: pos.top }} onClick={(e) => e.stopPropagation()}>
        <div className="menu-item" onClick={run(onOpenFile)}>XMLファイルを開く…</div>
        <div className="menu-sep" />
        <div className="menu-item" onClick={run(onToggleFullscreen)}>
          <span className="menu-check">{pseudoFullscreen ? '✓' : ''}</span>全画面
        </div>
        <div className="menu-sep" />

        {/* フォントサイズ ▸ */}
        <div className="menu-item has-sub">
          フォントサイズ<span className="sub-arrow">▸</span>
          <div className="submenu">
            {FONT_SCALES.map((s) => (
              <div key={s} className="menu-item" onClick={run(() => onPickFontScale(s))}>
                <span className="menu-check">{Math.abs(fontScale - s) < 0.001 ? '✓' : ''}</span>
                {Math.round(s * 100)}%
              </div>
            ))}
          </div>
        </div>

        {/* 不透明度 ▸ */}
        <div className="menu-item has-sub">
          不透明度<span className="sub-arrow">▸</span>
          <div className="submenu">
            {OPACITY_LEVELS.map((o) => (
              <div key={o} className="menu-item" onClick={run(() => onPickOpacity(o))}>
                <span className="menu-check">{Math.abs(commentOpacity - o) < 0.001 ? '✓' : ''}</span>
                {Math.round(o * 100)}%
              </div>
            ))}
          </div>
        </div>

        {/* 大きいシーク量 ▸ */}
        <div className="menu-item has-sub">
          大きいシーク量 (↑↓)<span className="sub-arrow">▸</span>
          <div className="submenu">
            {BIG_SEEK_PRESETS.map((s) => (
              <div key={s} className="menu-item" onClick={run(() => onPickBigSeek(s))}>
                <span className="menu-check">{bigSeekSec === s ? '✓' : ''}</span>
                {s}秒
              </div>
            ))}
          </div>
        </div>

        {/* 背景 ▸ */}
        <div className="menu-item has-sub">
          背景<span className="sub-arrow">▸</span>
          <div className="submenu">
            {BACKGROUND_OPTIONS.map((o) => (
              <div key={o.key} className="menu-item" onClick={run(() => onPickBackground(o.key))}>
                <span className="menu-check">{background === o.key ? '✓' : ''}</span>
                {o.label}
              </div>
            ))}
          </div>
        </div>

        <div className="menu-sep" />
        <div className="menu-item" onClick={run(onToggleControlBar)}>
          <span className="menu-check">{controlBarAlwaysVisible ? '✓' : ''}</span>操作パネルを常時表示
        </div>
        <div className="menu-item" onClick={run(onToggleMarkerLabels)}>
          <span className="menu-check">{markerLabelsAlwaysVisible ? '✓' : ''}</span>マーカーラベルを常時表示
        </div>
        <div className="menu-item" onClick={run(onToggleAlwaysOnTop)}>
          <span className="menu-check">{alwaysOnTop ? '✓' : ''}</span>最前面
        </div>
        <div className="menu-item" onClick={run(onToggleClickThrough)}>
          <span className="menu-check">{clickThrough ? '✓' : ''}</span>クリック透過
        </div>
        <div className="menu-sep" />
        <div className="menu-item" onClick={run(onShowAbout)}>バージョン情報</div>
        <div className="menu-item danger" onClick={run(onCloseApp)}>閉じる</div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────
// バージョン情報ダイアログ
// ───────────────────────────────────────────────────────────
interface AboutDialogProps {
  version: string
  onClose: () => void
}

export function AboutDialog({ version, onClose }: AboutDialogProps) {
  const ext = (url: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    window.api.openExternal(url)
  }
  return (
    <div className="menu-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
      <div className="about" onClick={(e) => e.stopPropagation()}>
        <div className="about-title">komeview</div>
        <div className="about-version">version {version || '—'}</div>
        <div className="about-desc">
          動画の上にニコニコ風コメントを重ねて表示するアプリ
        </div>
        <div className="about-links">
          <span>作者: kamm</span>
          <a href="#" onClick={ext('https://x.com/kammjp')}>X @kammjp</a>
          <a href="#" onClick={ext('https://github.com/nyumen/komeview')}>GitHub</a>
        </div>
        <button className="about-close" onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}
