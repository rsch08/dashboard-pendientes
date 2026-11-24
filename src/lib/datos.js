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
//     "id", "name", "color", "created_at",
//     "fecha": "AAAA-MM-DD" | null,   // para cuándo espero resolverlo (ordena la lista)
//     "fecha_limite": false,          // true = deadline duro, no se puede mover
//     "tasks": [{                  // el orden del arreglo es el orden de los pasos
//       "id", "title", "due_date": "AAAA-MM-DD" | null,
//       "done": false,             // solo cuenta si la tarea NO tiene subtareas
//       "sugerida": true,          // opcional: la propuso Claude, Casta la confirma o borra
//       "pomodoros": [{ "at": "ISO", "min": 25 }],  // tiempo dedicado con el timer
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
  crearProyecto: ({ name, color, fecha, fechaLimite }) => (d) => ({
    ...d,
    projects: [
      ...d.projects,
      { id: nuevoId(), name, color, fecha: fecha || null, fecha_limite: !!fechaLimite, created_at: ahora(), tasks: [] },
    ],
  }),

  // campos: { fecha, fecha_limite, name }
  editarProyecto: (projectId, campos) => (d) => conProyecto(d, projectId, (p) => ({ ...p, ...campos })),

  // campos: { due_date, title }
  editarTarea: (projectId, taskId, campos) => (d) => conTarea(d, projectId, taskId, (t) => ({ ...t, ...campos })),

  // Un pomodoro terminado cuenta como movimiento (quita lo oxidado).
  registrarPomodoro: (projectId, taskId, min) => (d) =>
    conTarea(d, projectId, taskId, (t) => ({ ...t, pomodoros: [...(t.pomodoros ?? []), { at: ahora(), min }] }), {
      tocar: true,
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

// Avance de 0 a 1: cada tarea pesa igual; las que tienen subtareas cuentan su fracción.
export function avanceTarea(t) {
  const subs = t.subtasks ?? []
  if (subs.length === 0) return t.done ? 1 : 0
  return subs.filter((s) => s.done).length / subs.length
}
export const avanceProyecto = (p) =>
  p.tasks.length === 0 ? 0 : p.tasks.reduce((a, t) => a + avanceTarea(t), 0) / p.tasks.length

export const minutosTarea = (t) => (t.pomodoros ?? []).reduce((a, x) => a + (x.min || 0), 0)

// Fecha que manda para ordenar: la del proyecto o, si no tiene, la fecha más
// próxima de sus tareas pendientes.
export function fechaEfectiva(p) {
  if (p.fecha) return p.fecha
  const fechas = p.tasks
    .filter((t) => estadoTarea(t) !== 'hecho' && t.due_date)
    .map((t) => t.due_date)
    .sort()
  return fechas[0] ?? null
}

// Orden de la lista: primero lo que tiene fecha (más próxima arriba); luego lo
// que no tiene fecha, con lo más estancado arriba.
export function ordenProyectos(a, b) {
  const fa = fechaEfectiva(a)
  const fb = fechaEfectiva(b)
  if (fa && fb) return fa.localeCompare(fb) || Number(!!b.fecha_limite) - Number(!!a.fecha_limite)
  if (fa) return -1
  if (fb) return 1
  return masViejo(a).localeCompare(masViejo(b))
}
function masViejo(p) {
  const activas = p.tasks.filter((t) => estadoTarea(t) !== 'hecho').map((t) => t.last_moved_at)
  return activas.sort()[0] ?? '9999'
}

// Tolera archivos editados a mano y copias viejas (esquema 1, con "status").
export function normalizar(datos) {
  return {
    esquema: 2,
    version: Number(datos?.version) || 0,
    updated_at: datos?.updated_at ?? null,
    updated_by: datos?.updated_by ?? null,
    // eslint-disable-next-line no-unused-vars
    projects: (datos?.projects ?? []).map(({ priority, ...p }) => ({
      color: '#6366f1',
      fecha: null,
      fecha_limite: false,
      ...p,
      // eslint-disable-next-line no-unused-vars
      tasks: (p.tasks ?? []).map(({ status, priority, ...t }) => ({
        due_date: null,
        ...t,
        done: t.done ?? status === 'hecho',
        last_moved_at: t.last_moved_at ?? t.created_at ?? new Date().toISOString(),
        subtasks: t.subtasks ?? [],
        pomodoros: t.pomodoros ?? [],
      })),
    })),
  }
}
