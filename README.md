# komeview

動画の再生画面に**ニコニコ風のコメント**を重ねて表示するデスクトップアプリです。
ブラウザ拡張「[NCOverlay](https://github.com/Midra429/NCOverlay)」を土台に、コメ専アプリ「commenomi」のような操作感で作り直したものです。

ニコニコ動画のコメント XML を読み込み、**透明・常時最前面のウィンドウ**としてあらゆる動画（VODアプリ・ローカル動画・フルスクリーン再生など）の上にコメントを流せます。

> ⚠️ 外部プレイヤーの再生位置は取得できないため、コメントは**手動同期（仮想再生）**で流します。動画の頭出しに合わせて再生/シークして調整してください。

---

## 動作環境

- Windows 10/11（x64）
- macOS（Apple Silicon / arm64）

---

## インストール（ビルド済みを使う）

[Releases](../../releases) から各OS向けのファイルをダウンロードしてください。

### Windows
- `komeview x.y.z.exe`（ポータブル版）をダウンロードしてダブルクリックで起動。インストール不要です。
- SmartScreen の警告が出たら「詳細情報」→「実行」。

### macOS
- `komeview-x.y.z-arm64.dmg` を開き、`komeview.app` を「アプリケーション」へドラッグ。
- 署名していないため、初回は **アプリを右クリック →「開く」** で許可してください（Gatekeeper 対策）。

---

## 使い方

### コメントXMLの読み込み
次のいずれかで、ニコニコ動画のコメント XML を読み込めます。

- ウィンドウに XML ファイルを**ドラッグ＆ドロップ**
- 右クリックメニュー →「XMLファイルを開く…」
- **アプリアイコンに XML をドロップ**して起動
  - Windows: `komeview.exe` に XML をドラッグ
  - macOS: `komeview.app` / Dock アイコンに XML をドロップ

### 動画への重ね方
1. 動画を再生するアプリ／プレイヤーの上に komeview のウィンドウを重ねる。
2. コメント XML を読み込む。
3. 動画の頭出しに合わせて komeview を再生（`Space`）し、ズレはシークで微調整する。

---

## 操作方法

### キーボード（komeview がアクティブなときのみ有効）

| キー | 動作 |
|---|---|
| `Space` | 再生 / 一時停止 |
| `←` / `→` | 1秒 戻る / 進む（長押しで連続） |
| `↑` / `↓` | 先送り / 巻き戻し（既定15秒・右クリックで変更可） |
| `k` | マーカー「ｷﾀ」へジャンプ |
| `o` | マーカー「OP」へジャンプ |
| `a` / `b` / `c` | マーカー「A」/「B」/「C」へジャンプ |
| `e` | マーカー「ED」へジャンプ |
| `j` | 次のマーカーへジャンプ |
| `Esc` | 擬似全画面を解除 |

### 操作パネル（マウスを画面下端に近づけると表示）

- 再生 / 一時停止・停止
- `≪` `≫`：1秒シーク（**長押しで連続**）
- 速度表示（クリックで速度メニュー：`0.75 / 1.0 / 1.25 / 1.5 / 1.75 / 2.0` 倍）
- シークバー
  - マウスオーバーでその位置の**時刻**を表示
  - マーカー（ｷﾀ/OP/A/B/C/ED）を**点**で表示。点クリックでジャンプ、ホバーでラベル表示
  - コメントの**勢い（コメ/分）の波形**を重畳表示
- 「ジャンプ」ボタン：次のマーカーまでの残り時間を表示し、押すとそこへジャンプ
- コメント統計：`total / max / avg`

### 右クリックメニュー

- XMLファイルを開く
- 全画面（擬似全画面）の ON/OFF
- フォントサイズ（100%〜50%）
- 不透明度（100%〜50%）
- 大きいシーク量（↑↓ / 3・5・10・15・30秒）
- 背景（透明 / グレー25・50・75% / 黒）
- 操作パネルを常時表示
- 最前面（常時前面）の ON/OFF
- クリック透過の ON/OFF（ON中は背後の動画を操作できる。パネル上では操作可）
- 閉じる

### 擬似全画面
- コメント領域を**ダブルクリック**、または右クリック →「全画面」で全画面化。`Esc` または再度の操作で解除。
- OSの本物の全画面は使わず、画面より上下左右1px小さいウィンドウにすることで、Netflix 等の動画が黒画面になる問題を回避しています。

設定（速度・フォントサイズ・不透明度・背景・ウィンドウ位置/サイズ など）は**次回起動時に復元**されます。

---

## 自分でビルドする

ビルド済みのファイルを使いたくない場合は、自分でビルドできます。

### 必要なもの
- [Node.js](https://nodejs.org/)（18以上を推奨）と npm
- Git

### 手順

```sh
# 取得
git clone https://github.com/nyumen/komeview.git
cd komeview

# 依存関係をインストール
npm install
```

#### 開発モードで起動
```sh
npm run dev
```

#### 配布物をビルド
出力は `release/` に生成されます。

```sh
# macOS（.dmg / 実行マシンのアーキテクチャ）
npm run dist:mac

# Windows（x64・ポータブル .exe）
npm run dist:win

# 両方
npm run dist
```

| スクリプト | 内容 |
|---|---|
| `npm run dev` | Vite + Electron を起動（ホットリロード） |
| `npm run build` | レンダラー / メイン / プリロードをビルド（`dist/`） |
| `npm run dist:mac` | macOS 向け `.dmg` を作成 |
| `npm run dist:win` | Windows 向けポータブル `.exe`（x64）を作成 |
| `npm run dist` | macOS + Windows の両方を作成 |

#### 補足
- **Windows のポータブル .exe は macOS 上からでもビルドできます**（Wine 不要）。
- macOS 向けの `.dmg`（特に署名・公証）は基本的に macOS 上でのビルドが必要です。
- 署名は行っていません（`mac.identity: null`）。
- macOS は既定で実行マシンのアーキテクチャ（Apple Silicon なら arm64）でビルドされます。Intel 向けや universal が必要な場合は `electron-builder` の `--x64` / `--universal` 等で調整してください。

---

## 技術スタック / 構成

- [Electron](https://www.electronjs.org/) + [React](https://react.dev/) + [Vite](https://vite.dev/)
- コメント描画: [@xpadev-net/niconicomments](https://github.com/xpadev-net/niconicomments)
- パッケージング: [electron-builder](https://www.electron.build/)

主要なディレクトリ:

```
electron/   メインプロセス・プリロード（ウィンドウ生成 / 設定永続化 / IPC / 擬似全画面 / ファイル起動）
src/app/    レンダラー（UI・コメント描画・仮想クロック・操作）
src/shared/ メイン・レンダラー共有（マーカー定義 / 設定型）
```

詳しい仕様は [SPEC.md](./SPEC.md) を参照してください。

---

## スペシャルサンクス

- **[Midra429/NCOverlay](https://github.com/Midra429/NCOverlay)**
  移植元
- **[commenomi](https://air.fem.jp/commenomi/)**
  参考元
- **[xpadev-net/niconicomments](https://github.com/xpadev-net/niconicomments)**
  コメント描画

## ライセンス

MIT License

## 作者

kamm
- X: [@kammjp](https://x.com/kammjp)
- GitHub: [@nyumen](https://github.com/nyumen)
