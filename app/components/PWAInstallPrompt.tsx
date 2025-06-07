'use client'

import { useState } from 'react'
import { usePWAInstall } from '../hooks/usePWAInstall'

export default function PWAInstallPrompt() {
    const { showInstallOption, isIOS, installPWA } = usePWAInstall()
    const [isDismissed, setIsDismissed] = useState(false)
    const [showIOSInstructions, setShowIOSInstructions] = useState(false)

    // Don't show if dismissed, not installable, or already installed
    if (isDismissed || !showInstallOption) {
        return null
    }

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true)
        } else {
            await installPWA()
            setIsDismissed(true)
        }
    }

    const handleDismiss = () => {
        setIsDismissed(true)
    }

    return (
        <>
            {/* Main popup prompt */}
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
                            onClick={handleDismiss}
                            className="pwa-dismiss-btn">
                            Not now
                        </button>
                        <button
                            onClick={handleInstallClick}
                            className="pwa-install-btn">
                            {isIOS ? 'Show Instructions' : 'Install'}
                        </button>
                    </div>
                </div>
            </div>

            {/* iOS Instructions Modal */}
            {showIOSInstructions && (
                <div
                    className="pwa-ios-modal-overlay"
                    onClick={() => setShowIOSInstructions(false)}>
                    <div
                        className="pwa-ios-modal"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="pwa-ios-header">
                            <h3>🍎 Add to Home Screen</h3>
                            <button
                                className="pwa-ios-close"
                                onClick={() => setShowIOSInstructions(false)}>
                                ×
                            </button>
                        </div>
                        <div className="pwa-ios-content">
                            <p>To install this app on your iOS device:</p>
                            <ol>
                                <li>
                                    Tap the <strong>Share</strong> button{' '}
                                    <span className="share-icon">⬆</span> at the
                                    bottom of your screen
                                </li>
                                <li>
                                    Scroll down and tap{' '}
                                    <strong>
                                        &ldquo;Add to Home Screen&rdquo;
                                    </strong>
                                </li>
                                <li>
                                    Tap <strong>&ldquo;Add&rdquo;</strong> in
                                    the top-right corner
                                </li>
                            </ol>
                            <p className="pwa-ios-note">
                                The app will then appear on your home screen and
                                work like a native app!
                            </p>
                        </div>
                        <div className="pwa-ios-footer">
                            <button
                                onClick={() => {
                                    setShowIOSInstructions(false)
                                    setIsDismissed(true)
                                }}
                                className="pwa-ios-got-it">
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                /* iOS Modal Styles */
                .pwa-ios-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1001;
                    padding: 20px;
                }

                .pwa-ios-modal {
                    background: white;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .pwa-ios-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 20px 0;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 15px;
                }

                .pwa-ios-header h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    color: #333;
                }

                .pwa-ios-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background-color 0.2s;
                }

                .pwa-ios-close:hover {
                    background-color: #f5f5f5;
                }

                .pwa-ios-content {
                    padding: 20px;
                }

                .pwa-ios-content p {
                    margin: 0 0 15px 0;
                    line-height: 1.5;
                    color: #333;
                }

                .pwa-ios-content ol {
                    padding-left: 20px;
                    margin: 15px 0;
                }

                .pwa-ios-content li {
                    margin-bottom: 12px;
                    line-height: 1.5;
                    color: #333;
                }

                .share-icon {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    text-align: center;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 12px;
                    line-height: 18px;
                    background-color: #f8f9fa;
                }

                .pwa-ios-note {
                    font-style: italic;
                    color: #666;
                    font-size: 0.9rem;
                    margin-top: 15px !important;
                    padding: 10px;
                    background-color: #f8f9fa;
                    border-radius: 6px;
                }

                .pwa-ios-footer {
                    padding: 15px 20px 20px;
                    border-top: 1px solid #eee;
                    text-align: right;
                }

                .pwa-ios-got-it {
                    background-color: #1976d2;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }

                .pwa-ios-got-it:hover {
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

                    .pwa-ios-modal-overlay {
                        padding: 10px;
                    }
                }
            `}</style>
        </>
    )
}
