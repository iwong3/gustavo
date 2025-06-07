import type { Metadata, Viewport } from 'next'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import './globals.css'

export const metadata: Metadata = {
    title: 'Gustavo - Track Spending and Split Costs',
    description: 'Track spending and split costs with friends and family',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
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
    themeColor: '#1976d2',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href="/logo192.png" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="default"
                />
                <meta name="apple-mobile-web-app-title" content="Gustavo" />
                <meta name="msapplication-TileColor" content="#1976d2" />
                <meta name="msapplication-tap-highlight" content="no" />
            </head>
            <body>
                {children}
                <PWAInstallPrompt />
            </body>
        </html>
    )
}
