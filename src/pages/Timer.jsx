import { useEffect, useState } from 'react'
import { usePendientes } from '../lib/PendientesContext.jsx'
import { MIN, mmss, useTimer } from '../lib/TimerContext.jsx'
import { avanceTarea, estadoTarea, minutosTarea, ordenProyectos, siguienteSubtarea, siguienteTarea } from '../lib/datos.js'
import { pipDisponible } from '../lib/pip.js'
import { Barra } from '../components/Aviso.jsx'

const hoyLocal = () => new Date().toLocaleDateString('en-CA')

export default function Timer() {
  const { datos } = usePendientes()
  const timer = useTimer()
  const [errorPip, setErrorPip] = useState(null)
  const proyectos = [...(datos?.projects ?? [])].sort(ordenProyectos)

  const elegido = timer.tarea
  const project = elegido && proyectos.find((p) => p.id === elegido.projectId)
  const task = project?.tasks.find((t) => t.id === elegido.taskId)

  // Sin tarea elegida: propone la siguiente del primer proyecto de la lista.
  useEffect(() => {
    if (!datos || task) return
    for (const p of proyectos) {
      const sig = siguienteTarea(p)
      if (sig) return timer.elegirTarea({ projectId: p.id, taskId: sig.id })
    }
  }, [datos, task]) // eslint-disable-line react-hooks/exhaustive-deps

  const sigSub = task && siguienteSubtarea(task)
  const pomosHoy = proyectos
    .flatMap((p) => p.tasks.flatMap((t) => t.pomodoros ?? []))
    .filter((x) => new Date(x.at).toLocaleDateString('en-CA') === hoyLocal()).length
  const total = MIN[timer.modo] * 60000
  const avance = 1 - timer.restanteMs / total
  const descanso = timer.modo === 'descanso'

  async function flotante() {
    setErrorPip(null)
    try {
      await timer.flotante()
    } catch (e) {
      setErrorPip(`No se pudo abrir la ventana flotante (${e.message}).`)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4">
      <label className="block text-xs font-medium text-slate-500 mb-1">¿En qué vas a trabajar?</label>
      <select
        className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
        value={task ? `${project.id}|${task.id}` : ''}
        onChange={(e) => {
          const [projectId, taskId] = e.target.value.split('|')
          timer.elegirTarea(taskId ? { projectId, taskId } : null)
        }}
      >
        <option value="">Elige una tarea…</option>
        {proyectos.map((p) => {
          const activas = p.tasks.filter((t) => estadoTarea(t) !== 'hecho')
          if (activas.length === 0) return null
          return (
            <optgroup key={p.id} label={p.name}>
              {activas.map((t) => (
                <option key={t.id} value={`${p.id}|${t.id}`}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>

      {task && (
        <div className="mt-3 bg-white rounded-xl border border-slate-200 p-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
            {project.name}
          </p>
          <p className="font-semibold text-slate-800 mt-0.5">{task.title}</p>
          {sigSub && <p className="text-sm text-slate-600 mt-0.5">Siguiente: {sigSub.title}</p>}
          {task.subtasks.length > 0 && <Barra valor={avanceTarea(task)} className="mt-2" />}
          <p className="text-[11px] text-slate-400 mt-1.5">
            Tiempo dedicado: {minutosTarea(task)} min ({(task.pomodoros ?? []).length} pomodoros)
          </p>
        </div>
      )}

      <div
        className={`mt-4 rounded-2xl p-6 text-center text-white ${descanso ? 'bg-emerald-700' : 'bg-indigo-900'}`}
      >
        <div className="flex justify-center gap-2 text-xs">
          {['enfoque', 'descanso'].map((m) => (
            <button
              key={m}
              onClick={() => timer.cambiarModo(m)}
              className={`px-3 py-1 rounded-full ${timer.modo === m ? 'bg-white/25' : 'bg-white/5 text-white/70'}`}
            >
              {m === 'enfoque' ? `Enfoque ${MIN.enfoque}` : `Descanso ${MIN.descanso}`}
            </button>
          ))}
        </div>
        <p className="text-7xl font-bold tabular-nums mt-4">{mmss(timer.restanteMs)}</p>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-white/80" style={{ width: `${Math.round(avance * 100)}%` }} />
        </div>
        <div className="flex justify-center gap-3 mt-5">
          {timer.corriendo ? (
            <button onClick={timer.pausar} className="px-8 py-3 rounded-xl bg-white text-slate-900 font-semibold">
              Pausar
            </button>
          ) : (
            <button onClick={timer.iniciar} className="px-8 py-3 rounded-xl bg-white text-slate-900 font-semibold">
              {timer.restanteMs < total ? 'Seguir' : 'Iniciar'}
            </button>
          )}
          <button onClick={timer.reiniciar} className="px-4 py-3 rounded-xl bg-white/15" title="Reiniciar">
            ↺
          </button>
        </div>
      </div>

      {pipDisponible() && (
        <button
          onClick={flotante}
          className="mt-3 w-full py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-700"
        >
          ⧉ Ventana flotante
        </button>
      )}
      {errorPip && <p className="text-xs text-red-600 mt-1">{errorPip}</p>}

      <p className="text-center text-xs text-slate-500 mt-4">Hoy llevas {pomosHoy} pomodoro{pomosHoy === 1 ? '' : 's'}.</p>
      {!task && !timer.corriendo && (
        <p className="text-center text-xs text-slate-400 mt-1">Si no eliges tarea, el tiempo no se registra.</p>
      )}
    </div>
  )
}
