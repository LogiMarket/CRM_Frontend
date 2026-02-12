import { spawn } from 'node:child_process'
import path from 'node:path'

const port = String(process.env.PORT || 3000)

const nextCli = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
const nextArgs = [nextCli, 'start', '-H', '0.0.0.0', '-p', port]

const child = spawn(process.execPath, nextArgs, {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
