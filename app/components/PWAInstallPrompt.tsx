'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null)
    const [showInstallButton, setShowInstallButton] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Check if app is already installed
        const checkIfInstalled = () => {
            if (typeof window !== 'undefined') {
                const isStandalone = window.matchMedia(
                    '(display-mode: standalone)'
                ).matches
                const isInstalled =
                    (window.navigator as any).standalone === true ||
                    isStandalone
                setIsInstalled(isInstalled)
            }
        }

        checkIfInstalled()

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setShowInstallButton(true)
        }

        const handleAppInstalled = () => {
            setIsInstalled(true)
            setShowInstallButton(false)
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

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt')
        } else {
            console.log('User dismissed the install prompt')
        }

        setDeferredPrompt(null)
        setShowInstallButton(false)
    }

    // Don't show anything if already installed
    if (isInstalled) return null

    // Don't show if no prompt available
    if (!showInstallButton || !deferredPrompt) return null

    return (
        <div className="pwa-install-prompt">
            <div className="pwa-install-card">
                <div className="pwa-install-content">
                    <div className="pwa-install-icon">📱</div>
                    <div>
                        <h3>Install Gustavo</h3>
                        <p>
                            Get quick access and a better experience by
                            installing Gustavo on your device.
                        </p>
                    </div>
                </div>
                <div className="pwa-install-actions">
                    <button
                        onClick={() => setShowInstallButton(false)}
                        className="pwa-dismiss-btn">
                        Not now
                    </button>
                    <button
                        onClick={handleInstallClick}
                        className="pwa-install-btn">
                        Install
                    </button>
                </div>
            </div>

            <style jsx>{`
                .pwa-install-prompt {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    right: 20px;
                    z-index: 1000;
                    pointer-events: none;
                }

                .pwa-install-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    padding: 16px;
                    pointer-events: all;
                    max-width: 400px;
                    margin: 0 auto;
                    border: 1px solid #e0e0e0;
                }

                .pwa-install-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .pwa-install-icon {
                    font-size: 2rem;
                    flex-shrink: 0;
                }

                .pwa-install-content h3 {
                    margin: 0 0 4px 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                }

                .pwa-install-content p {
                    margin: 0;
                    font-size: 0.9rem;
                    color: #666;
                    line-height: 1.4;
                }

                .pwa-install-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .pwa-dismiss-btn {
                    background: none;
                    border: 1px solid #ddd;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    color: #666;
                    transition: all 0.2s;
                }

                .pwa-dismiss-btn:hover {
                    background-color: #f5f5f5;
                }

                .pwa-install-btn {
                    background-color: #1976d2;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }

                .pwa-install-btn:hover {
                    background-color: #1565c0;
                }

                @media (max-width: 480px) {
                    .pwa-install-prompt {
                        left: 10px;
                        right: 10px;
                        bottom: 10px;
                    }

                    .pwa-install-content {
                        flex-direction: column;
                        text-align: center;
                    }

                    .pwa-install-actions {
                        justify-content: stretch;
                    }

                    .pwa-dismiss-btn,
                    .pwa-install-btn {
                        flex: 1;
                    }
                }
            `}</style>
        </div>
    )
}
