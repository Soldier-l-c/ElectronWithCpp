'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { app } = require('electron')

const STATUS_NAMES = {
  0: 'OK',
  1: 'INVALID_ARGUMENT',
  2: 'INVALID_JSON',
  3: 'ALREADY_INITIALIZED',
  4: 'NOT_INITIALIZED',
  5: 'INTERNAL'
}

const STATUS_MESSAGES = {
  0: 'C++ 核心调用成功',
  1: '参数无效：需要一个 JSON 对象字符串',
  2: 'JSON 解析失败，请检查格式',
  3: 'C++ 核心已经初始化',
  4: 'C++ 核心尚未初始化',
  5: 'C++ 核心内部错误'
}

const state = {
  loadAttempted: false,
  loaded: false,
  loadError: null,
  libraryPath: null,
  initialized: false,
  cppInit: null,
  cppDeinit: null
}

function libraryName() {
  if (process.platform === 'win32') return 'cpp_core.dll'
  if (process.platform === 'darwin') return 'libcpp_core.dylib'
  return 'libcpp_core.so'
}

function architectureFolder() {
  if (process.arch === 'ia32') return 'x86'
  if (process.arch === 'arm64') return 'arm64'
  return 'x64'
}

function candidateLibraryPaths() {
  const name = libraryName()
  const candidates = []

  if (process.env.CPP_CORE_LIBRARY) {
    candidates.push(path.resolve(app.getAppPath(), process.env.CPP_CORE_LIBRARY))
  }

  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, 'native', name))
  } else {
    candidates.push(
      path.join(app.getAppPath(), 'cpp', 'bin', process.platform, architectureFolder(), name),
      path.join(app.getAppPath(), 'cpp', 'build', 'Release', name),
      path.join(app.getAppPath(), 'cpp', 'build', name)
    )
  }

  return [...new Set(candidates)]
}

function loadError(message) {
  state.loadError = message
  console.error(`[native] ${message}`)
  return false
}

function ensureLoaded() {
  if (state.loadAttempted) return state.loaded
  state.loadAttempted = true

  const candidates = candidateLibraryPaths()
  const resolved = candidates.find((candidate) => fs.existsSync(candidate)) || null
  if (!resolved) {
    return loadError(
      `未找到 C++ 动态库。请先运行 "npm run build:native"。查找位置：${candidates.join(' | ')}`
    )
  }

  try {
    const koffi = require('koffi')
    const library = koffi.load(resolved)
    state.cppInit = library.func('int cpp_init(const char *configJson)')
    state.cppDeinit = library.func('int cpp_deinit(const char *configJson)')
    state.libraryPath = resolved
    state.loaded = true
    delete state.loadError
    console.log(`[native] 已加载 C++ 核心：${resolved}`)
    return true
  } catch (error) {
    return loadError(`加载 C++ 动态库失败：${error.message}`)
  }
}

function getStatus() {
  ensureLoaded()

  return {
    available: state.loaded,
    initialized: state.initialized,
    libraryPath: state.libraryPath,
    libraryFile: state.libraryPath ? path.basename(state.libraryPath) : null,
    error: state.loadError,
    platform: process.platform,
    arch: process.arch
  }
}

function failure(message, code = null, statusName = 'UNAVAILABLE') {
  return {
    ok: false,
    code,
    statusName,
    message,
    state: getStatus()
  }
}

function resultFromStatus(code, successMessage) {
  return {
    ok: code === 0,
    code,
    statusName: STATUS_NAMES[code] || 'UNKNOWN',
    message: code === 0 ? successMessage : (STATUS_MESSAGES[code] || `未知状态码：${code}`),
    state: getStatus()
  }
}

function validateJsonArgument(configJson) {
  if (typeof configJson !== 'string' || configJson.trim().length === 0) {
    return '初始化参数必须是非空 JSON 字符串。'
  }
  return null
}

function initialize(configJson) {
  if (!ensureLoaded()) {
    return failure(state.loadError || 'C++ 动态库不可用。')
  }

  const argumentError = validateJsonArgument(configJson)
  if (argumentError) return failure(argumentError)

  try {
    const code = state.cppInit(configJson)
    if (code === 0 || code === 3) state.initialized = true
    return resultFromStatus(code, 'C++ 核心初始化成功')
  } catch (error) {
    return failure(`调用 cpp_init 失败：${error.message}`, null, 'CALL_FAILED')
  }
}

function deinitialize(configJson) {
  if (!ensureLoaded()) {
    return failure(state.loadError || 'C++ 动态库不可用。')
  }

  const argumentError = validateJsonArgument(configJson)
  if (argumentError) return failure(argumentError)

  try {
    const code = state.cppDeinit(configJson)
    if (code === 0 || code === 4) state.initialized = false
    return resultFromStatus(code, 'C++ 核心已反初始化')
  } catch (error) {
    return failure(`调用 cpp_deinit 失败：${error.message}`, null, 'CALL_FAILED')
  }
}

function shutdown() {
  if (!state.loaded || !state.initialized || !state.cppDeinit) return
  try {
    state.cppDeinit(JSON.stringify({ reason: 'application-exit' }))
  } catch (error) {
    console.error('[native] 退出时反初始化失败：', error)
  } finally {
    state.initialized = false
  }
}

module.exports = {
  initialize,
  deinitialize,
  getStatus,
  shutdown
}
