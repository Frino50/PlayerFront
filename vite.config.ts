import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {nodePolyfills} from "vite-plugin-node-polyfills";

export default defineConfig({
    plugins: [vue(), nodePolyfills()],
    server: {
        port: 8081,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8082',
                changeOrigin: true,
                secure: false
            },
            '/ws': {
                target: 'http://localhost:8082',
                ws: true,
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path
            }
        }
    },
})
