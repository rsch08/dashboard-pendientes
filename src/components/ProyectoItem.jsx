import { useEffect, useRef, useState } from 'react'
import { avanceProyecto, ops, proyectoTerminado, siguienteSubtarea, siguienteTarea } from '../lib/datos.js'
import { avisosProyecto } from '../utils/fechas.js'
import Aviso, { Barra } from './Aviso.jsx'
import TareaItem from './TareaItem.jsx'

export default function ProyectoItem({
  project,
  abierto,
  tareaInicial,
  onAlternar,
  retenido,
  saliendo,
  puedeEditar,
  accion,
}) {
  const ref = useRef(null)
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [tareaAbierta, setTareaAbierta] = useState(tareaInicial)
  const sig = siguienteTarea(project)
  const sigSub = sig && siguienteSubtarea(sig)
  const avisos = avisosProyecto(project)

  useEffect(() => {
    if (tareaInicial) setTareaAbierta(tareaInicial)
  }, [tareaInicial])

  // Recién terminado: se cierra (y baja a Terminados) al tocar fuera de él.
  useEffect(() => {
    if (!retenido) return
    const fuera = (e) => {
      if (!ref.current?.contains(e.target)) onAlternar()
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [retenido, onAlternar])

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
    <div
      ref={ref}
      className={`rounded-xl border shadow-sm transition-colors duration-500 ${
        retenido || saliendo ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
      } ${saliendo ? 'animate-salir' : ''}`}
    >
      <button onClick={onAlternar} className="w-full text-left p-3 flex items-start gap-3">
        <span className="w-3 h-3 mt-1.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-slate-800">
            {project.name}
            {proyectoTerminado(project) && (retenido || saliendo) && (
              <span className="ml-2 text-xs font-medium text-emerald-700 animate-aparecer inline-block">✓ ¡Terminado!</span>
            )}
          </span>
          {sig && (
            <span className="block text-sm text-slate-600 mt-0.5">
              → {sig.title}
              {sigSub && <span className="text-slate-400"> · {sigSub.title}</span>}
            </span>
          )}
          {project.tasks.length === 0 && <span className="block text-sm text-slate-400 mt-0.5">Sin tareas todavía</span>}
          {avisos.length > 0 && (
            <span className="flex flex-wrap gap-1 mt-1.5">
              {avisos.map((a) => (
                <Aviso key={a.texto} aviso={a} />
              ))}
            </span>
          )}
          {avanceProyecto(project) > 0 && <Barra valor={avanceProyecto(project)} className="mt-2" />}
        </span>
        <span className="text-slate-400 text-sm mt-0.5">{abierto ? '▾' : '▸'}</span>
      </button>

      {abierto && (
        <div className="px-3 pb-3 space-y-1.5">
          {project.tasks.map((t) => (
            <TareaItem
              key={t.id}
              projectId={project.id}
              task={t}
              esSiguiente={sig?.id === t.id}
              abierta={tareaAbierta === t.id}
              onAlternar={() => setTareaAbierta((x) => (x === t.id ? null : t.id))}
              puedeEditar={puedeEditar}
              accion={accion}
            />
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
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500">
                <span>¿Para cuándo?</span>
                <input
                  type="date"
                  value={project.fecha ?? ''}
                  onChange={(e) => accion(ops.editarProyecto(project.id, { fecha: e.target.value || null }))}
                  className="border border-slate-300 rounded-md px-1.5 py-0.5"
                />
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!!project.fecha_limite}
                    onChange={(e) => accion(ops.editarProyecto(project.id, { fecha_limite: e.target.checked }))}
                  />
                  es fecha límite
                </label>
                <button onClick={borrarProyecto} className="ml-auto text-slate-400 hover:text-red-600">
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
