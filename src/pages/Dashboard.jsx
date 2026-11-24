import { useState } from 'react'
import { usePendientes } from '../lib/PendientesContext.jsx'
import { ops, porPrioridad } from '../lib/datos.js'
import ProjectCard from '../components/ProjectCard.jsx'
import NewProjectModal from '../components/NewProjectModal.jsx'

export default function Dashboard() {
  const { datos, estado, mutar } = usePendientes()
  const [showModal, setShowModal] = useState(false)
  const projects = [...(datos?.projects ?? [])].sort(porPrioridad)
  const puedeEditar = estado === 'listo' || estado === 'guardando'

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mis pendientes</h1>
        <button
          onClick={() => setShowModal(true)}
          disabled={!puedeEditar}
          className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          + Nuevo proyecto
        </button>
      </div>

      {!datos && estado === 'cargando' && <p className="text-slate-500">Cargando…</p>}
      {!datos && estado !== 'cargando' && (
        <p className="text-slate-500">Toca "Conectar" arriba para leer tus pendientes de Google Drive.</p>
      )}
      {datos && projects.length === 0 && (
        <p className="text-slate-500">Todavía no hay proyectos. Crea el primero para empezar.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} tasks={project.tasks} />
        ))}
      </div>

      {showModal && (
        <NewProjectModal onClose={() => setShowModal(false)} onCreate={(p) => mutar(ops.crearProyecto(p))} />
      )}
    </div>
  )
}
