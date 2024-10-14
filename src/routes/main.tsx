import { Box } from '@mui/material'
import dayjs from 'dayjs'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Gustavo } from 'views/gustavo'

let customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)

enum Path {
    HOME = '/',
    TRACK_SPEND = '/track-spend',
}

const routes = [
    {
        path: Path.HOME,
        component: () => {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        width: '100%',
                    }}>
                    <Gustavo />
                </Box>
            )
        },
    },
]

export const MainRouter = () => {
    return (
        <BrowserRouter basename={process.env.PUBLIC_URL}>
            <Routes>
                {routes.map(({ path, component }) => (
                    <Route key={path} path={path} element={component()} />
                ))}
            </Routes>
        </BrowserRouter>
    )
}
