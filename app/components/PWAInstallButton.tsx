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
import { colors, hardShadow } from '../../lib/colors'
import { primaryButtonSx, secondaryButtonSx } from '../../lib/form-styles'
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
                    ...(variant === 'contained'
                        ? primaryButtonSx
                        : secondaryButtonSx),
                }}>
                {isIOS ? 'Add to Home Screen' : 'Install App'}
            </Button>

            {/* iOS Installation Instructions Dialog */}
            <Dialog
                open={showIOSInstructions}
                onClose={() => setShowIOSInstructions(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            backgroundColor: colors.primaryWhite,
                            ...hardShadow,
                            boxShadow: `4px 4px 0px ${colors.primaryBlack}`,
                            borderRadius: '4px',
                        },
                    },
                }}>
                <DialogTitle
                    sx={{
                        borderBottom: `1px solid ${colors.primaryBlack}`,
                        fontWeight: 700,
                        color: colors.primaryBlack,
                    }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <AppleIcon sx={{ color: colors.primaryBlack }} />
                        Add to Home Screen
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: '20px !important' }}>
                    <Box
                        sx={{
                            mb: 2,
                            p: 1.5,
                            backgroundColor: colors.secondaryYellow,
                            border: `1px solid ${colors.primaryBlack}`,
                            borderRadius: '4px',
                        }}>
                        <Typography
                            variant="body2"
                            sx={{ color: colors.primaryBlack }}>
                            You must use <strong>Safari</strong> to install this
                            app. Other browsers (Chrome, Firefox) do not support
                            PWA installation on iOS.
                        </Typography>
                    </Box>
                    <Box
                        component="ol"
                        sx={{
                            'pl': 2,
                            '& li': { mb: 1.5, color: colors.primaryBlack },
                        }}>
                        <li>
                            <Typography variant="body2">
                                Tap the <strong>Share</strong> button{' '}
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'inline-block',
                                        width: '20px',
                                        height: '20px',
                                        textAlign: 'center',
                                        border: `1px solid ${colors.primaryBlack}`,
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        lineHeight: '18px',
                                        backgroundColor:
                                            colors.secondaryYellow,
                                    }}>
                                    ⬆
                                </Box>{' '}
                                in the Safari toolbar
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
                    <Box
                        sx={{
                            mt: 2,
                            p: 1.5,
                            backgroundColor: colors.secondaryYellow,
                            border: `1px solid ${colors.primaryBlack}`,
                            borderRadius: '4px',
                        }}>
                        <Typography
                            variant="body2"
                            sx={{ color: colors.primaryBlack }}>
                            Gustavo will appear on your home screen and work
                            like a native app &mdash; no App Store needed.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions
                    sx={{
                        borderTop: `1px solid ${colors.primaryBlack}`,
                        p: 2,
                    }}>
                    <Button
                        onClick={() => setShowIOSInstructions(false)}
                        sx={primaryButtonSx}>
                        Got it
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
