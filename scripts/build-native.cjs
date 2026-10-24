'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const ROOT = path.resolve(__dirname, '..')
const CPP_DIR = path.join(ROOT, 'cpp')
const BUILD_DIR = path.join(CPP_DIR, 'build')
const IF_NEEDED = process.argv.includes('--if-needed')

const PLATFORM = process.platform === 'win32'
  ? 'win32'
  : process.platform === 'darwin'
    ? 'darwin'
    : 'linux'

const ARCH = process.arch === 'ia32'
  ? 'x86'
  : process.arch === 'arm64'
    ? 'arm64'
    : 'x64'

const LIBRARY_NAME = PLATFORM === 'win32'
  ? 'cpp_core.dll'
  : PLATFORM === 'darwin'
    ? 'libcpp_core.dylib'
    : 'libcpp_core.so'

const OUTPUT_FILE = path.join(CPP_DIR, 'bin', PLATFORM, ARCH, LIBRARY_NAME)

function fail(message) {
  console.error(`\n[build:native] ${message}\n`)
  process.exit(1)
}

function findOnPath(command) {
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : ['']

  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    if (!directory) continue
    for (const extension of extensions) {
      const candidate = path.join(directory, `${command}${extension.toLowerCase()}`)
      if (fs.existsSync(candidate)) return candidate
      const original = path.join(directory, `${command}${extension}`)
      if (fs.existsSync(original)) return original
    }
  }
  return null
}

function visualStudioBases() {
  const bases = new Set()

  for (const environmentName of ['ProgramFiles(x86)', 'ProgramFiles']) {
    if (process.env[environmentName]) {
      bases.add(path.join(process.env[environmentName], 'Microsoft Visual Studio', '2019'))
    }
  }

  // Visual Studio may be installed on a drive different from the one used for
  // the operating system. Check the usual roots before giving up.
  for (const drive of ['C:', 'D:', 'E:', 'F:', 'G:']) {
    bases.add(path.join(`${drive}\\`, 'Program Files (x86)', 'Microsoft Visual Studio', '2019'))
    bases.add(path.join(`${drive}\\`, 'Program Files', 'Microsoft Visual Studio', '2019'))
  }

  return [...bases]
}

function findVisualStudio2019() {
  if (process.platform !== 'win32') return null

  const preferred = ['Enterprise', 'Professional', 'Community', 'BuildTools']

  for (const base of visualStudioBases()) {
    if (!fs.existsSync(base)) continue

    const editions = fs.readdirSync(base).sort((a, b) => {
      const indexA = preferred.indexOf(a)
      const indexB = preferred.indexOf(b)
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB)
    })

    for (const edition of editions) {
      const installation = path.join(base, edition)
      const devenv = path.join(installation, 'Common7', 'IDE', 'devenv.exe')
      if (fs.existsSync(devenv)) return installation
    }
  }

  return null
}

function findCMake() {
  const candidates = []

  if (process.env.CMAKE_EXECUTABLE) {
    candidates.push(process.env.CMAKE_EXECUTABLE)
  }

  const onPath = findOnPath('cmake')
  if (onPath) candidates.push(onPath)

  if (process.platform === 'win32') {
    const visualStudio = findVisualStudio2019()
    if (visualStudio) {
      candidates.push(path.join(
        visualStudio,
        'Common7',
        'IDE',
        'CommonExtensions',
        'Microsoft',
        'CMake',
        'CMake',
        'bin',
        'cmake.exe'
      ))
    }

    for (const drive of ['C:', 'D:', 'E:', 'F:', 'G:']) {
      candidates.push(
        path.join(`${drive}\\`, 'Program Files', 'CMake', 'bin', 'cmake.exe'),
        path.join(`${drive}\\`, 'Program Files (x86)', 'CMake', 'bin', 'cmake.exe')
      )
    }
  }

  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null
}

function collectSourceStats(directory, newest) {
  if (!fs.existsSync(directory)) return newest

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'build' || entry.name === 'bin') continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      newest = collectSourceStats(fullPath, newest)
    } else {
      newest = Math.max(newest, fs.statSync(fullPath).mtimeMs)
    }
  }

  return newest
}

function isUpToDate() {
  if (!fs.existsSync(OUTPUT_FILE)) return false

  let newestSource = fs.statSync(path.join(CPP_DIR, 'CMakeLists.txt')).mtimeMs
  for (const directory of ['src', 'include', 'third_party']) {
    newestSource = collectSourceStats(path.join(CPP_DIR, directory), newestSource)
  }

  return fs.statSync(OUTPUT_FILE).mtimeMs >= newestSource
}

function run(command, args) {
  console.log(`[build:native] ${path.basename(command)} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  })

  if (result.error) {
    fail(`无法启动 CMake：${result.error.message}`)
  }
  if (result.status !== 0) {
    fail(`构建命令执行失败，退出码 ${result.status}。`)
  }
}

function main() {
  if (process.platform === 'win32' && process.arch !== 'x64') {
    fail('当前 Windows 原生构建仅支持 x64。请使用 x64 版本的 Node.js 和 Electron。')
  }

  if (IF_NEEDED && isUpToDate()) {
    console.log(`[build:native] 已是最新：${OUTPUT_FILE}`)
    return
  }

  const cmake = findCMake()
  if (!cmake) {
    fail(
      '未找到 CMake。请安装 CMake 3.16+ 并加入 PATH，或安装带 C++ 桌面开发工作负载的 Visual Studio 2019（其自带 CMake）。'
    )
  }

  const configureArgs = ['-S', CPP_DIR, '-B', BUILD_DIR]

  if (process.platform === 'win32') {
    const visualStudio = findVisualStudio2019()
    if (!visualStudio) {
      fail('未找到 Visual Studio 2019。请安装“使用 C++ 的桌面开发”工作负载。')
    }
    console.log(`[build:native] Visual Studio: ${visualStudio}`)
    configureArgs.push('-G', 'Visual Studio 16 2019', '-A', 'x64')
  } else {
    configureArgs.push('-DCMAKE_BUILD_TYPE=Release')
  }

  console.log(`[build:native] CMake: ${cmake}`)
  run(cmake, configureArgs)

  const buildArgs = ['--build', BUILD_DIR, '--config', 'Release', '--parallel']
  run(cmake, buildArgs)

  if (!fs.existsSync(OUTPUT_FILE)) {
    fail(`构建结束但未找到产物：${OUTPUT_FILE}`)
  }

  console.log(`[build:native] 完成：${OUTPUT_FILE}`)
}

main()
