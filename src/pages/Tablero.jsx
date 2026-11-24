import { useNavigate } from 'react-router-dom'
import { usePendientes } from '../lib/PendientesContext.jsx'
import { estadoTarea, siguienteSubtarea } from '../lib/datos.js'
import { claseOxidado } from '../utils/oxidado.js'
import { avisoEstancado, avisoFecha } from '../utils/fechas.js'
import Aviso from '../components/Aviso.jsx'

// Tablero de TAREAS de todos los proyectos. En el celular "En progreso" va
// primero (es lo que se está trabajando). Las tarjetas se mueven solas
// según sus subtareas (ver estadoTarea en datos.js).
const COLUMNAS = [
  { key: 'backlog', label: 'Backlog', ayuda: 'Sin empezar. Arriba: lo que tiene fecha más próxima y lo más oxidado.' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'hecho', label: 'Hecho' },
]
const MAX_HECHAS = 15

// Fecha que aplica a la tarjeta: la de la tarea o, si no tiene, la del proyecto.
const fechaDe = ({ task, project }) => task.due_date ?? project.fecha ?? null
// Primero lo que tiene fecha (más próxima arriba), luego lo más oxidado.
function urgencia(a, b) {
  const fa = fechaDe(a)
  const fb = fechaDe(b)
  if (fa && fb) return fa.localeCompare(fb)
  if (fa) return -1
  if (fb) return 1
  return a.task.last_moved_at.localeCompare(b.task.last_moved_at)
}

function Tarjeta({ project, task, estado, onAbrir }) {
  const sigSub = estado === 'hecho' ? null : siguienteSubtarea(task)
  const fecha = task.due_date
    ? { f: task.due_date, limite: true }
    : project.fecha
      ? { f: project.fecha, limite: project.fecha_limite }
      : null
  const avisos = estado === 'hecho' ? [] : [fecha && avisoFecha(fecha.f, fecha.limite), avisoEstancado(task.last_moved_at)].filter(Boolean)
  const clases = estado === 'hecho' ? 'bg-white border-slate-200 opacity-70' : claseOxidado(task.last_moved_at)
  return (
    <button onClick={onAbrir} className={`w-full text-left rounded-lg border-2 p-2.5 shadow-sm ${clases}`}>
      <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        <span className="truncate">{project.name}</span>
      </span>
      <span className={`block font-semibold mt-0.5 ${estado === 'hecho' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
        {task.title}
      </span>
      {sigSub && <span className="block text-xs text-slate-600 mt-1">Siguiente: {sigSub.title}</span>}
      {avisos.length > 0 && (
        <span className="flex flex-wrap gap-1 mt-1.5">
          {avisos.map((a) => (
            <Aviso key={a.texto} aviso={a} />
          ))}
        </span>
      )}
    </button>
  )
}

export default function Tablero() {
  const { datos, estado } = usePendientes()
  const navigate = useNavigate()

  const tarjetas = (datos?.projects ?? []).flatMap((project) =>
    project.tasks.map((task) => ({ project, task, estado: estadoTarea(task) })),
  )
  const porColumna = {
    backlog: tarjetas
      .filter((c) => c.estado === 'backlog')
      .sort(urgencia),
    en_progreso: tarjetas
      .filter((c) => c.estado === 'en_progreso')
      .sort(urgencia),
    hecho: tarjetas
      .filter((c) => c.estado === 'hecho')
      .sort((a, b) => b.task.last_moved_at.localeCompare(a.task.last_moved_at))
      .slice(0, MAX_HECHAS),
  }

  if (!datos) {
    return (
      <p className="max-w-5xl mx-auto px-4 py-4 text-slate-500">
        {estado === 'cargando' ? 'Cargando…' : 'Toca "Conectar" arriba para leer tus pendientes.'}
      </p>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 grid gap-4 sm:grid-cols-3">
      {COLUMNAS.map((col) => (
        <section key={col.key} className={`bg-slate-200/60 rounded-xl p-2.5 ${col.key === 'en_progreso' ? 'order-first sm:order-none' : ''}`}>
          <h2 className="text-sm font-semibold text-slate-600 flex justify-between px-1">
            {col.label}
            <span className="font-normal text-slate-400">{porColumna[col.key].length}</span>
          </h2>
          {col.ayuda && <p className="text-[11px] text-slate-400 px-1">{col.ayuda}</p>}
          <div className="space-y-2 mt-2">
            {porColumna[col.key].map((c) => (
              <Tarjeta key={c.task.id} {...c} onAbrir={() => navigate(`/proyectos?p=${c.project.id}&t=${c.task.id}`)} />
            ))}
            {porColumna[col.key].length === 0 && <p className="text-xs text-slate-400 italic px-1">Nada aquí</p>}
          </div>
        </section>
      ))}
    </div>
  )
}
