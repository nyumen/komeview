# CLAUDE.md — komeview（NCOverlay デスクトップ版）

このディレクトリ（`desktop/`）は、ブラウザ拡張 NCOverlay を土台にした **Electron デスクトップアプリ「komeview」**。
透明・常時最前面のウィンドウで、任意の動画の上にニコニコ風コメントを重ねて表示する（コメ専アプリ「commenomi」相当 ＋ 独自機能）。

## まず読むもの

- **要件定義: [SPEC.md](./SPEC.md)** — 「何を作るか」はすべてここ。仕様の変更は SPEC.md を更新してから実装する。

## 技術スタック

- Electron + React 19 + Vite
- コメント描画: `@xpadev-net/niconicomments`
- メインプロセス/プリロードのバンドル: esbuild

## 開発・ビルド

```sh
cd desktop

# 開発（Vite + Electron を同時起動）
npm run dev

# ビルド
npm run build          # renderer + main + preload

# 起動（ビルド済みを実行）
npm run start
```

## 構成

1枚の透明オーバーレイウィンドウに統合済み（SPEC §2）。

```
electron/main.ts        メインプロセス（単一ウィンドウ生成・設定永続化・IPC・擬似全画面）
electron/preload.ts     contextBridge で window.api を公開（型は NcoApi）
src/shared/markers.ts   マーカー定義 + findMarkers（ジャンプ先算出）
src/shared/settings.ts  設定の型 Settings とデフォルト値（main/renderer 共有）
src/app/
  main.tsx              レンダラーのエントリ
  App.tsx               全体のオーケストレーション（状態・仮想クロック・入力・IPC）
  Overlay.tsx           コメント描画 canvas（niconicomments / フォントscale）
  BottomBar.tsx         下部バー（操作 + 統計）
  SeekBar.tsx           シークバー（勢い波形 + ホバー時刻 + マーカー点）
  menus.tsx             速度メニュー / 右クリックメニュー（自前HTMLポップアップ）
  density.ts            コメントの勢い（スライディングウィンドウ / SPEC §8）
  xml.ts                ニコニコXML → FormattedComment
  format.ts / constants.ts  時刻整形 / 各種プリセット・マーカー色
```

レンダラーは Vite（root = `src/app`、単一エントリ `index.html`）でビルドする。

## 重要な設計上の制約

- 外部動画の再生位置は読めないため、コメント再生は**仮想クロック（手動同期）**で行う（SPEC §1）。
- 透明・フレームレス・常時最前面ウィンドウ。フルスクリーン排他動画の上に乗らない場合があるので window level 検証が必要（SPEC §2）。
- ショートカットは**ローカルのみ**（グローバルショートカットは使わない / SPEC §4）。
- 速度メニュー・右クリックメニューは**自前HTMLポップアップ**（OSネイティブメニューは使わない / SPEC §6, §9）。
- 全画面は OS の本物の全画面を使わず、**ディスプレイより上下左右1px小さい擬似全画面**にする（Netflix等が真っ黒になる回避 / SPEC §2.3）。

## 規約

- コメントデータは `@xpadev-net/niconicomments` の `formatted` 形式（`FormattedComment`）に合わせる。
- 設定は `app.getPath('userData')/settings.json` に自前で読み書き（SPEC §10）。
