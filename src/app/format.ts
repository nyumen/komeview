/** 速度倍率を表示用に整形（2 → "2"、1.5 → "1.5"、1.25 → "1.25"） */
export function formatRate(rate: number): string {
  return parseFloat(rate.toFixed(2)).toString()
}

export function formatTime(seconds: number): string {
  const s0 = Math.max(0, seconds)
  const h = Math.floor(s0 / 3600)
  const m = Math.floor((s0 % 3600) / 60)
  const s = Math.floor(s0 % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
