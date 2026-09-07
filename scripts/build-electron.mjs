import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Bundle only preload (sandboxed). Main is compiled by tsc to keep Electron requires intact.
await build({
  entryPoints: [path.join(root, 'electron/preload.ts')],
  outfile: path.join(root, 'dist-electron/preload.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['electron'],
  sourcemap: true,
})

const { spawnSync } = require('node:child_process')
const tsc = spawnSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.electron.build.json')],
  { cwd: root, stdio: 'inherit' },
)
if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1)
}

console.log('Electron main/preload built → dist-electron/')
