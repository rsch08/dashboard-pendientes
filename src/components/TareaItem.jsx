import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { avanceTarea, estadoTarea, minutosTarea, ops } from '../lib/datos.js'
import { useTimer } from '../lib/TimerContext.jsx'
import { avisoEstancado, avisoFecha } from '../utils/fechas.js'
import Aviso, { Barra } from './Aviso.jsx'

function Sugerida({ onConfirmar, puedeEditar }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onConfirmar()
      }}
      disabled={!puedeEditar}
      title="La sugirió Claude. Tócala para quedártela, o bórrala con ✕."
      className="ml-1 px-1.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 align-middle"
    >
      sugerida
    </button>
  )
}

export default function TareaItem({ projectId, task, esSiguiente, abierta, onAlternar, puedeEditar, accion }) {
  const navigate = useNavigate()
  const timer = useTimer()
  const [nuevaSub, setNuevaSub] = useState('')
  const subs = task.subtasks
  const estado = estadoTarea(task)
  const hecha = estado === 'hecho'
  const hechas = subs.filter((s) => s.done).length
  const enTimer = timer.tarea?.taskId === task.id && timer.corriendo
  const avisos = hecha ? [] : [avisoFecha(task.due_date, true), avisoEstancado(task.last_moved_at)].filter(Boolean)

  function agregarSub(e) {
    e.preventDefault()
    if (!nuevaSub.trim()) return
    accion(ops.agregarSubtarea(projectId, task.id, nuevaSub.trim()))
    setNuevaSub('')
  }

  function pomodoro() {
    timer.elegirTarea({ projectId, taskId: task.id })
    navigate('/')
  }

  return (
    <div className={`rounded-lg border ${esSiguiente && !hecha ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
      <div className="flex items-start gap-2 p-2.5">
        {subs.length === 0 && (
          <input
            type="checkbox"
            checked={task.done}
            disabled={!puedeEditar}
            onChange={() => accion(ops.alternarTarea(projectId, task.id))}
            className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0"
          />
        )}
        <button onClick={onAlternar} className="flex-1 min-w-0 text-left">
          <span className={`text-sm font-medium tachable ${hecha ? 'tachado text-slate-400' : 'text-slate-800'}`}>
            {task.title}
          </span>
          {task.sugerida && (
            <Sugerida puedeEditar={puedeEditar} onConfirmar={() => accion(ops.confirmarSugerida(projectId, task.id))} />
          )}
          {enTimer && <span className="ml-1 text-[10px] font-medium text-indigo-700">⏱ en pomodoro</span>}
          {!enTimer && esSiguiente && !hecha && (
            <span className="ml-1 text-[10px] font-medium text-indigo-600">{estado === 'en_progreso' ? '● en curso' : '→ siguiente'}</span>
          )}
          {subs.length > 0 && (
            <span className="flex items-center gap-2 mt-1">
              <Barra valor={avanceTarea(task)} className="flex-1" />
              <span className="text-[11px] text-slate-400">
                {hechas}/{subs.length}
              </span>
            </span>
          )}
          {avisos.length > 0 && (
            <span className="flex flex-wrap gap-1 mt-1">
              {avisos.map((a) => (
                <Aviso key={a.texto} aviso={a} />
              ))}
            </span>
          )}
        </button>
        <button onClick={onAlternar} className="text-slate-400 text-xs mt-0.5 px-1">
          {abierta ? '▾' : '▸'}
        </button>
      </div>

      {abierta && (
        <div className="px-2.5 pb-2.5">
          {subs.length > 0 && (
            <ul className="ml-1 space-y-1">
              {subs.map((s) => (
                <li key={s.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={s.done}
                    disabled={!puedeEditar}
                    onChange={() => accion(ops.alternarSubtarea(projectId, task.id, s.id))}
                    className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0"
                  />
                  <span className={`flex-1 text-sm tachable ${s.done ? 'tachado text-slate-400' : 'text-slate-700'}`}>
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

          {puedeEditar && (
            <form onSubmit={agregarSub} className="mt-2 flex gap-1">
              <input
                className="flex-1 min-w-0 border border-slate-300 rounded-md px-2 py-1 text-xs bg-white"
                value={nuevaSub}
                onChange={(e) => setNuevaSub(e.target.value)}
                placeholder="Nueva subtarea…"
              />
              <button type="submit" disabled={!nuevaSub.trim()} className="text-xs px-2 py-1 rounded-md bg-indigo-600 text-white disabled:opacity-40">
                +
              </button>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
            {!hecha && (
              <button onClick={pomodoro} className="px-2 py-1 rounded-md bg-indigo-600 text-white">
                ▶ Pomodoro
              </button>
            )}
            {minutosTarea(task) > 0 && <span>⏱ {minutosTarea(task)} min</span>}
            {puedeEditar && (
              <>
                <label className="flex items-center gap-1">
                  Límite
                  <input
                    type="date"
                    value={task.due_date ?? ''}
                    onChange={(e) => accion(ops.editarTarea(projectId, task.id, { due_date: e.target.value || null }))}
                    className="border border-slate-300 rounded-md px-1.5 py-0.5 bg-white"
                  />
                </label>
                <button
                  onClick={() => window.confirm(`¿Borrar "${task.title}"?`) && accion(ops.borrarTarea(projectId, task.id))}
                  className="ml-auto text-slate-400 hover:text-red-600"
                >
                  Borrar tarea
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
