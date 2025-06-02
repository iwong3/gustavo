/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./frontend/setupTests.ts'],
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
