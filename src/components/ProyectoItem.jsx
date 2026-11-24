import { useEffect, useRef, useState } from 'react'
import { estadoTarea, ops, siguienteSubtarea, siguienteTarea } from '../lib/datos.js'
import { claseNivel, nivelOxidadoProyecto } from '../utils/oxidado.js'
import TareaItem from './TareaItem.jsx'

export default function ProyectoItem({ project, abierto, onAlternar, puedeEditar, accion }) {
  const ref = useRef(null)
  const [nuevaTarea, setNuevaTarea] = useState('')
  const total = project.tasks.length
  const hechas = project.tasks.filter((t) => estadoTarea(t) === 'hecho').length
  const sig = siguienteTarea(project)
  const sigSub = sig && siguienteSubtarea(sig)
  const nivel = nivelOxidadoProyecto(project.tasks)

  // Si llegó desde el tablero, lo trae a la vista.
  useEffect(() => {
    if (abierto) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [abierto])

  function agregarTarea(e) {
    e.preventDefault()
    if (!nuevaTarea.trim()) return
    accion(ops.crearTarea(project.id, { title: nuevaTarea.trim() }))
    setNuevaTarea('')
  }

  function borrarProyecto() {
    if (window.confirm(`¿Borrar el proyecto "${project.name}" y todas sus tareas?`)) accion(ops.borrarProyecto(project.id))
  }

  return (
    <div ref={ref} className={`rounded-xl border-2 shadow-sm ${claseNivel(nivel)}`}>
      <button onClick={onAlternar} className="w-full text-left p-3 flex items-start gap-3">
        <span className="w-3 h-3 mt-1.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-slate-800">{project.name}</span>
            <span className="text-xs text-slate-400 shrink-0">
              {hechas}/{total}
            </span>
          </span>
          {!abierto && sig && (
            <span className="block text-sm text-slate-600 mt-0.5">
              → {sig.title}
              {sigSub && <span className="text-slate-400"> · {sigSub.title}</span>}
            </span>
          )}
          {!abierto && !sig && total === 0 && (
            <span className="block text-sm text-slate-400 mt-0.5">Sin tareas todavía</span>
          )}
        </span>
        <span className="text-slate-400 text-sm mt-0.5">{abierto ? '▾' : '▸'}</span>
      </button>

      {abierto && (
        <div className="px-3 pb-3 space-y-2">
          {project.tasks.map((t) => (
            <TareaItem key={t.id} projectId={project.id} task={t} puedeEditar={puedeEditar} accion={accion} />
          ))}

          {puedeEditar && (
            <>
              <form onSubmit={agregarTarea} className="flex gap-2 pt-1">
                <input
                  className="flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                  value={nuevaTarea}
                  onChange={(e) => setNuevaTarea(e.target.value)}
                  placeholder="Nueva tarea…"
                />
                <button
                  type="submit"
                  disabled={!nuevaTarea.trim()}
                  className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white disabled:opacity-40"
                >
                  +
                </button>
              </form>
              <div className="text-right">
                <button onClick={borrarProyecto} className="text-xs text-slate-400 hover:text-red-600">
                  Borrar proyecto
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
