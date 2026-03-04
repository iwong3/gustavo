import { Box, Chip, Divider, Typography } from '@mui/material'
import pool from '@/backend/db'

type ServiceStatus = 'operational' | 'degraded' | 'down'

interface ServiceCheck {
    name: string
    status: ServiceStatus
    detail: string
}

async function checkDatabase(): Promise<ServiceCheck> {
    try {
        await pool.query('SELECT 1')
        return { name: 'Database', status: 'operational', detail: 'Connected' }
    } catch {
        return { name: 'Database', status: 'down', detail: 'Connection failed' }
    }
}

function checkAuth(): ServiceCheck {
    const configured =
        !!process.env.AUTH_SECRET &&
        !!process.env.AUTH_GOOGLE_ID &&
        !!process.env.AUTH_GOOGLE_SECRET
    return {
        name: 'Auth',
        status: configured ? 'operational' : 'down',
        detail: configured ? 'Configured' : 'Missing config',
    }
}

const STATUS_COLOR: Record<ServiceStatus, 'success' | 'warning' | 'error'> = {
    operational: 'success',
    degraded: 'warning',
    down: 'error',
}

export default async function HealthPage() {
    const [db] = await Promise.all([checkDatabase()])
    const auth = checkAuth()

    const services: ServiceCheck[] = [
        { name: 'App', status: 'operational', detail: 'Running' },
        db,
        auth,
    ]

    const overallStatus: ServiceStatus = services.some((s) => s.status === 'down')
        ? 'down'
        : services.some((s) => s.status === 'degraded')
          ? 'degraded'
          : 'operational'

    const overallLabel = {
        operational: 'All systems operational',
        degraded: 'Partial outage',
        down: 'Major outage',
    }[overallStatus]

    return (
        <Box sx={{ maxWidth: 560, mx: 'auto', mt: 8, px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Typography variant="h5" fontWeight={600}>
                    System Status
                </Typography>
                <Chip
                    label={overallLabel}
                    color={STATUS_COLOR[overallStatus]}
                    size="small"
                />
            </Box>

            <Box
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                }}
            >
                {services.map((service, i) => (
                    <Box key={service.name}>
                        {i > 0 && <Divider />}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 3,
                                py: 2,
                            }}
                        >
                            <Typography>{service.name}</Typography>
                            <Chip
                                label={service.detail}
                                color={STATUS_COLOR[service.status]}
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    </Box>
                ))}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Live check — refreshes on page load
            </Typography>
        </Box>
    )
}
