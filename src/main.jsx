import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { PendientesProvider } from './lib/PendientesContext.jsx'
import { TimerProvider } from './lib/TimerContext.jsx'
import './index.css'

// Cuando se publica una versión nueva, el service worker la toma y la página se
// recarga sola (si no, el celular seguía mostrando la versión vieja).
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let recargando = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) return
    recargando = true
    window.location.reload()
  })
}

// HashRouter: las rutas viven después de "#", así Vercel no necesita
// reglas de reescritura y la PWA abre bien sin conexión.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <PendientesProvider>
        <TimerProvider>
          <App />
        </TimerProvider>
      </PendientesProvider>
    </HashRouter>
  </React.StrictMode>,
)
