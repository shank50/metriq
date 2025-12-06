import React from 'react'
import ReactDOM from 'react-dom/client'
import RootLayout from './app/layout'
import AppPage from './app/page'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <RootLayout>
            <AppPage />
        </RootLayout>
    </React.StrictMode>,
)
