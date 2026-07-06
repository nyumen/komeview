import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import NiconiComments from '@xpadev-net/niconicomments'
import type { FormattedComment } from './xml'
import { LAZY_THRESHOLD } from './constants'

export interface OverlayHandle {
  draw(vpos: number): void
}

interface Props {
  comments: FormattedComment[]
  fontScale: number
  /** コメント層全体の不透明度（CSS opacity / SPEC §7） */
  opacity: number
}

// コメント描画キャンバス（透明・1920x1080固定 / SPEC §2）。
// フォントサイズ変更は scale オプション付きでインスタンスを作り直す（SPEC §7）。
export const Overlay = forwardRef<OverlayHandle, Props>(
  ({ comments, fontScale, opacity }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const ncRef = useRef<NiconiComments | null>(null)
    const lastVposRef = useRef(0)
    // 直近に実際へ描画した整数 vpos。同じ値なら再描画をスキップ（一時停止中のCPU節約）
    const lastDrawnRef = useRef(-1)

    useImperativeHandle(
      ref,
      () => ({
        draw(vpos: number) {
          lastVposRef.current = vpos
          const v = Math.floor(vpos)
          if (v === lastDrawnRef.current) return
          lastDrawnRef.current = v
          ncRef.current?.drawCanvas(v)
        },
      }),
      []
    )

    // 再構築（初期化）は同期処理でUIが固まるため、先に「再構築中…」を描画してから実行する。
    // ただし初回のファイル読み込み時は出さない（設定切替による再構築時のみ表示 / ユーザー要望）
    const [rebuilding, setRebuilding] = useState(false)
    const hadInstanceRef = useRef(false)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = 1920
      canvas.height = 1080

      if (comments.length === 0) {
        if (ncRef.current) {
          ncRef.current.clear()
          ncRef.current.destroy()
          ncRef.current = null
        }
        hadInstanceRef.current = false
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
        return
      }

      // 既にコメントを表示していた状態からの再構築のときだけ「再構築中…」を出す
      const isRebuild = hadInstanceRef.current
      hadInstanceRef.current = true
      if (isRebuild) setRebuilding(true)
      const id = setTimeout(() => {
        if (ncRef.current) {
          ncRef.current.clear()
          ncRef.current.destroy()
          ncRef.current = null
        }
        ncRef.current = new NiconiComments(canvas, comments, {
          format: 'formatted',
          mode: 'html5',
          scale: fontScale,
          // 大量コメント時のみ lazy を有効化（SPEC §7）。
          // lazy は読み込み時のフリーズを防ぐ代わりにシーク直後の位置解決が重くなるため、
          // 通常サイズのファイルでは eager（事前計算）のままにする。
          lazy: comments.length > LAZY_THRESHOLD,
        } as ConstructorParameters<typeof NiconiComments>[2])
        lastDrawnRef.current = Math.floor(lastVposRef.current)
        ncRef.current.drawCanvas(lastDrawnRef.current)
        setRebuilding(false)
      }, 30)

      return () => clearTimeout(id)
    }, [comments, fontScale])

    return (
      <>
        <canvas ref={canvasRef} className="overlay-canvas" style={{ opacity }} />
        {rebuilding && <div className="rebuilding-hint">コメントを再構築中…</div>}
      </>
    )
  }
)

Overlay.displayName = 'Overlay'
