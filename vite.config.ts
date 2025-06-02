import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    root: './frontend',
    publicDir: '../public',
    build: {
        outDir: '../build',
        emptyOutDir: true,
    },
    server: {
        port: 3000,
        open: true,
    },
    resolve: {
        alias: {
            'components': path.resolve(__dirname, './frontend/components'),
            'helpers': path.resolve(__dirname, './frontend/helpers'),
            'views': path.resolve(__dirname, './frontend/views'),
            'routes': path.resolve(__dirname, './frontend/routes'),
            '@': path.resolve(__dirname, './frontend'),
        },
    },
})
