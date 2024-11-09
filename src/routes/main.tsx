import { Box } from '@mui/material'
import dayjs from 'dayjs'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Main } from 'views/main'

let customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)

enum Path {
    HOME = '/',
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
                    <Main />
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
