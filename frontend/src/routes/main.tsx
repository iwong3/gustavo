import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Home } from 'views/home'
import { TrackSpend } from 'views/track-spend'

enum Path {
    HOME = '/',
    TRACK_SPEND = '/track-spend',
}

const routes = [
    {
        path: Path.HOME,
        component: () => <Home />,
    },
    {
        path: Path.TRACK_SPEND,
        component: () => <TrackSpend />,
    },
]

export const MainRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                {routes.map(({ path, component }) => (
                    <Route path={path} element={component()} />
                ))}
            </Routes>
        </BrowserRouter>
    )
}
