/// <reference types="vite/client" />

interface Window {
  ipcRenderer: import('electron').IpcRenderer
  projectApi: import('../shared/ipc').ProjectApi
  terminalApi: import('../shared/ipc').TerminalApi
  logApi: import('../shared/ipc').LogApi
}
