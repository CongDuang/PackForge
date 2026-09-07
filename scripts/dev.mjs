import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const electronPath = require('electron')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function buildElectronOnce() {
  const proc = spawn(process.execPath, [path.join(root, 'scripts/build-electron.mjs')], {
    cwd: root,
    stdio: 'inherit',
  })
  await new Promise((resolve, reject) => {
    proc.on('exit', (code) => {
      if (code === 0) resolve(undefined)
      else reject(new Error(`build-electron exited ${code}`))
    })
  })
}

await buildElectronOnce()

const server = await createServer({
  configFile: path.join(root, 'vite.config.ts'),
  root,
})
await server.listen()
const addr = server.resolvedUrls?.local[0] ?? 'http://localhost:5173'
console.log(`[dev] Vite ${addr}`)

const childEnv = { ...process.env, VITE_DEV_SERVER_URL: addr }
// Cursor/某些工具会设置该变量，导致 Electron 以纯 Node 模式运行，require('electron') 无 app API
delete childEnv.ELECTRON_RUN_AS_NODE

const electronProc = spawn(String(electronPath), ['.'], {
  cwd: root,
  env: childEnv,
  stdio: 'inherit',
})

const shutdown = async () => {
  if (!electronProc.killed) electronProc.kill()
  await server.close()
  process.exit(0)
}

electronProc.on('exit', async (code) => {
  console.log(`[dev] Electron exited with code ${code}`)
  await server.close()
  process.exit(code ?? 0)
})

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
