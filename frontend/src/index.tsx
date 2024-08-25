import React from 'react'
import ReactDOM from 'react-dom/client'

import { MainRouter } from 'routes/main'
import './index.css'

const Root = () => {
    return (
        <React.StrictMode>
            <MainRouter />
        </React.StrictMode>
    )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Root />)
