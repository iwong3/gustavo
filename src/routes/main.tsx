import { Box } from '@mui/material'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Gustavo } from 'views/gustavo'

enum Path {
    HOME = '/',
    TRACK_SPEND = '/track-spend',
}

const routes = [
    {
        path: Path.HOME,
        component: () => <Gustavo />,
    },
]

export const MainRouter = () => {
    return (
        <BrowserRouter basename={process.env.PUBLIC_URL}>
            <Box sx={{ m: 3 }}>
                <Routes>
                    {routes.map(({ path, component }) => (
                        <Route path={path} element={component()} />
                    ))}
                </Routes>
            </Box>
        </BrowserRouter>
    )
}
