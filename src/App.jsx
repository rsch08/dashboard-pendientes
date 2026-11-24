import { NavLink, Route, Routes } from 'react-router-dom'
import Timer from './pages/Timer.jsx'
import Proyectos from './pages/Proyectos.jsx'
import Tablero from './pages/Tablero.jsx'
import BarraSync from './components/BarraSync.jsx'
import { mmss, useTimer } from './lib/TimerContext.jsx'

const ICONOS = {
  timer: (
    <path d="M12 8v4l2.5 2.5M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
  ),
  proyectos: <path d="M4 6h16M4 12h16M4 18h10" />,
  tablero: <path d="M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v6h-4z" />,
}

function Pestaña({ to, icono, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-indigo-700' : 'text-slate-500'}`
      }
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {ICONOS[icono]}
      </svg>
      {children}
    </NavLink>
  )
}

export default function App() {
  const timer = useTimer()
  return (
    <>
      <header className="sticky top-0 z-40">
        <BarraSync />
      </header>
      <main className="pb-24">
        <Routes>
          <Route path="/" element={<Timer />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/tablero" element={<Tablero />} />
          <Route path="*" element={<Timer />} />
        </Routes>
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex">
          <Pestaña to="/" icono="timer">
            {timer.corriendo ? mmss(timer.restanteMs) : 'Timer'}
          </Pestaña>
          <Pestaña to="/proyectos" icono="proyectos">
            Proyectos
          </Pestaña>
          <Pestaña to="/tablero" icono="tablero">
            Tablero
          </Pestaña>
        </div>
      </nav>
    </>
  )
}
