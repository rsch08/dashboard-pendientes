import { NavLink, Route, Routes } from 'react-router-dom'
import Hoy from './pages/Hoy.jsx'
import Tablero from './pages/Tablero.jsx'
import BarraSync from './components/BarraSync.jsx'

const pestaña = ({ isActive }) =>
  `flex-1 text-center py-2 text-sm font-medium border-b-2 ${
    isActive ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
  }`

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-white">
        <BarraSync />
        <nav className="border-b border-slate-200 flex max-w-2xl mx-auto">
        <NavLink to="/" end className={pestaña}>
          Hoy
        </NavLink>
        <NavLink to="/tablero" className={pestaña}>
          Tablero
        </NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Hoy />} />
        <Route path="/tablero" element={<Tablero />} />
        <Route path="*" element={<Hoy />} />
      </Routes>
    </>
  )
}
