import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events', 'crypto'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    // inject({
    //   Buffer: ['buffer', 'Buffer'],
    //   exclude: '**/*.html',
    // }),
  ],
  resolve: {
    alias: {
      process: "process/browser",
      stream: "stream-browserify",
      zlib: "browserify-zlib",
      util: "util",
    },
  },
  define: {
    'process.env': {},
    'global': 'globalThis',
  },
  server: {
    allowedHosts: [
      'sandlike-mila-uncreditably.ngrok-free.dev'
    ]
  }
})
