import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import NiconiComments from '@xpadev-net/niconicomments'
import type { FormattedComment } from './xml'

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

    useImperativeHandle(
      ref,
      () => ({
        draw(vpos: number) {
          lastVposRef.current = vpos
          ncRef.current?.drawCanvas(Math.floor(vpos))
        },
      }),
      []
    )

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = 1920
      canvas.height = 1080

      if (ncRef.current) {
        ncRef.current.clear()
        ncRef.current.destroy()
        ncRef.current = null
      }

      if (comments.length > 0) {
        ncRef.current = new NiconiComments(canvas, comments, {
          format: 'formatted',
          mode: 'html5',
          scale: fontScale,
        } as ConstructorParameters<typeof NiconiComments>[2])
        ncRef.current.drawCanvas(Math.floor(lastVposRef.current))
      } else {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
    }, [comments, fontScale])

    return <canvas ref={canvasRef} className="overlay-canvas" style={{ opacity }} />
  }
)

Overlay.displayName = 'Overlay'
