import { useState } from 'react'
import { estadoTarea, ops } from '../lib/datos.js'
import { etiquetaOxidado } from '../utils/oxidado.js'

const ETIQUETA = { backlog: 'Backlog', en_progreso: 'En progreso', hecho: 'Hecho' }
const COLOR = {
  backlog: 'bg-slate-100 text-slate-500',
  en_progreso: 'bg-indigo-100 text-indigo-700',
  hecho: 'bg-emerald-100 text-emerald-700',
}

function Sugerida({ onConfirmar, puedeEditar }) {
  return (
    <button
      onClick={onConfirmar}
      disabled={!puedeEditar}
      title="La sugirió Claude. Tócala para quedártela, o bórrala con ✕."
      className="ml-1 px-1.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 align-middle"
    >
      sugerida
    </button>
  )
}

export default function TareaItem({ projectId, task, puedeEditar, accion }) {
  const [nuevaSub, setNuevaSub] = useState('')
  const [agregando, setAgregando] = useState(false)
  const subs = task.subtasks
  const estado = estadoTarea(task)
  const oxido = estado === 'hecho' ? null : etiquetaOxidado(task.last_moved_at)

  function agregarSub(e) {
    e.preventDefault()
    if (!nuevaSub.trim()) return
    accion(ops.agregarSubtarea(projectId, task.id, nuevaSub.trim()))
    setNuevaSub('')
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-start gap-2">
        {subs.length === 0 ? (
          <input
            type="checkbox"
            checked={task.done}
            disabled={!puedeEditar}
            onChange={() => accion(ops.alternarTarea(projectId, task.id))}
            className="mt-1 w-4 h-4 accent-emerald-600 shrink-0"
          />
        ) : null}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${estado === 'hecho' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {task.title}
            {task.sugerida && (
              <Sugerida puedeEditar={puedeEditar} onConfirmar={() => accion(ops.confirmarSugerida(projectId, task.id))} />
            )}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1 text-[11px]">
            <span className={`px-1.5 rounded ${COLOR[estado]}`}>{ETIQUETA[estado]}</span>
            {task.due_date && <span className="text-slate-500">📅 {task.due_date}</span>}
            {oxido && <span className="text-orange-700">⚠ {oxido}</span>}
          </div>
        </div>
        {puedeEditar && (
          <button
            onClick={() => window.confirm(`¿Borrar "${task.title}"?`) && accion(ops.borrarTarea(projectId, task.id))}
            className="text-slate-300 hover:text-red-500 text-xs px-1"
            title="Borrar tarea"
          >
            ✕
          </button>
        )}
      </div>

      {subs.length > 0 && (
        <ul className="mt-2 ml-1 space-y-1">
          {subs.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={s.done}
                disabled={!puedeEditar}
                onChange={() => accion(ops.alternarSubtarea(projectId, task.id, s.id))}
                className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0"
              />
              <span className={`flex-1 text-sm ${s.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {s.title}
                {s.sugerida && (
                  <Sugerida
                    puedeEditar={puedeEditar}
                    onConfirmar={() => accion(ops.confirmarSugerida(projectId, task.id, s.id))}
                  />
                )}
              </span>
              {puedeEditar && (
                <button
                  onClick={() => accion(ops.borrarSubtarea(projectId, task.id, s.id))}
                  className="text-slate-300 hover:text-red-500 text-xs px-1"
                  title="Borrar subtarea"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeEditar &&
        (agregando ? (
          <form onSubmit={agregarSub} className="mt-2 flex gap-1">
            <input
              autoFocus
              className="flex-1 min-w-0 border border-slate-300 rounded-md px-2 py-1 text-xs"
              value={nuevaSub}
              onChange={(e) => setNuevaSub(e.target.value)}
              onBlur={() => !nuevaSub && setAgregando(false)}
              placeholder="Nueva subtarea"
            />
            <button type="submit" className="text-xs px-2 py-1 rounded-md bg-indigo-600 text-white">
              +
            </button>
          </form>
        ) : (
          <button onClick={() => setAgregando(true)} className="mt-1.5 text-xs text-indigo-600 hover:underline">
            + subtarea
          </button>
        ))}
    </div>
  )
}
