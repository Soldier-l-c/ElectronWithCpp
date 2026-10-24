<template>
  <div class="app-shell">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>

    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <span>&lt;</span><b>/</b><span>&gt;</span>
        </div>
        <div class="brand-copy">
          <span class="brand-kicker">DESKTOP NATIVE STARTER</span>
          <strong>Electron<span>WithCpp</span></strong>
        </div>
      </div>

      <div class="topbar-right">
        <div class="live-pill" :class="`tone-${bridgeTone}`">
          <i></i>
          {{ native.available ? '原生桥接在线' : '等待原生桥接' }}
        </div>
        <div class="topbar-platform">
          {{ platformLabel }} <span>/</span> {{ runtime.arch.toUpperCase() }}
        </div>
      </div>
    </header>

    <main class="content">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span></span> VUE 2 · ELECTRON · C++ BRIDGE</div>
          <h1>桌面体验，<br /><em>原生内核。</em></h1>
          <p class="hero-text">
            Vue 负责界面与交互，C++ 负责系统级能力，Electron 主进程通过 koffi
            连接两侧。两层独立构建，通过一条稳定的 JSON 接口通信。
          </p>
          <div class="version-row">
            <span><b>VUE</b> {{ vueVersion }}</span>
            <span><b>ELECTRON</b> {{ runtime.electron }}</span>
            <span><b>NODE</b> {{ runtime.node }}</span>
          </div>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="orbit orbit-outer"></div>
          <div class="orbit orbit-middle"></div>
          <div class="orbit orbit-inner"></div>
          <div class="orbit-node node-one"></div>
          <div class="orbit-node node-two"></div>
          <div class="core">
            <span class="core-kicker">CORE</span>
            <strong>C++</strong>
            <span class="core-state">{{ native.initialized ? 'RUNNING' : 'IDLE' }}</span>
          </div>
          <div class="visual-caption">
            <span>KOFFI · C ABI</span>
            <strong>{{ native.available ? 'NATIVE ONLINE' : 'NATIVE STANDBY' }}</strong>
          </div>
        </div>
      </section>

      <section class="workspace-grid">
        <article class="panel status-panel">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">SYSTEM STATUS</span>
              <h2>桥接与核心</h2>
            </div>
            <div class="status-pill" :class="`tone-${bridgeTone}`">
              <i></i>{{ bridgeLabel }}
            </div>
          </div>

          <div class="stat-list">
            <div v-for="card in nativeStatusCards" :key="card.index" class="stat-row">
              <span class="stat-index">{{ card.index }}</span>
              <span class="stat-copy">
                <span class="stat-label">{{ card.label }}</span>
                <span class="stat-detail">{{ card.detail }}</span>
              </span>
              <span class="stat-value" :class="`tone-${card.tone}`">
                <i></i>{{ card.value }}
              </span>
            </div>
          </div>

          <div v-if="native.error" class="error-note">
            <span class="error-mark">!</span>
            <p>{{ native.error }}</p>
          </div>

          <p class="panel-footnote">
            原生库由 CMake 独立构建，主进程通过 <code>koffi.load()</code> 加载。
          </p>
        </article>

        <article class="panel control-panel">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">NATIVE CONTROL</span>
              <h2>调用 C++ 核心</h2>
            </div>
            <button class="text-button" type="button" @click="resetConfig">恢复示例</button>
          </div>

          <label class="field-label" for="config-json">
            <span>cpp_init 参数</span>
            <b>UTF-8 JSON OBJECT</b>
          </label>

          <div class="editor">
            <div class="editor-dots" aria-hidden="true">
              <i></i><i></i><i></i>
              <span>config.json</span>
            </div>
            <textarea
              id="config-json"
              v-model="configJson"
              rows="6"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              @keydown.ctrl.enter.prevent="initialize"
            ></textarea>
          </div>

          <div class="editor-meta">
            <span>{{ lineCount }} 行</span>
            <span>{{ configJson.length }} 字符</span>
            <span>Ctrl + Enter 初始化</span>
          </div>

          <div class="action-row">
            <button class="btn btn-ghost" type="button" :disabled="busy" @click="formatJson">
              格式化 JSON
            </button>
            <button
              class="btn btn-primary"
              type="button"
              :disabled="!native.available || native.initialized || busy"
              @click="initialize"
            >
              <span>{{ busy ? '调用中' : '初始化核心' }}</span>
              <b>{{ busy ? '···' : '→' }}</b>
            </button>
            <button
              class="btn btn-outline"
              type="button"
              :disabled="!native.available || !native.initialized || busy"
              @click="deinitialize"
            >
              反初始化
            </button>
          </div>

          <transition name="result-fade">
            <div v-if="lastResult" class="result-strip" :class="`tone-${resultTone}`">
              <span class="result-code">
                {{ lastResult.code === null ? 'N/A' : `CODE ${lastResult.code}` }}
              </span>
              <span class="result-message">{{ lastResult.message }}</span>
            </div>
          </transition>
        </article>
      </section>

      <section class="panel log-panel">
        <div class="panel-head log-head">
          <div>
            <span class="panel-kicker">CALL LOG</span>
            <h2>调用日志</h2>
          </div>
          <button class="text-button" type="button" :disabled="!logs.length" @click="clearLogs">
            清空
          </button>
        </div>

        <div ref="logEl" class="log-console" role="log" aria-live="polite">
          <div v-if="!logs.length" class="log-empty">等待桥接调用…</div>
          <div v-for="entry in logs" :key="entry.id" class="log-line">
            <span class="log-time">{{ entry.time }}</span>
            <span class="log-level" :class="`level-${entry.level}`">{{ entry.level.toUpperCase() }}</span>
            <span class="log-message">{{ entry.message }}</span>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <span>ElectronWithCpp <b>v0.1.0</b></span>
      <span class="footer-divider"></span>
      <span>UI / Vue {{ vueVersion }}</span>
      <span class="footer-divider"></span>
      <span>Bridge / koffi</span>
      <span class="footer-divider"></span>
      <span>Core / C++17</span>
    </footer>
  </div>
</template>

<script>
import Vue from 'vue'

const DEFAULT_CONFIG = JSON.stringify(
  {
    appName: 'ElectronWithCpp',
    logLevel: 'info'
  },
  null,
  2
)

const PLATFORM_LABELS = {
  win32: 'Windows',
  darwin: 'macOS',
  linux: 'Linux'
}

export default {
  name: 'App',

  data() {
    return {
      runtime: window.runtimeInfo || {
        platform: 'unknown',
        arch: 'unknown',
        electron: '—',
        chrome: '—',
        node: '—',
        v8: '—'
      },
      vueVersion: Vue.version,
      native: {
        available: false,
        initialized: false,
        libraryPath: null,
        libraryFile: null,
        error: '尚未检测原生桥接。',
        platform: window.runtimeInfo ? window.runtimeInfo.platform : 'unknown',
        arch: window.runtimeInfo ? window.runtimeInfo.arch : 'unknown'
      },
      configJson: DEFAULT_CONFIG,
      logs: [],
      logSequence: 0,
      busy: false,
      lastResult: null
    }
  },

  computed: {
    platformLabel() {
      return PLATFORM_LABELS[this.runtime.platform] || this.runtime.platform
    },

    bridgeTone() {
      if (this.native.available) return 'ok'
      if (this.native.error && this.native.error !== '尚未检测原生桥接。') return 'bad'
      return 'pending'
    },

    bridgeLabel() {
      if (this.native.available) return '已连接'
      if (this.native.error && this.native.error !== '尚未检测原生桥接。') return '不可用'
      return '检测中'
    },

    nativeStatusCards() {
      return [
        {
          index: '01',
          label: 'C++ 动态库',
          detail: this.native.libraryFile || '等待 CMake 构建产物',
          value: this.native.available ? '已加载' : '未就绪',
          tone: this.native.available ? 'ok' : 'bad'
        },
        {
          index: '02',
          label: '核心生命周期',
          detail: this.native.initialized ? 'cpp_init 已成功执行' : '等待 cpp_init 调用',
          value: this.native.initialized ? '运行中' : '未初始化',
          tone: this.native.initialized ? 'ok' : 'idle'
        },
        {
          index: '03',
          label: '宿主运行环境',
          detail: `${this.runtime.arch} · Electron ${this.runtime.electron}`,
          value: this.platformLabel,
          tone: 'neutral'
        }
      ]
    },

    resultTone() {
      if (!this.lastResult) return 'neutral'
      return this.lastResult.ok ? 'ok' : 'bad'
    },

    lineCount() {
      return this.configJson.split('\n').length
    }
  },

  mounted() {
    this.addLog('info', '渲染进程已启动，开始检测原生桥接。')
    this.refreshStatus()
  },

  methods: {
    async refreshStatus() {
      if (!window.cppBridge) {
        this.native = {
          ...this.native,
          available: false,
          error: 'preload 未注入 cppBridge，请通过 Electron 启动应用。'
        }
        this.addLog('error', this.native.error)
        return
      }

      try {
        const status = await window.cppBridge.getStatus()
        this.native = status
        if (status.available) {
          this.addLog('success', `原生库已连接：${status.libraryFile}`)
        } else {
          this.addLog('error', status.error || '原生库不可用。')
        }
      } catch (error) {
        this.native = {
          ...this.native,
          available: false,
          error: `读取桥接状态失败：${error.message}`
        }
        this.addLog('error', this.native.error)
      }
    },

    async initialize() {
      if (!window.cppBridge) {
        this.addLog('error', 'cppBridge 不可用，无法调用 cpp_init。')
        return
      }

      let payload
      try {
        const parsed = JSON.parse(this.configJson)
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('顶层必须是 JSON 对象')
        }
        payload = JSON.stringify(parsed)
      } catch (error) {
        this.lastResult = {
          ok: false,
          code: null,
          statusName: 'CLIENT_VALIDATION',
          message: `JSON 无效：${error.message}`
        }
        this.addLog('error', this.lastResult.message)
        return
      }

      this.busy = true
      this.addLog('info', '调用 cpp_init，参数为 JSON 对象。')

      try {
        const result = await window.cppBridge.initialize(payload)
        this.lastResult = result
        if (result.state) this.native = result.state
        this.addLog(
          result.ok ? 'success' : 'error',
          `cpp_init → ${result.code === null ? 'N/A' : result.code} ${result.statusName}：${result.message}`
        )
      } catch (error) {
        this.lastResult = {
          ok: false,
          code: null,
          statusName: 'IPC_FAILED',
          message: `调用 cpp_init 失败：${error.message}`
        }
        this.addLog('error', this.lastResult.message)
      } finally {
        this.busy = false
      }
    },

    async deinitialize() {
      if (!window.cppBridge) {
        this.addLog('error', 'cppBridge 不可用，无法调用 cpp_deinit。')
        return
      }

      this.busy = true
      this.addLog('info', '调用 cpp_deinit，参数：{"reason":"user-request"}。')

      try {
        const result = await window.cppBridge.deinitialize(
          JSON.stringify({ reason: 'user-request' })
        )
        this.lastResult = result
        if (result.state) this.native = result.state
        this.addLog(
          result.ok ? 'success' : 'error',
          `cpp_deinit → ${result.code === null ? 'N/A' : result.code} ${result.statusName}：${result.message}`
        )
      } catch (error) {
        this.lastResult = {
          ok: false,
          code: null,
          statusName: 'IPC_FAILED',
          message: `调用 cpp_deinit 失败：${error.message}`
        }
        this.addLog('error', this.lastResult.message)
      } finally {
        this.busy = false
      }
    },

    formatJson() {
      try {
        const parsed = JSON.parse(this.configJson)
        this.configJson = JSON.stringify(parsed, null, 2)
        this.addLog('info', 'JSON 已格式化。')
      } catch (error) {
        this.addLog('error', `JSON 格式化失败：${error.message}`)
      }
    },

    resetConfig() {
      this.configJson = DEFAULT_CONFIG
      this.addLog('info', '已恢复示例参数。')
    },

    clearLogs() {
      this.logs = []
    },

    addLog(level, message) {
      const now = new Date()
      this.logs.push({
        id: ++this.logSequence,
        time: now.toLocaleTimeString('zh-CN', { hour12: false }),
        level,
        message
      })
      if (this.logs.length > 200) {
        this.logs.splice(0, this.logs.length - 200)
      }
      this.$nextTick(this.scrollLogs)
    },

    scrollLogs() {
      const consoleElement = this.$refs.logEl
      if (consoleElement) {
        consoleElement.scrollTop = consoleElement.scrollHeight
      }
    }
  }
}
</script>

<style scoped>
.app-shell {
  position: relative;
  width: min(100%, 1280px);
  min-height: 100vh;
  margin: 0 auto;
  padding: 24px 40px 20px;
  overflow: hidden;
}

.ambient {
  position: absolute;
  z-index: -1;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.22;
  pointer-events: none;
}

.ambient-one {
  top: 80px;
  right: -180px;
  background: #1a8f86;
}

.ambient-two {
  bottom: -180px;
  left: -120px;
  background: #2b4fa7;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  animation: rise-in 0.55s ease both;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  gap: 1px;
  color: var(--accent);
  border: 1px solid rgba(94, 234, 212, 0.36);
  border-radius: 11px;
  background: linear-gradient(145deg, rgba(39, 111, 109, 0.48), rgba(7, 22, 34, 0.9));
  box-shadow: inset 0 0 22px rgba(94, 234, 212, 0.08), 0 0 24px rgba(94, 234, 212, 0.08);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
}

.brand-mark b {
  color: var(--accent-amber);
  font-weight: 500;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-kicker,
.panel-kicker {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.17em;
}

.brand-copy strong {
  font-size: 19px;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.brand-copy strong span {
  color: var(--accent);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(9, 22, 38, 0.66);
  font-size: 11px;
  letter-spacing: 0.02em;
}

.live-pill i,
.status-pill i,
.stat-value i {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 9px currentColor;
}

.live-pill.tone-ok,
.status-pill.tone-ok,
.stat-value.tone-ok {
  color: var(--accent);
}

.live-pill.tone-bad,
.status-pill.tone-bad,
.stat-value.tone-bad {
  color: var(--accent-rose);
}

.live-pill.tone-pending,
.status-pill.tone-pending {
  color: var(--accent-amber);
}

.live-pill.tone-pending i,
.status-pill.tone-pending i {
  animation: soft-pulse 1.4s ease-in-out infinite;
}

.topbar-platform {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
}

.topbar-platform span {
  margin: 0 5px;
  color: rgba(140, 163, 186, 0.4);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 24px;
}

.hero {
  display: grid;
  min-height: 248px;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  gap: 20px;
  padding: 34px 38px;
  border: 1px solid var(--border);
  border-radius: 22px;
  background:
    linear-gradient(115deg, rgba(23, 51, 77, 0.66), rgba(8, 20, 35, 0.76) 58%, rgba(10, 31, 43, 0.7)),
    var(--bg-panel);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 24px 60px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  animation: rise-in 0.65s 0.06s ease both;
}

.hero-copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 16px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
}

.eyebrow span {
  width: 22px;
  height: 1px;
  background: var(--accent);
  box-shadow: 0 0 10px rgba(94, 234, 212, 0.7);
}

h1 {
  margin: 0;
  font-size: clamp(36px, 4.4vw, 52px);
  font-weight: 620;
  letter-spacing: -0.055em;
  line-height: 1.08;
}

h1 em {
  color: transparent;
  background: linear-gradient(92deg, var(--accent) 10%, #8fb9ff 90%);
  -webkit-background-clip: text;
  background-clip: text;
  font-style: normal;
}

.hero-text {
  max-width: 570px;
  margin: 18px 0 20px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.8;
}

.version-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.version-row span {
  padding: 5px 8px;
  color: var(--text-dim);
  border: 1px solid rgba(126, 166, 199, 0.12);
  border-radius: 5px;
  background: rgba(3, 11, 21, 0.25);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
}

.version-row b {
  margin-right: 4px;
  color: rgba(232, 242, 255, 0.72);
  font-weight: 600;
}

.hero-visual {
  position: relative;
  display: flex;
  min-height: 190px;
  align-items: center;
  justify-content: center;
}

.hero-visual::before {
  position: absolute;
  width: 260px;
  height: 260px;
  content: "";
  border-radius: 50%;
  background: radial-gradient(circle, rgba(46, 144, 137, 0.16), transparent 68%);
}

.orbit {
  position: absolute;
  border: 1px solid rgba(127, 188, 206, 0.13);
  border-radius: 50%;
}

.orbit-outer {
  width: 210px;
  height: 210px;
  border-style: dashed;
  animation: spin 44s linear infinite;
}

.orbit-middle {
  width: 164px;
  height: 164px;
  border-color: rgba(127, 188, 206, 0.19);
  animation: spin-reverse 34s linear infinite;
}

.orbit-inner {
  width: 118px;
  height: 118px;
  border-color: rgba(94, 234, 212, 0.23);
}

.orbit-node {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px rgba(94, 234, 212, 0.8);
}

.node-one {
  top: 36px;
  right: 100px;
}

.node-two {
  bottom: 39px;
  left: 99px;
  width: 5px;
  height: 5px;
  background: var(--accent-blue);
  box-shadow: 0 0 12px rgba(102, 168, 255, 0.8);
}

.core {
  z-index: 2;
  display: flex;
  width: 96px;
  height: 96px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(94, 234, 212, 0.32);
  border-radius: 50%;
  background: radial-gradient(circle at 40% 30%, rgba(41, 124, 114, 0.52), rgba(5, 18, 30, 0.96) 68%);
  box-shadow: 0 0 45px rgba(45, 160, 146, 0.14), inset 0 0 22px rgba(94, 234, 212, 0.08);
}

.core-kicker,
.core-state {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.16em;
}

.core strong {
  margin: 2px 0;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 23px;
  font-weight: 500;
  letter-spacing: -0.08em;
}

.core-state {
  color: rgba(94, 234, 212, 0.66);
  letter-spacing: 0.12em;
}

.visual-caption {
  position: absolute;
  right: 0;
  bottom: 4px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.visual-caption span {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
}

.visual-caption strong {
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.83fr) minmax(460px, 1.17fr);
  gap: 16px;
  animation: rise-in 0.65s 0.12s ease both;
}

.panel {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: var(--bg-panel);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(12px);
}

.status-panel,
.control-panel {
  display: flex;
  min-height: 338px;
  flex-direction: column;
  padding: 22px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-head h2 {
  margin: 4px 0 0;
  font-size: 16px;
  font-weight: 620;
  letter-spacing: -0.018em;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border: 1px solid currentColor;
  border-radius: 5px;
  background: rgba(7, 19, 31, 0.42);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
  opacity: 0.82;
}

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.stat-row {
  display: flex;
  min-height: 54px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(126, 166, 199, 0.1);
  border-radius: 10px;
  background: rgba(5, 15, 27, 0.34);
}

.stat-index {
  color: rgba(114, 146, 175, 0.5);
  font-family: var(--font-mono);
  font-size: 9px;
}

.stat-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.stat-label {
  color: var(--text);
  font-size: 12px;
  font-weight: 520;
}

.stat-detail {
  overflow: hidden;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-value {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.05em;
}

.stat-value.tone-idle {
  color: var(--accent-amber);
}

.stat-value.tone-neutral {
  color: var(--accent-blue);
}

.error-note {
  display: flex;
  gap: 9px;
  margin-top: 10px;
  padding: 9px 10px;
  color: #ffb2c0;
  border: 1px solid rgba(255, 127, 152, 0.2);
  border-radius: 8px;
  background: rgba(92, 24, 45, 0.18);
  font-size: 10px;
  line-height: 1.55;
}

.error-mark {
  display: inline-flex;
  width: 16px;
  height: 16px;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 127, 152, 0.4);
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: 9px;
}

.error-note p {
  margin: 0;
  overflow-wrap: anywhere;
}

.panel-footnote {
  margin: auto 0 0;
  padding-top: 12px;
  color: var(--text-dim);
  font-size: 10px;
  line-height: 1.6;
}

.panel-footnote code {
  color: rgba(94, 234, 212, 0.8);
  font-family: var(--font-mono);
  font-size: 9px;
}

.text-button {
  padding: 3px 0;
  color: var(--text-dim);
  border: 0;
  background: transparent;
  font-size: 10px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.text-button:hover:not(:disabled) {
  color: var(--accent);
}

.text-button:disabled {
  cursor: default;
  opacity: 0.4;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 10px;
}

.field-label b {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.08em;
}

.editor {
  overflow: hidden;
  border: 1px solid rgba(126, 166, 199, 0.16);
  border-radius: 9px;
  background: rgba(3, 11, 20, 0.72);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.editor:focus-within {
  border-color: rgba(94, 234, 212, 0.34);
  box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.045);
}

.editor-dots {
  display: flex;
  height: 29px;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(126, 166, 199, 0.09);
  background: rgba(17, 35, 55, 0.45);
}

.editor-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 127, 152, 0.65);
}

.editor-dots i:nth-child(2) {
  background: rgba(255, 200, 107, 0.65);
}

.editor-dots i:nth-child(3) {
  background: rgba(94, 234, 212, 0.55);
}

.editor-dots span {
  margin-left: 5px;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
}

textarea {
  display: block;
  width: 100%;
  min-height: 94px;
  padding: 11px 13px;
  resize: vertical;
  color: #c7f8ec;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.65;
  caret-color: var(--accent);
  tab-size: 2;
}

.editor-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 7px 0 14px;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 8px;
}

.editor-meta span:last-child {
  margin-left: auto;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: 10px;
  font-weight: 520;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, opacity 0.18s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.36;
}

.btn-ghost {
  color: var(--text-muted);
  border-color: rgba(126, 166, 199, 0.14);
  background: rgba(15, 34, 53, 0.45);
}

.btn-ghost:hover:not(:disabled) {
  border-color: rgba(126, 166, 199, 0.28);
  color: var(--text);
}

.btn-primary {
  min-width: 126px;
  color: #041513;
  border-color: rgba(94, 234, 212, 0.72);
  background: linear-gradient(115deg, #74f3dc, #48cec5);
  box-shadow: 0 5px 20px rgba(53, 202, 185, 0.14);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(115deg, #8affea, #55ded2);
}

.btn-primary b {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
}

.btn-outline {
  color: var(--text-muted);
  border-color: rgba(255, 127, 152, 0.22);
  background: rgba(91, 22, 41, 0.14);
}

.btn-outline:hover:not(:disabled) {
  color: #ffb1c0;
  border-color: rgba(255, 127, 152, 0.42);
}

.result-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 10px 12px;
  border: 1px solid rgba(126, 166, 199, 0.12);
  border-radius: 8px;
  background: rgba(4, 13, 23, 0.46);
  font-size: 10px;
  line-height: 1.45;
}

.result-strip.tone-ok {
  color: rgba(151, 251, 232, 0.9);
  border-color: rgba(94, 234, 212, 0.2);
}

.result-strip.tone-bad {
  color: #ffb3c1;
  border-color: rgba(255, 127, 152, 0.22);
}

.result-code {
  flex: none;
  padding: 2px 5px;
  color: currentColor;
  border: 1px solid currentColor;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 8px;
  opacity: 0.75;
}

.result-message {
  overflow-wrap: anywhere;
}

.result-fade-enter-active,
.result-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.result-fade-enter,
.result-fade-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

.log-panel {
  padding: 20px 22px 18px;
  animation: rise-in 0.65s 0.18s ease both;
}

.log-head {
  margin-bottom: 12px;
}

.log-console {
  max-height: 142px;
  min-height: 72px;
  overflow: auto;
  padding: 8px 0;
  border-top: 1px solid rgba(126, 166, 199, 0.09);
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1.65;
}

.log-empty {
  padding: 15px 0;
  color: var(--text-dim);
  text-align: center;
}

.log-line {
  display: grid;
  grid-template-columns: 70px 54px minmax(0, 1fr);
  gap: 9px;
  padding: 4px 7px;
  border-radius: 4px;
}

.log-line:hover {
  background: rgba(95, 150, 188, 0.055);
}

.log-time {
  color: var(--text-dim);
}

.log-level {
  font-size: 8px;
  letter-spacing: 0.04em;
}

.level-info {
  color: var(--accent-blue);
}

.level-success {
  color: var(--accent);
}

.level-error {
  color: var(--accent-rose);
}

.log-message {
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px 0 0;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.03em;
}

.footer b {
  color: rgba(232, 242, 255, 0.58);
  font-weight: 500;
}

.footer-divider {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: rgba(126, 166, 199, 0.35);
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin-reverse {
  to {
    transform: rotate(-360deg);
  }
}

@keyframes soft-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@media (max-width: 980px) {
  .app-shell {
    padding: 20px 24px;
  }

  .hero {
    grid-template-columns: minmax(0, 1fr) 240px;
    padding: 28px;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .status-panel,
  .control-panel {
    min-height: auto;
  }
}

@media (max-width: 720px) {
  .app-shell {
    padding: 16px;
  }

  .topbar-right {
    gap: 8px;
  }

  .topbar-platform {
    display: none;
  }

  .hero {
    grid-template-columns: 1fr;
    padding: 24px;
  }

  .hero-visual {
    display: none;
  }

  h1 {
    font-size: 38px;
  }

  .status-panel,
  .control-panel {
    padding: 18px;
  }

  .btn {
    flex: 1;
  }

  .editor-meta span:last-child {
    display: none;
  }

  .log-line {
    grid-template-columns: 56px 48px minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
