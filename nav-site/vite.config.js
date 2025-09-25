import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './', // 用于相对路径部署
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
