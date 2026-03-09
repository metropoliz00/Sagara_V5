import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env agar kode eksisting yang menggunakannya tetap berjalan
      // Gunakan JSON.stringify untuk memastikan nilai terdefinisi dengan benar sebagai string/objek di client
      'process.env': JSON.stringify(env)
    },
    build: {
      chunkSizeWarningLimit: 1600, // Menaikkan batas peringatan ukuran chunk menjadi 1600 kB
    },
  }
})