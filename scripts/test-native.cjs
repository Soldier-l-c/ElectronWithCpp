'use strict'

const fs = require('node:fs')
const path = require('node:path')
const koffi = require('koffi')

const ROOT = path.resolve(__dirname, '..')
const platform = process.platform === 'win32'
  ? 'win32'
  : process.platform === 'darwin'
    ? 'darwin'
    : 'linux'
const arch = process.arch === 'ia32' ? 'x86' : process.arch
const libraryName = platform === 'win32'
  ? 'cpp_core.dll'
  : platform === 'darwin'
    ? 'libcpp_core.dylib'
    : 'libcpp_core.so'
const libraryPath = path.join(ROOT, 'cpp', 'bin', platform, arch, libraryName)

if (!fs.existsSync(libraryPath)) {
  console.error(`未找到原生库：${libraryPath}`)
  console.error('请先运行：npm run build:native')
  process.exit(1)
}

const library = koffi.load(libraryPath)
const cppInit = library.func('int cpp_init(const char *configJson)')
const cppDeinit = library.func('int cpp_deinit(const char *configJson)')

let failed = false

function expect(name, actual, expected) {
  const ok = actual === expected
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${actual}, expected ${expected}`)
  if (!ok) failed = true
}

console.log(`[test:native] 加载 ${libraryPath}`)
expect('reject invalid JSON', cppInit('{not json'), 2)
expect('reject non-object JSON', cppInit('[]'), 1)
expect('initialize', cppInit('{"appName":"native-test","logLevel":"debug"}'), 0)
expect('reject double initialize', cppInit('{"appName":"native-test"}'), 3)
expect('deinitialize', cppDeinit('{"reason":"native-test"}'), 0)
expect('reject double deinitialize', cppDeinit('{"reason":"native-test"}'), 4)

if (failed) {
  process.exit(1)
}

console.log('[test:native] 全部通过')
