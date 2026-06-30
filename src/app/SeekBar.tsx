import { useRef, useState } from 'react'
import { MARKERS, type MarkerKey } from '../shared/markers'
import { MARKER_COLORS, MARKER_LABELS } from './constants'
import type { DensityResult } from './density'
import { formatTime } from './format'

interface Props {
  duration: number
  currentTime: number
  markers: Record<MarkerKey, number | null>
  density: DensityResult | null
  onSeek: (time: number) => void
  onJumpMarker: (key: MarkerKey) => void
}

export function SeekBar({
  duration,
  currentTime,
  markers,
  density,
  onSeek,
  onJumpMarker,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const [hover, setHover] = useState<{ x: number; time: number } | null>(null)

  const ratio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

  const timeFromClientX = (clientX: number): number => {
    const el = trackRef.current
    if (!el || duration <= 0) return 0
    const rect = el.getBoundingClientRect()
    const r = (clientX - rect.left) / rect.width
    return Math.min(duration, Math.max(0, r * duration))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (duration <= 0) return
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeek(timeFromClientX(e.clientX))
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current
    if (el && duration > 0) {
      const rect = el.getBoundingClientRect()
      setHover({ x: e.clientX - rect.left, time: timeFromClientX(e.clientX) })
    }
    if (draggingRef.current) onSeek(timeFromClientX(e.clientX))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  // 勢い波形（SVG path）
  let wavePath = ''
  if (density && density.binMax > 0) {
    const n = density.bins.length
    const pts = density.bins.map((v, i) => {
      const x = (i / (n - 1)) * 100
      const y = 100 - (v / density.binMax) * 100
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    wavePath = `M0,100 L${pts.join(' L')} L100,100 Z`
  }

  return (
    <div className="seekbar">
      {/* 勢い波形 */}
      <svg
        className="seekbar-wave"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {wavePath && <path d={wavePath} fill="rgba(34, 211, 238, 0.45)" />}
      </svg>

      {/* クリック/ドラッグ用トラック */}
      <div
        ref={trackRef}
        className="seekbar-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
      >
        <div className="seekbar-played" style={{ width: `${ratio * 100}%` }} />
        <div className="seekbar-playhead" style={{ left: `${ratio * 100}%` }} />

        {/* マーカー点 */}
        {MARKERS.map(({ key }) => {
          const ms = markers[key]
          if (ms == null || duration <= 0) return null
          const left = Math.min(100, Math.max(0, (ms / 1000 / duration) * 100))
          return (
            <div
              key={key}
              className="seekbar-marker"
              style={{ left: `${left}%`, background: MARKER_COLORS[key] }}
              title={`${MARKER_LABELS[key]} へジャンプ`}
              onPointerDown={(e) => {
                e.stopPropagation()
                onJumpMarker(key)
              }}
            >
              <span className="seekbar-marker-label">{MARKER_LABELS[key]}</span>
            </div>
          )
        })}
      </div>

      {/* ホバー時刻ツールチップ（時刻のみ / SPEC §5） */}
      {hover && (
        <div className="seekbar-tooltip" style={{ left: `${hover.x}px` }}>
          <span>{formatTime(hover.time)}</span>
        </div>
      )}
    </div>
  )
}
