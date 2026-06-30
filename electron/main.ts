import { app, BrowserWindow, ipcMain, screen, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { DEFAULT_SETTINGS, type Settings } from '../src/shared/settings'

// ───────────────────────────────────────────────────────────
// 設定の永続化（SPEC §10）
// ───────────────────────────────────────────────────────────
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json')

let settings: Settings = { ...DEFAULT_SETTINGS }

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf-8')
    settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    settings = { ...DEFAULT_SETTINGS }
  }
}

let saveTimer: NodeJS.Timeout | null = null
function persistSettings() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2))
    } catch {
      // 保存失敗は致命的ではないので握りつぶす
    }
  }, 200)
}

function mergeSettings(partial: Partial<Settings>) {
  settings = { ...settings, ...partial }
  persistSettings()
}

// ───────────────────────────────────────────────────────────
// ウィンドウ
// ───────────────────────────────────────────────────────────
let win: BrowserWindow | null = null
let isFullscreen = false

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function applyAlwaysOnTop(on: boolean) {
  // 'screen-saver' レベルで他アプリのフルスクリーンより前面に出やすくする（SPEC §2.1）
  win?.setAlwaysOnTop(on, 'screen-saver')
}

// 擬似全画面（OSの本物の全画面は使わない / SPEC §2.2）
function enterPseudoFullscreen() {
  if (!win || isFullscreen) return
  // 直前の通常 bounds を復元先として保存
  mergeSettings({ windowBounds: win.getBounds() })
  // フラグを先に立ててから setBounds する（move/resize の保存をスキップさせるため）
  isFullscreen = true
  const disp = screen.getDisplayMatching(win.getBounds())
  const b = disp.bounds
  win.setBounds({
    x: b.x + 1,
    y: b.y + 1,
    width: b.width - 2,
    height: b.height - 2,
  })
}

function exitPseudoFullscreen() {
  if (!win || !isFullscreen) return
  isFullscreen = false
  const nb = settings.windowBounds
  if (nb) win.setBounds(nb)
}

function createWindow() {
  const b = settings.windowBounds
  win = new BrowserWindow({
    width: b?.width ?? 900,
    height: b?.height ?? 520,
    x: b?.x,
    y: b?.y,
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: true,
    alwaysOnTop: settings.alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  applyAlwaysOnTop(settings.alwaysOnTop)

  if (isDev) {
    win.loadURL('http://localhost:5173/index.html')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, 'renderer/index.html'))
  }

  const saveBounds = () => {
    if (win && !isFullscreen) mergeSettings({ windowBounds: win.getBounds() })
  }
  win.on('move', saveBounds)
  win.on('resize', saveBounds)
  win.on('closed', () => {
    win = null
  })

  // 起動時/起動中に開くよう指定された XML を、描画完了後にレンダラーへ渡す（SPEC §11）
  win.webContents.on('did-finish-load', () => {
    if (pendingOpenPath) {
      sendFileToRenderer(pendingOpenPath)
      pendingOpenPath = null
    }
  })

  // 起動時に擬似全画面を復元
  if (settings.pseudoFullscreen) {
    enterPseudoFullscreen()
  }
}

// ───────────────────────────────────────────────────────────
// ファイル関連付け / アイコンへのドロップ起動（SPEC §11）
//   - macOS: open-file イベントでパスを受け取る
//   - Windows(portable): 起動引数(argv)からパスを受け取る
// ───────────────────────────────────────────────────────────
let pendingOpenPath: string | null = null

function sendFileToRenderer(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    win?.webContents.send('file:open', { name: path.basename(filePath), content })
  } catch {
    // 読めないファイルは無視
  }
}

function handleOpenPath(filePath: string | null) {
  if (!filePath) return
  if (win && !win.webContents.isLoading()) {
    sendFileToRenderer(filePath)
  } else {
    // ウィンドウ/描画がまだなら保留し、did-finish-load で送る
    pendingOpenPath = filePath
  }
}

/** argv から実在する .xml パスを探す（Windows のアイコンドロップ/関連付け起動用） */
function xmlFromArgv(argv: string[]): string | null {
  for (const a of argv) {
    if (a.toLowerCase().endsWith('.xml') && fs.existsSync(a)) return a
  }
  return null
}

// macOS: ファイルを開く要求（Dock/Finder からのドロップ・関連付け起動）。ready 前に発火しうる。
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  handleOpenPath(filePath)
})

// ───────────────────────────────────────────────────────────
// IPC
// ───────────────────────────────────────────────────────────
ipcMain.handle('settings:get', () => settings)
ipcMain.on('settings:save', (_e, partial: Partial<Settings>) => mergeSettings(partial))

ipcMain.on('window:minimize', () => win?.minimize())
ipcMain.on('window:close', () => win?.close())
ipcMain.on('window:setAlwaysOnTop', (_e, on: boolean) => applyAlwaysOnTop(on))
ipcMain.on('window:setIgnoreMouse', (_e, ignore: boolean) => {
  win?.setIgnoreMouseEvents(ignore, { forward: true })
})
ipcMain.on('window:setPseudoFullscreen', (_e, on: boolean) => {
  if (on) enterPseudoFullscreen()
  else exitPseudoFullscreen()
})

ipcMain.handle('dialog:openFile', async () => {
  if (!win) return null
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'ニコニココメント XML', extensions: ['xml'] }],
  })
  if (res.canceled || !res.filePaths[0]) return null
  const p = res.filePaths[0]
  try {
    const content = fs.readFileSync(p, 'utf-8')
    return { name: path.basename(p), content }
  } catch {
    return null
  }
})

// ───────────────────────────────────────────────────────────
// ライフサイクル
// ───────────────────────────────────────────────────────────
// 単一インスタンス化（Windows: 起動中に別ファイルを開いた時のため）
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    handleOpenPath(xmlFromArgv(argv))
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    loadSettings()
    // Windows: 起動引数で渡された XML を保留（macOS は open-file が先に処理済みのことがある）
    if (!pendingOpenPath) {
      const argvPath = xmlFromArgv(process.argv)
      if (argvPath) pendingOpenPath = argvPath
    }
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
}
