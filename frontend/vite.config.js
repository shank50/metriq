import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3123,
        host: true,
        allowedHosts: ['metriq.shank50.live'],
        proxy: {
            '/api': {
                target: 'http://localhost:4123',
                changeOrigin: true
            }
        }
    }
})
