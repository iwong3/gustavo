import { Box, Button, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'

import { Main } from 'views/main'

let customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)

enum Path {
    HOME = '/',
    GUSTAVO = '/gustavo',
    // Add future feature paths here
    // FEATURE2 = '/feature2',
    // FEATURE3 = '/feature3',
}

// Home page component that will list all available features
const HomePage = () => {
    const navigate = useNavigate()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: 4,
                gap: 3,
            }}>
            <Typography variant="h3" component="h1" gutterBottom>
                Welcome to the App Suite
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
                Choose a feature to get started:
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    minWidth: 200,
                }}>
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/gustavo')}>
                    Gustavo - Spending Tracker
                </Button>
                {/* Add future feature buttons here */}
                {/* 
                <Button 
                    variant="contained" 
                    size="large"
                    onClick={() => navigate('/feature2')}
                >
                    Feature 2
                </Button>
                */}
            </Box>
        </Box>
    )
}

const routes = [
    {
        path: Path.HOME,
        component: () => <HomePage />,
    },
    {
        path: Path.GUSTAVO,
        component: () => {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        width: '100%',
                    }}>
                    <Main />
                </Box>
            )
        },
    },
    // Add future feature routes here
    // {
    //     path: Path.FEATURE2,
    //     component: () => <Feature2Component />,
    // },
]

export const MainRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                {routes.map(({ path, component }) => (
                    <Route key={path} path={path} element={component()} />
                ))}
            </Routes>
        </BrowserRouter>
    )
}
