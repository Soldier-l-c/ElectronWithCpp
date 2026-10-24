'use strict'

const path = require('node:path')
const { spawn } = require('node:child_process')
const electronPath = require('electron')

const ROOT = path.resolve(__dirname, '..')
const SANDBOX_CRASH_EXIT_CODES = new Set([
  2147483651, // 0x80000003 as an unsigned 32-bit Windows exit code
  -2147483645 // the same STATUS_BREAKPOINT value when interpreted as signed
])
const RETRY_WINDOW_MS = 15000

async function main() {
  // Vite 7's Node API is ESM-only.
  const { createServer } = await import('vite')

  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.mjs'),
    clearScreen: false
  })

  await server.listen()
  server.printUrls()

  const url = server.resolvedUrls?.local?.[0]
  if (!url) {
    await server.close()
    throw new Error('Vite 开发服务器未返回可用地址。')
  }

  console.log(`[dev] Electron 将加载 ${url}`)

  const electronEnvironment = {
    ...process.env,
    VITE_DEV_SERVER_URL: url,
    ELECTRON_ENABLE_LOGGING: '1'
  }

  // Some terminals inject ELECTRON_RUN_AS_NODE globally. Electron must start
  // as a desktop application, not as a plain Node.js process.
  delete electronEnvironment.ELECTRON_RUN_AS_NODE

  const extraArguments = (process.env.ELECTRON_EXTRA_ARGS || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  let closing = false
  let retriedWithoutSandbox = false
  let activeElectron = null

  function startElectron(argumentsList) {
    const startedAt = Date.now()
    const electron = spawn(electronPath, [ROOT, ...argumentsList], {
      cwd: ROOT,
      stdio: 'inherit',
      env: electronEnvironment
    })

    activeElectron = electron
    const hasNoSandbox = argumentsList.some((argument) => argument === '--no-sandbox')

    electron.on('error', async (error) => {
      if (closing) return
      console.error('[dev] 启动 Electron 失败：', error)
      await shutdown(1)
    })

    electron.on('close', async (code) => {
      if (closing) return
      activeElectron = null

      const crashedDuringStartup = Date.now() - startedAt < RETRY_WINDOW_MS
      const isSandboxCrash = process.platform === 'win32' &&
        code !== null &&
        SANDBOX_CRASH_EXIT_CODES.has(code)
      const fallbackEnabled = process.env.ELECTRON_DISABLE_SANDBOX_FALLBACK !== '1'
      const canRetry = fallbackEnabled &&
        isSandboxCrash &&
        crashedDuringStartup &&
        !hasNoSandbox &&
        !retriedWithoutSandbox

      if (canRetry) {
        retriedWithoutSandbox = true
        console.warn(
          `[dev] Electron 启动时被 Chromium 沙箱拦截（退出码 ${code}）。` +
            '正在使用 --no-sandbox 重试；该参数只作用于当前开发进程，不会影响打包结果。'
        )
        setTimeout(() => {
          if (!closing) startElectron([...argumentsList, '--no-sandbox'])
        }, 400)
        return
      }

      if (code !== 0) {
        console.error(`[dev] Electron 已退出，退出码 ${code}。请检查上方主进程日志。`)
      }
      await shutdown(code ?? 0)
    })
  }

  async function shutdown(exitCode) {
    if (closing) return
    closing = true

    if (activeElectron && !activeElectron.killed) {
      activeElectron.kill()
    }

    try {
      await server.close()
    } catch (error) {
      console.error('[dev] 关闭 Vite 失败：', error)
    }
    process.exit(exitCode ?? 0)
  }

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      shutdown(0)
    })
  }

  startElectron([...extraArguments])
}

main().catch((error) => {
  console.error('[dev] 启动失败：', error)
  process.exit(1)
})
