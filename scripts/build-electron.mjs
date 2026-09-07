import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const { spawnSync } = require('node:child_process')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Main: tsc CJS so `require('electron').app` stays intact.
const tsc = spawnSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.electron.build.json')],
  { cwd: root, stdio: 'inherit' },
)
if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1)
}

// Preload must be bundled: sandbox 禁止再 require 本地模块。tsc 在前，避免覆盖 bundle。
await build({
  entryPoints: [path.join(root, 'electron/preload.ts')],
  outfile: path.join(root, 'dist-electron/electron/preload.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['electron'],
  sourcemap: true,
})

console.log('Electron main/preload built → dist-electron/')
