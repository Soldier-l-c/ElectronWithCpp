'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cppBridge', {
  getStatus: () => ipcRenderer.invoke('cpp:get-status'),
  initialize: (configJson) => ipcRenderer.invoke('cpp:initialize', configJson),
  deinitialize: (configJson) => ipcRenderer.invoke('cpp:deinitialize', configJson)
})

contextBridge.exposeInMainWorld('runtimeInfo', {
  platform: process.platform,
  arch: process.arch,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  v8: process.versions.v8
})
