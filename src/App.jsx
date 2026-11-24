import { Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import ProjectView from './pages/ProjectView.jsx'
import BarraSync from './components/BarraSync.jsx'

export default function App() {
  return (
    <>
      <BarraSync />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:projectId" element={<ProjectView />} />
      </Routes>
    </>
  )
}
