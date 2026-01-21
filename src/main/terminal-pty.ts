export interface TerminalPty {
  onData: (handler: (data: string) => void) => void
  write: (data: string) => void
  kill: () => void
  resize?: (cols: number, rows: number) => void
  pid?: number
}

export interface SpawnPtyOptions {
  cwd: string
  cols?: number
  rows?: number
}

export const spawnPty = ({ cwd, cols = 80, rows = 24 }: SpawnPtyOptions): TerminalPty => {
  // Lazy require keeps tests decoupled from the native node-pty dependency.
  const pty = require('node-pty') as {
    spawn: (
      file: string,
      args: string[],
      options: {
        name: string
        cwd: string
        cols: number
        rows: number
        env: NodeJS.ProcessEnv
      },
    ) => TerminalPty
  }

  const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'

  return pty.spawn(shell, [], {
    name: 'xterm-color',
    cwd,
    cols,
    rows,
    env: process.env,
  })
}
