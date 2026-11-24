// Modelo de pendientes.json y operaciones puras sobre él.
//
// {
//   "esquema": 1,
//   "version": 7,                 // sube en 1 con cada escritura (app o Claude)
//   "updated_at": "ISO",
//   "updated_by": "app" | "claude",
//   "projects": [{
//     "id", "name", "priority": "alta|media|baja", "color", "created_at",
//     "tasks": [{
//       "id", "title", "status": "por_hacer|en_progreso|hecho",
//       "priority", "due_date": "AAAA-MM-DD" | null,
//       "last_moved_at", "created_at",
//       "subtasks": [{ "id", "title", "done": false }]
//     }]
//   }]
// }
//
// Cada operación recibe los datos y devuelve una copia nueva. Así la misma
// operación se puede reaplicar sobre la versión más reciente de Drive si
// Claude la cambió mientras la app estaba abierta.

const ahora = () => new Date().toISOString()
const nuevoId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

function conProyecto(datos, projectId, fn) {
  return { ...datos, projects: datos.projects.map((p) => (p.id === projectId ? fn(p) : p)) }
}

function conTarea(datos, projectId, taskId, fn) {
  return conProyecto(datos, projectId, (p) => ({
    ...p,
    tasks: p.tasks.map((t) => (t.id === taskId ? fn(t) : t)),
  }))
}

export const ops = {
  crearProyecto: ({ name, priority, color }) => (d) => ({
    ...d,
    projects: [...d.projects, { id: nuevoId(), name, priority, color, created_at: ahora(), tasks: [] }],
  }),

  borrarProyecto: (projectId) => (d) => ({ ...d, projects: d.projects.filter((p) => p.id !== projectId) }),

  crearTarea: (projectId, { id = nuevoId(), title, priority, dueDate, subtasks = [] }) => (d) =>
    conProyecto(d, projectId, (p) => ({
      ...p,
      tasks: [
        ...p.tasks,
        {
          id,
          title,
          status: 'por_hacer',
          priority,
          due_date: dueDate || null,
          last_moved_at: ahora(),
          created_at: ahora(),
          subtasks: subtasks.map((s) => ({ id: nuevoId(), title: s, done: false })),
        },
      ],
    })),

  moverTarea: (projectId, taskId, status) => (d) =>
    conTarea(d, projectId, taskId, (t) => (t.status === status ? t : { ...t, status, last_moved_at: ahora() })),

  borrarTarea: (projectId, taskId) => (d) =>
    conProyecto(d, projectId, (p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) })),

  agregarSubtareas: (projectId, taskId, titulos) => (d) =>
    conTarea(d, projectId, taskId, (t) => ({
      ...t,
      subtasks: [...(t.subtasks ?? []), ...titulos.map((title) => ({ id: nuevoId(), title, done: false }))],
    })),

  alternarSubtarea: (projectId, taskId, subId) => (d) =>
    conTarea(d, projectId, taskId, (t) => ({
      ...t,
      subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
    })),

  borrarSubtarea: (projectId, taskId, subId) => (d) =>
    conTarea(d, projectId, taskId, (t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) })),
}

export { nuevoId }

const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 }
export const porPrioridad = (a, b) =>
  (ORDEN_PRIORIDAD[a.priority] ?? 9) - (ORDEN_PRIORIDAD[b.priority] ?? 9) ||
  String(a.created_at).localeCompare(String(b.created_at))

// Tolera archivos editados a mano: rellena campos faltantes.
export function normalizar(datos) {
  return {
    esquema: datos?.esquema ?? 1,
    version: Number(datos?.version) || 0,
    updated_at: datos?.updated_at ?? null,
    updated_by: datos?.updated_by ?? null,
    projects: (datos?.projects ?? []).map((p) => ({
      priority: 'media',
      color: '#6366f1',
      ...p,
      tasks: (p.tasks ?? []).map((t) => ({
        status: 'por_hacer',
        priority: 'media',
        due_date: null,
        ...t,
        last_moved_at: t.last_moved_at ?? t.created_at ?? new Date().toISOString(),
        subtasks: t.subtasks ?? [],
      })),
    })),
  }
}
