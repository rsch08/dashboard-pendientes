import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { PendientesProvider } from './lib/PendientesContext.jsx'
import './index.css'

// HashRouter: las rutas viven después de "#", así Vercel no necesita
// reglas de reescritura y la PWA abre bien sin conexión.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <PendientesProvider>
        <App />
      </PendientesProvider>
    </HashRouter>
  </React.StrictMode>,
)
