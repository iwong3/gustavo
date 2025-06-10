import withPWA from 'next-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.env.NODE_ENV !== 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
        externalDir: true,
    },
    // Ensure proper asset handling for production
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

    // Add output configuration for better Vercel compatibility
    output: 'standalone',

    // Ensure proper trailing slash handling
    trailingSlash: false,
}

// Only use PWA in development to avoid deployment issues
const pwaConfig = isDev
    ? nextConfig
    : withPWA({
          dest: 'public',
          disable: process.env.NODE_ENV === 'development',
          register: true,
          skipWaiting: true,
          runtimeCaching: [
              {
                  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                      cacheName: 'google-fonts',
                      expiration: {
                          maxEntries: 4,
                          maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
                      },
                  },
              },
              {
                  urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                      cacheName: 'google-fonts-static',
                      expiration: {
                          maxEntries: 4,
                          maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
                      },
                  },
              },
              {
                  urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
                  handler: 'StaleWhileRevalidate',
                  options: {
                      cacheName: 'static-image-assets',
                      expiration: {
                          maxEntries: 64,
                          maxAgeSeconds: 24 * 60 * 60, // 24 hours
                      },
                  },
              },
              {
                  urlPattern: /\/_next\/image\?url=.+$/i,
                  handler: 'StaleWhileRevalidate',
                  options: {
                      cacheName: 'next-image',
                      expiration: {
                          maxEntries: 64,
                          maxAgeSeconds: 24 * 60 * 60, // 24 hours
                      },
                  },
              },
              {
                  urlPattern: /\.(?:js)$/i,
                  handler: 'StaleWhileRevalidate',
                  options: {
                      cacheName: 'static-js-assets',
                      expiration: {
                          maxEntries: 32,
                          maxAgeSeconds: 24 * 60 * 60, // 24 hours
                      },
                  },
              },
              {
                  urlPattern: /\.(?:css|less)$/i,
                  handler: 'StaleWhileRevalidate',
                  options: {
                      cacheName: 'static-style-assets',
                      expiration: {
                          maxEntries: 32,
                          maxAgeSeconds: 24 * 60 * 60, // 24 hours
                      },
                  },
              },
              {
                  urlPattern: /^\/api\/.*/i,
                  handler: 'NetworkFirst',
                  method: 'GET',
                  options: {
                      cacheName: 'apis',
                      expiration: {
                          maxEntries: 16,
                          maxAgeSeconds: 24 * 60 * 60, // 24 hours
                      },
                      cacheableResponse: {
                          statuses: [0, 200],
                      },
                  },
              },
          ],
      })(nextConfig)

export default pwaConfig
