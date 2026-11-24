import { porPrioridad } from '../lib/datos.js'
import TaskCard from './TaskCard.jsx'

const COLUMNAS = [
  { key: 'por_hacer', label: 'Por hacer' },
  { key: 'en_progreso', label: 'En progreso' },
  { key: 'hecho', label: 'Hecho' },
]

export default function KanbanBoard({ tasks, ...acciones }) {
  const principales = [...tasks].sort(porPrioridad)

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {COLUMNAS.map((col) => {
        const tareasColumna = principales.filter((t) => t.status === col.key)
        return (
          <div key={col.key} className="bg-slate-50 rounded-xl p-3">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center justify-between">
              {col.label}
              <span className="text-xs font-normal text-slate-400">{tareasColumna.length}</span>
            </h3>
            <div className="space-y-2">
              {tareasColumna.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  {...acciones}
                />
              ))}
              {tareasColumna.length === 0 && (
                <p className="text-xs text-slate-400 italic">Sin tareas</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
