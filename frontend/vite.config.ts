import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 34115
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'], // 添加 TypeScript 扩展
  }
})