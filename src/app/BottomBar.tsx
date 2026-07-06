import { useEffect, useRef } from 'react'
import type { MarkerOccurrence } from '../shared/markers'
import type { DensityResult } from './density'
import { SeekBar } from './SeekBar'
import { formatTime, formatRate } from './format'

interface Props {
  visible: boolean
  duration: number
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  markers: MarkerOccurrence[]
  density: DensityResult | null
  markerLabelsAlwaysVisible: boolean
  /** 次のジャンプ先（無ければ null）SPEC §3.1 */
  nextMarker: { label: string; remainingSec: number } | null
  onPlayPause: () => void
  onStop: () => void
  onSeekBack: () => void
  onSeekForward: () => void
  /** ≪≫ から指を離した時（スクラブ終了 → 再生再開） */
  onSeekEnd: () => void
  onJumpNext: () => void
  onSeek: (time: number) => void
  onSpeedClick: (x: number, y: number) => void
}

export function BottomBar({
  visible,
  duration,
  currentTime,
  isPlaying,
  playbackRate,
  markers,
  density,
  markerLabelsAlwaysVisible,
  nextMarker,
  onPlayPause,
  onStop,
  onSeekBack,
  onSeekForward,
  onSeekEnd,
  onJumpNext,
  onSeek,
  onSpeedClick,
}: Props) {
  // ≪ ≫ の押しっぱなしリピート（キーのオートリピート相当 / SPEC §3）
  const repeatRef = useRef<{
    timeout?: ReturnType<typeof setTimeout>
    interval?: ReturnType<typeof setInterval>
  }>({})

  const stopHold = () => {
    if (repeatRef.current.timeout) clearTimeout(repeatRef.current.timeout)
    if (repeatRef.current.interval) clearInterval(repeatRef.current.interval)
    repeatRef.current = {}
  }

  const startHold = (action: () => void) => {
    stopHold()
    action() // 押した瞬間に1回
    repeatRef.current.timeout = setTimeout(() => {
      repeatRef.current.interval = setInterval(action, 60)
    }, 350)
  }

  // アンマウント時にタイマーを片付ける
  useEffect(() => stopHold, [])

  const endHold = () => {
    stopHold()
    onSeekEnd() // スクラブ終了 → 再生を再開
  }

  const holdProps = (action: () => void) => ({
    onPointerDown: () => startHold(action),
    onPointerUp: endHold,
    onPointerLeave: endHold,
  })

  return (
    <div className={`bottom-bar ${visible ? 'visible' : ''}`}>
      <SeekBar
        duration={duration}
        currentTime={currentTime}
        markers={markers}
        density={density}
        markerLabelsAlwaysVisible={markerLabelsAlwaysVisible}
        onSeek={onSeek}
      />

      <div className="controls">
        <div className="controls-left">
          <button className="ctrl-btn ctrl-btn-lg" onClick={onPlayPause} title="再生 / 一時停止 (Space)">
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="ctrl-btn ctrl-btn-lg" onClick={onStop} title="停止">
            ◼
          </button>
          <button className="ctrl-btn ctrl-btn-lg" {...holdProps(onSeekBack)} title="1秒戻る (←) ・長押しで連続">
            ≪
          </button>
          <button className="ctrl-btn ctrl-btn-lg" {...holdProps(onSeekForward)} title="1秒進む (→) ・長押しで連続">
            ≫
          </button>
          <button
            className="ctrl-btn speed-indicator"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              onSpeedClick(r.left, r.top)
            }}
            title="クリックで速度変更"
          >
            {formatRate(playbackRate)}x
          </button>
          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* 次のジャンプ先（SPEC §3.1） */}
          <button
            className="ctrl-btn jump-btn"
            onClick={onJumpNext}
            disabled={!nextMarker}
            title="次のジャンプ先へ (j)"
          >
            ジャンプ
          </button>
          {nextMarker && (
            <span className="next-marker">
              「{nextMarker.label}」まで残り {formatTime(nextMarker.remainingSec)}
            </span>
          )}
        </div>

        {/* コメント統計（2行表示・3桁カンマ区切り） */}
        {density && (
          <div className="stats">
            <span>total {density.total.toLocaleString('ja-JP')} コメ</span>
            <span>
              max {Math.round(density.maxPerMin).toLocaleString('ja-JP')} avg{' '}
              {Math.round(density.avgPerMin).toLocaleString('ja-JP')} コメ/分
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
