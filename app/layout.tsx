import type { Metadata } from 'next'
import { Roboto, IBM_Plex_Serif } from 'next/font/google'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import Providers from './components/providers'
import './globals.css'

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-roboto',
    display: 'swap',
})

const ibmPlexSerif = IBM_Plex_Serif({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-serif',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'Gustavo - Track Spending and Split Costs',
    description: 'Track spending and split costs with friends and family',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        // black-translucent renders the status bar over the app's own yellow
        // bg — proven good through stable iOS 26. The iOS 27 BETA draws it
        // gray no matter what (tried: 'default', SSR'd fixed yellow strip,
        // opaque #main-scroll, reinstalls — July 2026). OS bug; recheck on
        // future betas rather than churning config here.
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

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${roboto.variable} ${ibmPlexSerif.variable}`}>
            <head>
                <link rel="icon" href="/gus-fring-square.png" type="image/png" />
                <link rel="apple-touch-icon" href="/gus-fring-square.png" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
                />
                <meta name="theme-color" content="#fefae0" />
                {/* Light-only app. Without this, iOS treats the app as
                    supporting both schemes and may paint its standalone
                    chrome (status bar area) with dark/gray material when the
                    phone is in dark mode. */}
                <meta name="color-scheme" content="light" />
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
