import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/main/**/*.test.ts', 'src/preload/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'dist-electron/**',
        '**/*.test.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@main': path.join(__dirname, 'src/main'),
      '@preload': path.join(__dirname, 'src/preload'),
    },
  },
})
