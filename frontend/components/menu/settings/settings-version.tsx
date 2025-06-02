import { Box } from '@mui/material'
import { formattedVersion, getLatestDeployedAt } from 'helpers/version'
import { useEffect, useState } from 'react'

export const SettingsVersion = () => {
    const [deployedAt, setDeployedAt] = useState<string>('')
    const [deployedAtError, setDeployedAtError] = useState<boolean>(false)

    useEffect(() => {
        async function fetchData() {
            try {
                const deployedAt = await getLatestDeployedAt()
                setDeployedAt(deployedAt)
            } catch (err) {
                setDeployedAtError(true)
            }
        }

        fetchData()
    }, [])

    return (
        <Box
            sx={{
                display: 'flex',
                fontSize: 10,
            }}>
            <Box>{formattedVersion()}</Box>
            {!deployedAtError && (
                <Box>&nbsp;&nbsp;—&nbsp;&nbsp;{deployedAt}</Box>
            )}
        </Box>
    )
}
