'use client'

import {
    Apple as AppleIcon,
    Download as DownloadIcon,
} from '@mui/icons-material'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material'
import { useState } from 'react'
import { usePWAInstall } from '../hooks/usePWAInstall'

interface PWAInstallButtonProps {
    variant?: 'contained' | 'outlined' | 'text'
    size?: 'small' | 'medium' | 'large'
    fullWidth?: boolean
}

export default function PWAInstallButton({
    variant = 'outlined',
    size = 'medium',
    fullWidth = false,
}: PWAInstallButtonProps) {
    const { showInstallOption, isIOS, installPWA } = usePWAInstall()
    const [showIOSInstructions, setShowIOSInstructions] = useState(false)

    if (!showInstallOption) {
        return null
    }

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true)
        } else {
            await installPWA()
        }
    }

    return (
        <>
            <Button
                variant={variant}
                size={size}
                fullWidth={fullWidth}
                startIcon={isIOS ? <AppleIcon /> : <DownloadIcon />}
                onClick={handleInstallClick}
                sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    ...(variant === 'contained' && {
                        'background':
                            'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                        '&:hover': {
                            background:
                                'linear-gradient(45deg, #1565c0 30%, #1e88e5 90%)',
                        },
                    }),
                }}>
                {isIOS ? 'Add to Home Screen' : 'Install App'}
            </Button>

            {/* iOS Installation Instructions Dialog */}
            <Dialog
                open={showIOSInstructions}
                onClose={() => setShowIOSInstructions(false)}
                maxWidth="sm"
                fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <AppleIcon color="primary" />
                        Add to Home Screen
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" paragraph>
                        To install this app on your iOS device:
                    </Typography>
                    <Box component="ol" sx={{ 'pl': 2, '& li': { mb: 1 } }}>
                        <li>
                            <Typography variant="body2">
                                Tap the <strong>Share</strong> button{' '}
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: '20px',
                                        height: '20px',
                                        textAlign: 'center',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        lineHeight: '18px',
                                    }}>
                                    ⬆
                                </span>{' '}
                                at the bottom of your screen
                            </Typography>
                        </li>
                        <li>
                            <Typography variant="body2">
                                Scroll down and tap{' '}
                                <strong>
                                    &ldquo;Add to Home Screen&rdquo;
                                </strong>
                            </Typography>
                        </li>
                        <li>
                            <Typography variant="body2">
                                Tap <strong>&ldquo;Add&rdquo;</strong> in the
                                top-right corner
                            </Typography>
                        </li>
                    </Box>
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 2,
                            fontStyle: 'italic',
                            color: 'text.secondary',
                        }}>
                        The app will then appear on your home screen and work
                        like a native app!
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setShowIOSInstructions(false)}
                        color="primary">
                        Got it
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
