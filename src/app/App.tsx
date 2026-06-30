import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MARKERS,
  findMarkers,
  emptyMarkers,
  type MarkerKey,
} from '../shared/markers'
import { Overlay, type OverlayHandle } from './Overlay'
import { BottomBar } from './BottomBar'
import { SpeedMenu, ContextMenu } from './menus'
import { parseNicoXML, type FormattedComment } from './xml'
import { computeDensity, type DensityResult } from './density'
import { MARKER_LABELS, backgroundCss } from './constants'

/** ←→ の微調整シーク量（秒・固定 / SPEC §4） */
const FINE_SEEK_SEC = 1

const clampRate = (r: number) => Math.min(4, Math.max(0.1, Math.round(r * 100) / 100))

export function App() {
  // ─── コンテンツ ───
  const [comments, setComments] = useState<FormattedComment[]>([])
  const [fileName, setFileName] = useState('')
  const [duration, setDuration] = useState(0)
  const [markers, setMarkers] = useState<Record<MarkerKey, number | null>>(emptyMarkers())
  const [density, setDensity] = useState<DensityResult | null>(null)

  // ─── 再生状態 ───
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)

  // ─── 設定（SPEC §10） ───
  const [fontScale, setFontScale] = useState(1.0)
  const [commentOpacity, setCommentOpacity] = useState(1.0)
  const [bigSeekSec, setBigSeekSec] = useState(15)
  const [background, setBackground] = useState('transparent')
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [clickThrough, setClickThrough] = useState(false)
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false)
  const [controlBarAlwaysVisible, setControlBarAlwaysVisible] = useState(false)

  // ─── UI ───
  const [barVisible, setBarVisible] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [speedMenu, setSpeedMenu] = useState<{ x: number; y: number } | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

  const overlayRef = useRef<OverlayHandle>(null)

  // 仮想クロック（SPEC §1）
  const clock = useRef({ baseTime: 0, baseTs: 0, playing: false, rate: 1 })

  // キーボード等から参照する最新状態
  const stateRef = useRef({
    duration: 0,
    markers: emptyMarkers() as Record<MarkerKey, number | null>,
    bigSeekSec: 5,
    pseudoFullscreen: false,
    hasComments: false,
  })
  stateRef.current = {
    duration,
    markers,
    bigSeekSec,
    pseudoFullscreen,
    hasComments: comments.length > 0,
  }

  const menuOpenRef = useRef(false)
  menuOpenRef.current = speedMenu !== null || ctxMenu !== null
  const lastIgnoreRef = useRef<boolean | null>(null)

  // ───────────────────────────────────────────────────────
  // 再生コントロール
  // ───────────────────────────────────────────────────────
  const getTime = useCallback(() => {
    const c = clock.current
    return c.playing
      ? c.baseTime + ((performance.now() - c.baseTs) / 1000) * c.rate
      : c.baseTime
  }, [])

  const seekTo = useCallback((t: number) => {
    const ct = Math.min(stateRef.current.duration, Math.max(0, t))
    clock.current.baseTime = ct
    clock.current.baseTs = performance.now()
    setCurrentTime(ct)
  }, [])

  const play = useCallback(() => {
    if (!stateRef.current.hasComments) return
    clock.current.baseTime = getTime()
    clock.current.baseTs = performance.now()
    clock.current.playing = true
    setIsPlaying(true)
  }, [getTime])

  const pause = useCallback(() => {
    clock.current.baseTime = getTime()
    clock.current.playing = false
    setIsPlaying(false)
  }, [getTime])

  const togglePlay = useCallback(() => {
    if (clock.current.playing) pause()
    else play()
  }, [play, pause])

  const stop = useCallback(() => {
    pause()
    seekTo(0)
  }, [pause, seekTo])

  const applyRate = useCallback(
    (r: number) => {
      const rate = clampRate(r)
      clock.current.baseTime = getTime()
      clock.current.baseTs = performance.now()
      clock.current.rate = rate
      setPlaybackRate(rate)
      window.api.saveSettings({ playbackRate: rate })
    },
    [getTime]
  )

  const jumpMarker = useCallback(
    (key: MarkerKey) => {
      const ms = stateRef.current.markers[key]
      if (ms != null) seekTo(ms / 1000)
    },
    [seekTo]
  )

  // ≪ ≫ ボタンは ←→ キーと同じ ±1秒シーク（SPEC §3, §4）
  const seekBack = useCallback(
    () => seekTo(getTime() - FINE_SEEK_SEC),
    [getTime, seekTo]
  )
  const seekForward = useCallback(
    () => seekTo(getTime() + FINE_SEEK_SEC),
    [getTime, seekTo]
  )

  // 次のマーカー（現在位置より後の最初のマーカー）へジャンプ（SPEC §3.1 / "j" キー・ジャンプボタン共通）
  const jumpToNextMarker = useCallback(() => {
    const t = getTime()
    let best = Infinity
    for (const m of MARKERS) {
      const ms = stateRef.current.markers[m.key]
      if (ms == null) continue
      const sec = ms / 1000
      if (sec > t + 0.05 && sec < best) best = sec
    }
    if (best !== Infinity) seekTo(best)
  }, [getTime, seekTo])

  // ───────────────────────────────────────────────────────
  // 擬似全画面（SPEC §2.2）
  // ───────────────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    window.api.setPseudoFullscreen(true)
    setPseudoFullscreen(true)
    window.api.saveSettings({ pseudoFullscreen: true })
  }, [])

  const exitFullscreen = useCallback(() => {
    window.api.setPseudoFullscreen(false)
    setPseudoFullscreen(false)
    window.api.saveSettings({ pseudoFullscreen: false })
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (stateRef.current.pseudoFullscreen) exitFullscreen()
    else enterFullscreen()
  }, [enterFullscreen, exitFullscreen])

  // ───────────────────────────────────────────────────────
  // その他設定
  // ───────────────────────────────────────────────────────
  const applyFontScale = (s: number) => {
    setFontScale(s)
    window.api.saveSettings({ fontScale: s })
  }
  const applyCommentOpacity = (o: number) => {
    setCommentOpacity(o)
    window.api.saveSettings({ commentOpacity: o })
  }
  const applyBigSeek = (s: number) => {
    setBigSeekSec(s)
    window.api.saveSettings({ bigSeekSec: s })
  }
  const applyBackground = (key: string) => {
    setBackground(key)
    window.api.saveSettings({ background: key })
  }
  const toggleControlBar = () => {
    const v = !controlBarAlwaysVisible
    setControlBarAlwaysVisible(v)
    window.api.saveSettings({ controlBarAlwaysVisible: v })
  }
  const toggleAlwaysOnTop = () => {
    const v = !alwaysOnTop
    setAlwaysOnTop(v)
    window.api.setAlwaysOnTop(v)
    window.api.saveSettings({ alwaysOnTop: v })
  }
  const toggleClickThrough = () => {
    const v = !clickThrough
    setClickThrough(v)
    window.api.saveSettings({ clickThrough: v })
  }

  // ───────────────────────────────────────────────────────
  // ファイル読み込み
  // ───────────────────────────────────────────────────────
  const loadXmlText = useCallback((name: string, text: string) => {
    const parsed = parseNicoXML(text)
    if (parsed.length === 0) {
      window.alert('コメントが見つかりませんでした。正しいニコニコXMLか確認してください。')
      return
    }
    const lastVpos = parsed[parsed.length - 1].vpos
    const dur = Math.ceil(lastVpos / 100) + 10
    setComments(parsed)
    setFileName(name)
    setDuration(dur)
    setMarkers(findMarkers(parsed))
    setDensity(computeDensity(parsed.map((c) => c.vpos / 100), dur))
    clock.current.playing = false
    clock.current.baseTime = 0
    clock.current.baseTs = performance.now()
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const openFile = useCallback(async () => {
    const res = await window.api.openFile()
    if (res) loadXmlText(res.name, res.content)
  }, [loadXmlText])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.toLowerCase().endsWith('.xml')) {
      f.text().then((t) => loadXmlText(f.name, t))
    }
  }

  // ───────────────────────────────────────────────────────
  // 効果（描画ループ・UIティック・入力）
  // ───────────────────────────────────────────────────────
  // 描画ループ（rAF）
  useEffect(() => {
    let raf = 0
    const loop = () => {
      overlayRef.current?.draw(getTime() * 100)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [getTime])

  // シークバー更新ティック
  useEffect(() => {
    const id = setInterval(() => {
      const t = getTime()
      setCurrentTime(t)
      if (clock.current.playing && t >= stateRef.current.duration) {
        pause()
        seekTo(stateRef.current.duration)
      }
    }, 50)
    return () => clearInterval(id)
  }, [getTime, pause, seekTo])

  // キーボード（ローカルのみ / SPEC §4）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          return
        case 'ArrowRight':
          e.preventDefault()
          seekTo(getTime() + FINE_SEEK_SEC)
          return
        case 'ArrowLeft':
          e.preventDefault()
          seekTo(getTime() - FINE_SEEK_SEC)
          return
        case 'ArrowUp':
          e.preventDefault()
          seekTo(getTime() + stateRef.current.bigSeekSec)
          return
        case 'ArrowDown':
          e.preventDefault()
          seekTo(getTime() - stateRef.current.bigSeekSec)
          return
        case 'Escape':
          if (stateRef.current.pseudoFullscreen) exitFullscreen()
          return
      }
      const k = e.key.toLowerCase()
      if (k === 'j') {
        jumpToNextMarker()
        return
      }
      const m = MARKERS.find((mm) => mm.shortcutKey.toLowerCase() === k)
      if (m) jumpMarker(m.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, seekTo, getTime, jumpMarker, jumpToNextMarker, exitFullscreen])

  // マウス移動：下部バーの自動表示 ＋ クリック透過の動的切替（SPEC §3, §9）
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nearBottom = e.clientY >= window.innerHeight - 90
      const nearTop = !pseudoFullscreen && e.clientY <= 40
      setBarVisible(controlBarAlwaysVisible || nearBottom || menuOpenRef.current)
      if (clickThrough) {
        const interactive = nearBottom || nearTop || menuOpenRef.current
        const ignore = !interactive
        if (lastIgnoreRef.current !== ignore) {
          window.api.setIgnoreMouse(ignore)
          lastIgnoreRef.current = ignore
        }
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [clickThrough, pseudoFullscreen, controlBarAlwaysVisible])

  // 操作パネル常時表示の切替時に即反映
  useEffect(() => {
    if (controlBarAlwaysVisible) setBarVisible(true)
  }, [controlBarAlwaysVisible])

  // クリック透過のON/OFF切替時に初期状態を適用
  useEffect(() => {
    window.api.setIgnoreMouse(clickThrough)
    lastIgnoreRef.current = clickThrough
  }, [clickThrough])

  // アイコンへのドロップ / 関連付け起動で開かれた XML を読み込む（SPEC §11）
  useEffect(() => {
    const unsub = window.api.onOpenFile((file) => loadXmlText(file.name, file.content))
    return unsub
  }, [loadXmlText])

  // 起動時に設定を読み込み
  useEffect(() => {
    window.api.getSettings().then((s) => {
      clock.current.rate = s.playbackRate
      setPlaybackRate(s.playbackRate)
      setFontScale(s.fontScale)
      setCommentOpacity(s.commentOpacity)
      setBigSeekSec(s.bigSeekSec)
      setBackground(s.background)
      setAlwaysOnTop(s.alwaysOnTop)
      setClickThrough(s.clickThrough)
      setPseudoFullscreen(s.pseudoFullscreen)
      setControlBarAlwaysVisible(s.controlBarAlwaysVisible)
    })
  }, [])

  // ───────────────────────────────────────────────────────
  // マウスメニュー / ダブルクリック
  // ───────────────────────────────────────────────────────
  const isInChrome = (target: EventTarget | null) =>
    !!(target as HTMLElement | null)?.closest('.titlebar, .bottom-bar, .menu-backdrop')

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setSpeedMenu(null)
    // 位置補正はメニュー側が実寸を測って行う（SPEC: 下端見切れ対策）
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    if (isInChrome(e.target)) return
    toggleFullscreen()
  }

  // 次のジャンプ先（現在位置より後の最初のマーカー / SPEC §3.1）
  let nextMarkerKey: MarkerKey | null = null
  let nextMarkerTime = Infinity
  for (const m of MARKERS) {
    const ms = markers[m.key]
    if (ms == null) continue
    const t = ms / 1000
    if (t > currentTime + 0.05 && t < nextMarkerTime) {
      nextMarkerTime = t
      nextMarkerKey = m.key
    }
  }
  const nextMarker = nextMarkerKey
    ? { label: MARKER_LABELS[nextMarkerKey], remainingSec: nextMarkerTime - currentTime }
    : null

  // ───────────────────────────────────────────────────────
  return (
    <div
      className={`app ${pseudoFullscreen ? 'fullscreen' : ''}`}
      style={{ background: backgroundCss(background) }}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {!pseudoFullscreen && (
        <div className="titlebar">
          <span className="title">{fileName || 'komeview'}</span>
          <div className="window-controls">
            <button className="win-btn" onClick={() => window.api.minimize()} title="最小化">
              —
            </button>
            <button className="win-btn close" onClick={() => window.api.close()} title="閉じる">
              ×
            </button>
          </div>
        </div>
      )}

      <Overlay
        ref={overlayRef}
        comments={comments}
        fontScale={fontScale}
        opacity={commentOpacity}
      />

      {comments.length === 0 && (
        <div className={`empty-hint ${dragging ? 'dragging' : ''}`}>
          <p>ニコニコ動画コメントXMLを<br />ドラッグ &amp; ドロップ</p>
          <button onClick={openFile}>ファイルを選択</button>
        </div>
      )}

      <BottomBar
        visible={barVisible}
        duration={duration}
        currentTime={currentTime}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        markers={markers}
        density={density}
        nextMarker={nextMarker}
        onPlayPause={togglePlay}
        onStop={stop}
        onSeekBack={seekBack}
        onSeekForward={seekForward}
        onJumpNext={jumpToNextMarker}
        onSeek={seekTo}
        onJumpMarker={jumpMarker}
        onSpeedClick={(x, y) => setSpeedMenu({ x, y })}
      />

      {speedMenu && (
        <SpeedMenu
          x={speedMenu.x}
          y={speedMenu.y}
          current={playbackRate}
          onPick={applyRate}
          onDelta={(d) => applyRate(playbackRate + d)}
          onClose={() => setSpeedMenu(null)}
        />
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          fontScale={fontScale}
          commentOpacity={commentOpacity}
          bigSeekSec={bigSeekSec}
          background={background}
          alwaysOnTop={alwaysOnTop}
          clickThrough={clickThrough}
          pseudoFullscreen={pseudoFullscreen}
          controlBarAlwaysVisible={controlBarAlwaysVisible}
          onOpenFile={openFile}
          onToggleFullscreen={toggleFullscreen}
          onPickFontScale={applyFontScale}
          onPickOpacity={applyCommentOpacity}
          onPickBigSeek={applyBigSeek}
          onPickBackground={applyBackground}
          onToggleControlBar={toggleControlBar}
          onToggleAlwaysOnTop={toggleAlwaysOnTop}
          onToggleClickThrough={toggleClickThrough}
          onCloseApp={() => window.api.close()}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}
