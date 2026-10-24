'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const nativeBridge = require('./native-bridge')

const APP_ID = 'com.example.electronwithcpp'
const PRODUCT_NAME = 'ElectronWithCpp'
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const IS_DEV = Boolean(DEV_SERVER_URL)
const ROOT = path.join(__dirname, '..')

let mainWindow = null

app.setName(PRODUCT_NAME)

// Keep development data inside the repository. This avoids mixing development
// state with an installed build and works in environments with restricted
// access to the roaming AppData directory.
if (!app.isPackaged) {
  const developmentUserData = path.join(ROOT, '.cache', 'electron-user-data')
  fs.mkdirSync(developmentUserData, { recursive: true })
  app.setPath('userData', developmentUserData)
}

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID)
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    registerIpcHandlers()
    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })
}

function createMainWindow() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(ROOT, 'build', 'icon.png')

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 640,
    show: false,
    backgroundColor: '#08111f',
    autoHideMenuBar: true,
    title: PRODUCT_NAME,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  Menu.setApplicationMenu(null)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    let allowed = false
    try {
      allowed = IS_DEV && new URL(url).origin === new URL(DEV_SERVER_URL).origin
    } catch {
      allowed = false
    }
    if (!allowed) event.preventDefault()
  })

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12' && IS_DEV) {
      mainWindow.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (IS_DEV) {
    mainWindow.loadURL(DEV_SERVER_URL).catch((error) => {
      console.error('[main] 加载开发服务器失败：', error)
      mainWindow.show()
    })
  } else {
    mainWindow.loadFile(path.join(ROOT, 'dist', 'renderer', 'index.html')).catch((error) => {
      console.error('[main] 加载页面失败：', error)
      mainWindow.show()
    })
  }
}

function registerIpcHandlers() {
  ipcMain.handle('cpp:get-status', () => nativeBridge.getStatus())
  ipcMain.handle('cpp:initialize', (_event, configJson) => nativeBridge.initialize(configJson))
  ipcMain.handle('cpp:deinitialize', (_event, configJson) => nativeBridge.deinitialize(configJson))
}

app.on('before-quit', () => {
  nativeBridge.shutdown()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
