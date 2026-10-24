'use strict'

const fs = require('node:fs')
const path = require('node:path')

const arch = process.arch === 'ia32' ? 'x86' : process.arch
const nativeDirectory = path.resolve(__dirname, 'cpp', 'bin', process.platform, arch)

if (!fs.existsSync(nativeDirectory)) {
  console.warn(`[electron-builder] Native output not found: ${nativeDirectory}`)
}

module.exports = {
  appId: 'com.example.electronwithcpp',
  productName: 'ElectronWithCpp',
  copyright: `Copyright © ${new Date().getFullYear()} ElectronWithCpp`,
  directories: {
    output: 'release',
    buildResources: 'build'
  },
  files: [
    'electron/**/*',
    'dist/renderer/**/*',
    'package.json',
    'node_modules/koffi/**/*',
    'node_modules/@koromix/**/*',
    '!**/*.map',
    '!**/*.md'
  ],
  extraResources: [
    {
      from: nativeDirectory,
      to: 'native',
      filter: ['**/*']
    },
    {
      from: 'build/icon.png',
      to: 'icon.png'
    }
  ],
  asar: true,
  asarUnpack: [
    'node_modules/koffi/**/*',
    'node_modules/@koromix/**/*'
  ],
  npmRebuild: false,
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.ico',
    artifactName: '${productName}-${version}-${arch}-Setup.${ext}'
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'ElectronWithCpp',
    uninstallDisplayName: 'ElectronWithCpp',
    deleteAppDataOnUninstall: false,
    runAfterFinish: true
  },
  mac: {
    target: ['dmg'],
    category: 'public.app-category.utilities',
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  linux: {
    target: ['AppImage'],
    category: 'Utility',
    icon: 'build/icon.png',
    artifactName: '${productName}-${version}-${arch}.${ext}'
  }
}
