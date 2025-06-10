'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null)
    const [isInstallable, setIsInstallable] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)

    useEffect(() => {
        const checkPlatform = () => {
            if (typeof window !== 'undefined') {
                // Check if iOS
                const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                setIsIOS(iOS)

                // Check if already installed (standalone mode)
                const standalone =
                    window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true
                setIsStandalone(standalone)
                setIsInstalled(standalone)
            }
        }

        checkPlatform()

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setIsInstallable(true)
        }

        const handleAppInstalled = () => {
            setIsInstalled(true)
            setIsInstallable(false)
            setDeferredPrompt(null)
        }

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt
        )
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt
            )
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const installPWA = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice

            if (outcome === 'accepted') {
                console.log('User accepted the install prompt')
            } else {
                console.log('User dismissed the install prompt')
            }

            setDeferredPrompt(null)
            setIsInstallable(false)
            return outcome === 'accepted'
        }
        return false
    }

    // Show install option if:
    // - Not already installed
    // - Either has installable prompt OR is iOS (where we show instructions)
    const showInstallOption = !isInstalled && (isInstallable || isIOS)

    return {
        isInstallable,
        isInstalled,
        isIOS,
        isStandalone,
        showInstallOption,
        installPWA,
    }
}
