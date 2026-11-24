import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePendientes } from '../lib/PendientesContext.jsx'
import { nuevoId, ops } from '../lib/datos.js'
import KanbanBoard from '../components/KanbanBoard.jsx'
import NewTaskForm from '../components/NewTaskForm.jsx'
import TrocearModal from '../components/TrocearModal.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'

export default function ProjectView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { datos, estado, mutar } = usePendientes()
  const [tareaATrocear, setTareaATrocear] = useState(null)
  const project = datos?.projects.find((p) => p.id === projectId)
  const puedeEditar = estado === 'listo' || estado === 'guardando'

  // Las acciones se ignoran si no hay conexión (la barra de arriba lo indica).
  const accion = (op) => (puedeEditar ? mutar(op).catch(() => {}) : undefined)

  async function crearTarea({ title, priority, dueDate }) {
    const id = nuevoId()
    await mutar(ops.crearTarea(projectId, { id, title, priority, dueDate }))
    return { id, title }
  }

  async function borrarProyecto() {
    if (!window.confirm(`¿Borrar el proyecto "${project.name}" y todas sus tareas?`)) return
    await mutar(ops.borrarProyecto(projectId))
    navigate('/')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        ← Todos los proyectos
      </Link>

      {!project && <p className="text-slate-500 mt-4">{datos ? 'Este proyecto ya no existe.' : 'Cargando…'}</p>}

      {project && (
        <>
          <div className="flex items-center gap-3 mt-2 mb-6">
            <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <h1 className="text-2xl font-bold text-slate-800 min-w-0 truncate">{project.name}</h1>
            <PriorityBadge priority={project.priority} />
            {puedeEditar && (
              <button onClick={borrarProyecto} className="ml-auto text-xs text-slate-400 hover:text-red-600">
                Borrar proyecto
              </button>
            )}
          </div>

          {puedeEditar && (
            <div className="mb-6 max-w-md">
              <NewTaskForm onCreate={crearTarea} onCreatedGrande={(t) => setTareaATrocear(t)} />
            </div>
          )}

          <KanbanBoard
            tasks={project.tasks}
            onUpdateStatus={(taskId, status) => accion(ops.moverTarea(projectId, taskId, status))}
            onDelete={(taskId) => accion(ops.borrarTarea(projectId, taskId))}
            onAddSubtask={(taskId, title) => accion(ops.agregarSubtareas(projectId, taskId, [title]))}
            onToggleSubtask={(taskId, subId) => accion(ops.alternarSubtarea(projectId, taskId, subId))}
            onDeleteSubtask={(taskId, subId) => accion(ops.borrarSubtarea(projectId, taskId, subId))}
          />
        </>
      )}

      {tareaATrocear && (
        <TrocearModal
          task={tareaATrocear}
          onClose={() => setTareaATrocear(null)}
          onSave={(titulos) => mutar(ops.agregarSubtareas(projectId, tareaATrocear.id, titulos))}
        />
      )}
    </div>
  )
}
