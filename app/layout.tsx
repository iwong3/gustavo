import type { Metadata, Viewport } from 'next'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import Providers from './components/providers'
import './globals.css'

export const metadata: Metadata = {
    title: 'Gustavo - Track Spending and Split Costs',
    description: 'Track spending and split costs with friends and family',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Gustavo',
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        type: 'website',
        siteName: 'Gustavo',
        title: 'Gustavo - Track Spending and Split Costs',
        description: 'Track spending and split costs with friends and family',
    },
    twitter: {
        card: 'summary',
        title: 'Gustavo - Track Spending and Split Costs',
        description: 'Track spending and split costs with friends and family',
    },
}

export const viewport: Viewport = {
    themeColor: '#fefae0',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover', // Draw behind notch/home indicator on iPhone
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/gus-fring-square.png" type="image/png" />
                <link rel="apple-touch-icon" href="/gus-fring-square.png" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />
                <meta name="apple-mobile-web-app-title" content="Gustavo" />
                <meta name="msapplication-TileColor" content="#fefae0" />
                <meta name="msapplication-tap-highlight" content="no" />
            </head>
            <body>
                <AppRouterCacheProvider>
                    <Providers>
                        {children}
                        <PWAInstallPrompt />
                        <PWAUpdatePrompt />
                    </Providers>
                </AppRouterCacheProvider>
            </body>
        </html>
    )
}
