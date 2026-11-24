// Modelo de pendientes.json (esquema 2) y operaciones puras sobre él.
//
// Proyecto = algo concreto con final ("Boda de Axel", "Cambiar foco del baño").
// Tarea = un paso del proyecto. Subtareas = checklist opcional de la tarea.
//
// {
//   "esquema": 2,
//   "version": 7,                 // sube en 1 con cada escritura (app o Claude)
//   "updated_at": "ISO",
//   "updated_by": "app" | "claude",
//   "projects": [{
//     "id", "name", "priority": "alta|media|baja", "color", "created_at",
//     "tasks": [{                  // el orden del arreglo es el orden de los pasos
//       "id", "title", "due_date": "AAAA-MM-DD" | null,
//       "done": false,             // solo cuenta si la tarea NO tiene subtareas
//       "sugerida": true,          // opcional: la propuso Claude, Casta la confirma o borra
//       "last_moved_at", "created_at",
//       "subtasks": [{ "id", "title", "done": false, "sugerida"?: true }]
//     }]
//   }]
// }
//
// La columna del tablero NO se guarda: se calcula (ver estadoTarea).
//   con subtareas: ninguna marcada → backlog; alguna → en_progreso; todas → hecho
//   sin subtareas: done → hecho; si no → backlog
// last_moved_at se actualiza cada vez que se marca/desmarca algo o cambia la columna.
//
// Cada operación recibe los datos y devuelve una copia nueva. Así la misma
// operación se puede reaplicar sobre la versión más reciente de Drive si
// Claude la cambió mientras la app estaba abierta.

const ahora = () => new Date().toISOString()
export const nuevoId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export function estadoTarea(t) {
  const subs = t.subtasks ?? []
  if (subs.length === 0) return t.done ? 'hecho' : 'backlog'
  const hechas = subs.filter((s) => s.done).length
  if (hechas === 0) return 'backlog'
  return hechas === subs.length ? 'hecho' : 'en_progreso'
}

// Primera subtarea sin marcar: lo que frena a la tarea.
export const siguienteSubtarea = (t) => (t.subtasks ?? []).find((s) => !s.done) ?? null

// Siguiente tarea del proyecto: la primera en progreso; si no hay, la primera pendiente.
export function siguienteTarea(p) {
  const activas = p.tasks.filter((t) => estadoTarea(t) !== 'hecho')
  return activas.find((t) => estadoTarea(t) === 'en_progreso') ?? activas[0] ?? null
}

export const proyectoTerminado = (p) => p.tasks.length > 0 && p.tasks.every((t) => estadoTarea(t) === 'hecho')

function conProyecto(datos, projectId, fn) {
  return { ...datos, projects: datos.projects.map((p) => (p.id === projectId ? fn(p) : p)) }
}

// Aplica fn a la tarea; si cambió la columna (o tocar=true) renueva last_moved_at.
function conTarea(datos, projectId, taskId, fn, { tocar = false } = {}) {
  return conProyecto(datos, projectId, (p) => ({
    ...p,
    tasks: p.tasks.map((t) => {
      if (t.id !== taskId) return t
      const nueva = fn(t)
      return tocar || estadoTarea(nueva) !== estadoTarea(t) ? { ...nueva, last_moved_at: ahora() } : nueva
    }),
  }))
}

const sinSugerida = (obj) => {
  const { sugerida, ...resto } = obj // eslint-disable-line no-unused-vars
  return resto
}

export const ops = {
  crearProyecto: ({ name, priority, color }) => (d) => ({
    ...d,
    projects: [...d.projects, { id: nuevoId(), name, priority, color, created_at: ahora(), tasks: [] }],
  }),

  borrarProyecto: (projectId) => (d) => ({ ...d, projects: d.projects.filter((p) => p.id !== projectId) }),

  crearTarea: (projectId, { title, dueDate }) => (d) =>
    conProyecto(d, projectId, (p) => ({
      ...p,
      tasks: [
        ...p.tasks,
        {
          id: nuevoId(),
          title,
          due_date: dueDate || null,
          done: false,
          last_moved_at: ahora(),
          created_at: ahora(),
          subtasks: [],
        },
      ],
    })),

  borrarTarea: (projectId, taskId) => (d) =>
    conProyecto(d, projectId, (p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) })),

  // Para tareas sin subtareas: marcar = pasar a Hecho.
  alternarTarea: (projectId, taskId) => (d) =>
    conTarea(d, projectId, taskId, (t) => sinSugerida({ ...t, done: !t.done }), { tocar: true }),

  agregarSubtarea: (projectId, taskId, title) => (d) =>
    conTarea(d, projectId, taskId, (t) => ({
      ...t,
      subtasks: [...(t.subtasks ?? []), { id: nuevoId(), title, done: false }],
    })),

  alternarSubtarea: (projectId, taskId, subId) => (d) =>
    conTarea(
      d,
      projectId,
      taskId,
      (t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => (s.id === subId ? sinSugerida({ ...s, done: !s.done }) : s)),
      }),
      { tocar: true },
    ),

  borrarSubtarea: (projectId, taskId, subId) => (d) =>
    conTarea(d, projectId, taskId, (t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) })),

  // "Me sirve": quita la marca de sugerida a una tarea (subId null) o subtarea.
  confirmarSugerida: (projectId, taskId, subId = null) => (d) =>
    conTarea(d, projectId, taskId, (t) =>
      subId ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? sinSugerida(s) : s)) } : sinSugerida(t),
    ),
}

const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 }
export const porPrioridad = (a, b) =>
  (ORDEN_PRIORIDAD[a.priority] ?? 9) - (ORDEN_PRIORIDAD[b.priority] ?? 9) ||
  String(a.created_at).localeCompare(String(b.created_at))

// Tolera archivos editados a mano y copias viejas (esquema 1, con "status").
export function normalizar(datos) {
  return {
    esquema: 2,
    version: Number(datos?.version) || 0,
    updated_at: datos?.updated_at ?? null,
    updated_by: datos?.updated_by ?? null,
    projects: (datos?.projects ?? []).map((p) => ({
      priority: 'media',
      color: '#6366f1',
      ...p,
      // eslint-disable-next-line no-unused-vars
      tasks: (p.tasks ?? []).map(({ status, priority, ...t }) => ({
        due_date: null,
        ...t,
        done: t.done ?? status === 'hecho',
        last_moved_at: t.last_moved_at ?? t.created_at ?? new Date().toISOString(),
        subtasks: t.subtasks ?? [],
      })),
    })),
  }
}
