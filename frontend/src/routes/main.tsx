import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Home } from 'views/home'
import { Database } from 'components/database'

export const MainRouter = () => {
    const databaseProps = {
        numRows: 3,
        numCols: 3,
    }
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/databases" element={<Database {...databaseProps} />} />
            </Routes>
        </BrowserRouter>
    )
}
