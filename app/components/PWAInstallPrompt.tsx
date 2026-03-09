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
                                Add Gustavo to your home screen for quick access
                                and a native app experience.
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
                            {isIOS ? 'How to Install' : 'Install'}
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
                            <h3>Add to Home Screen</h3>
                            <button
                                className="pwa-ios-close"
                                onClick={() => setShowIOSInstructions(false)}>
                                &times;
                            </button>
                        </div>
                        <div className="pwa-ios-content">
                            <p className="pwa-ios-safari-note">
                                You must use <strong>Safari</strong> to install
                                this app. Other browsers (Chrome, Firefox) do
                                not support PWA installation on iOS.
                            </p>
                            <ol>
                                <li>
                                    Tap the{' '}
                                    <strong>
                                        Share{' '}
                                        <span className="share-icon">⬆</span>
                                    </strong>{' '}
                                    button in the Safari toolbar
                                </li>
                                <li>
                                    Scroll down and tap{' '}
                                    <strong>
                                        &ldquo;Add to Home Screen&rdquo;
                                    </strong>
                                </li>
                                <li>
                                    Tap <strong>&ldquo;Add&rdquo;</strong> in the
                                    top-right corner
                                </li>
                            </ol>
                            <p className="pwa-ios-note">
                                Gustavo will appear on your home screen and work
                                like a native app &mdash; no App Store needed.
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
                    background: #fffdf7;
                    border: 1px solid #090401;
                    box-shadow: 3px 3px 0px #090401;
                    padding: 16px;
                    pointer-events: all;
                    max-width: 400px;
                    margin: 0 auto;
                    border-radius: 4px;
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
                    font-weight: 700;
                    color: #090401;
                }

                .pwa-install-content p {
                    margin: 0;
                    font-size: 0.9rem;
                    color: #090401;
                    line-height: 1.4;
                    opacity: 0.8;
                }

                .pwa-install-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .pwa-dismiss-btn {
                    background: #fffdf7;
                    border: 1px solid #090401;
                    box-shadow: 2px 2px 0px #090401;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #090401;
                    transition: transform 0.1s, box-shadow 0.1s;
                }

                .pwa-dismiss-btn:hover {
                    background-color: #fefae0;
                }

                .pwa-dismiss-btn:active {
                    box-shadow: none;
                    transform: translate(2px, 2px);
                }

                .pwa-install-btn {
                    background-color: #f7cd83;
                    color: #090401;
                    border: 1px solid #090401;
                    box-shadow: 2px 2px 0px #090401;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                    transition: transform 0.1s, box-shadow 0.1s;
                }

                .pwa-install-btn:hover {
                    background-color: #f5c165;
                }

                .pwa-install-btn:active {
                    box-shadow: none;
                    transform: translate(2px, 2px);
                }

                /* iOS Modal Styles */
                .pwa-ios-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(9, 4, 1, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1001;
                    padding: 20px;
                }

                .pwa-ios-modal {
                    background: #fffdf7;
                    border: 1px solid #090401;
                    box-shadow: 4px 4px 0px #090401;
                    border-radius: 4px;
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .pwa-ios-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 20px 15px;
                    border-bottom: 1px solid #090401;
                }

                .pwa-ios-header h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #090401;
                }

                .pwa-ios-close {
                    background: none;
                    border: 1px solid #090401;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: #090401;
                    padding: 0;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: transform 0.1s, box-shadow 0.1s;
                    box-shadow: 1px 1px 0px #090401;
                }

                .pwa-ios-close:hover {
                    background-color: #fefae0;
                }

                .pwa-ios-close:active {
                    box-shadow: none;
                    transform: translate(1px, 1px);
                }

                .pwa-ios-content {
                    padding: 20px;
                }

                .pwa-ios-safari-note {
                    margin: 0 0 16px 0;
                    padding: 10px 12px;
                    background-color: #fefae0;
                    border: 1px solid #090401;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    line-height: 1.5;
                    color: #090401;
                }

                .pwa-ios-content ol {
                    padding-left: 20px;
                    margin: 16px 0;
                }

                .pwa-ios-content li {
                    margin-bottom: 12px;
                    line-height: 1.5;
                    color: #090401;
                    font-size: 0.95rem;
                }

                .share-icon {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    text-align: center;
                    border: 1px solid #090401;
                    border-radius: 4px;
                    font-size: 12px;
                    line-height: 18px;
                    background-color: #fefae0;
                }

                .pwa-ios-note {
                    font-size: 0.85rem;
                    margin: 16px 0 0 0;
                    padding: 10px 12px;
                    background-color: #fefae0;
                    border: 1px solid #090401;
                    border-radius: 4px;
                    line-height: 1.5;
                    color: #090401;
                }

                .pwa-ios-footer {
                    padding: 15px 20px 20px;
                    border-top: 1px solid #090401;
                    text-align: right;
                }

                .pwa-ios-got-it {
                    background-color: #f7cd83;
                    color: #090401;
                    border: 1px solid #090401;
                    box-shadow: 2px 2px 0px #090401;
                    padding: 10px 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                    transition: transform 0.1s, box-shadow 0.1s;
                }

                .pwa-ios-got-it:hover {
                    background-color: #f5c165;
                }

                .pwa-ios-got-it:active {
                    box-shadow: none;
                    transform: translate(2px, 2px);
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
