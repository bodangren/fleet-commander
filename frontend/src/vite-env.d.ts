/// <reference types="vite/client" />

// Window APIs are provided at runtime by the Bun server and Convex hooks.
// Electron IPC and shared IPC modules were removed during the platform pivot.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Window {}
