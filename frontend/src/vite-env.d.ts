/// <reference types="vite/client" />

interface Window {
  // Window APIs are provided at runtime by the Bun server and Convex hooks
  // No Electron IPC or shared IPC modules — those were removed during platform pivot
}
