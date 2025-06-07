import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
        externalDir: true,
    },
    // If you want to use your existing public directory
    assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',

    // Custom webpack config to resolve our folder structure
    webpack: (config, { isServer }) => {
        // Add aliases for clean imports
        config.resolve.alias = {
            ...config.resolve.alias,
            '@/backend': path.resolve(__dirname, 'backend'),
        }

        // Handle static assets
        config.module.rules.push({
            test: /\.(png|jpe?g|gif|svg)$/i,
            type: 'asset/resource',
            generator: {
                filename: 'static/images/[hash][ext][query]',
            },
        })

        return config
    },

    // Redirect API calls to our backend folder structure
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: '/api/:path*', // Keep API routes in app/api but they can import from backend/
            },
        ]
    },
}

export default nextConfig
