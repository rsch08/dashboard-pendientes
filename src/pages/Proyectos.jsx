import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePendientes } from '../lib/PendientesContext.jsx'
import { ops, ordenProyectos, proyectoTerminado } from '../lib/datos.js'
import ProyectoItem from '../components/ProyectoItem.jsx'
import NewProjectModal from '../components/NewProjectModal.jsx'

// Un renglón por proyecto con su siguiente paso, ordenados por fecha (lo más
// próximo arriba; sin fecha, lo más estancado arriba). Al tocar un proyecto se
// expande con sus tareas; al tocar una tarea, con sus subtareas.
export default function Proyectos() {
  const { datos, estado, mutar, puedeEditar } = usePendientes()
  const [params, setParams] = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [verTerminados, setVerTerminados] = useState(false)
  const abierto = params.get('p')
  const tareaAbierta = params.get('t')

  // Un proyecto que se termina mientras está abierto se queda en su lugar
  // (retenido) hasta que se cierra o se toca en otro lado; luego se va con
  // una animación (saliendo) a "Terminados", para no perderlo de vista.
  const [retenido, setRetenido] = useState(null)
  const [saliendo, setSaliendo] = useState(null)
  const [destello, setDestello] = useState(false)
  const activosAntes = useRef(new Set())
  const ordenAntes = useRef([])

  const todos = [...(datos?.projects ?? [])].sort(ordenProyectos)
  // Recién terminado en este cambio (se calcula aquí para no perder su lugar ni un cuadro).
  const recien = todos.find((p) => proyectoTerminado(p) && activosAntes.current.has(p.id) && p.id === abierto)
  const fijo = (p) => p.id === retenido || p.id === saliendo || p.id === recien?.id
  const visibleArriba = (p) => !proyectoTerminado(p) || fijo(p)
  // El proyecto retenido conserva su lugar (al terminarse cambiaría su orden).
  const activos = todos.filter((p) => visibleArriba(p) && !fijo(p))
  for (const p of todos.filter(fijo)) {
    const i = ordenAntes.current.indexOf(p.id)
    activos.splice(i < 0 ? activos.length : Math.min(i, activos.length), 0, p)
  }
  const terminados = todos.filter((p) => !visibleArriba(p))
  useEffect(() => {
    ordenAntes.current = activos.map((p) => p.id)
  })

  useEffect(() => {
    if (recien && recien.id !== retenido) setRetenido(recien.id)
    activosAntes.current = new Set(activos.map((p) => p.id))
  })

  useEffect(() => {
    if (!retenido || abierto === retenido) return
    setRetenido(null)
    setSaliendo(retenido)
    // Sin limpieza: los timers deben correr aunque cambie el estado de arriba.
    setTimeout(() => {
      setSaliendo(null)
      setDestello(true)
    }, 650)
    setTimeout(() => setDestello(false), 2600)
  }, [abierto, retenido])

  const alternar = (id) => setParams(abierto === id ? {} : { p: id }, { replace: true })
  const accion = (op) => (puedeEditar ? mutar(op).catch(() => {}) : undefined)

  const item = (p) => (
    <ProyectoItem
      key={p.id}
      project={p}
      abierto={abierto === p.id}
      tareaInicial={abierto === p.id ? tareaAbierta : null}
      onAlternar={() => alternar(p.id)}
      retenido={p.id === retenido}
      saliendo={p.id === saliendo}
      puedeEditar={puedeEditar}
      accion={accion}
    />
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {!datos && estado === 'cargando' && <p className="text-slate-500">Cargando…</p>}
      {!datos && estado !== 'cargando' && (
        <p className="text-slate-500">Toca "Conectar" arriba para leer tus pendientes de Google Drive.</p>
      )}
      {datos && todos.length === 0 && (
        <p className="text-slate-500">Todavía no hay proyectos. Crea el primero para empezar.</p>
      )}

      <div className="space-y-2">{activos.map(item)}</div>

      {puedeEditar && (
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 w-full py-2 text-sm rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
        >
          + Nuevo proyecto
        </button>
      )}

      {terminados.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setVerTerminados((v) => !v)}
            className={`text-sm transition-colors ${destello ? 'text-emerald-600 font-semibold animate-pulse' : 'text-slate-500'}`}
          >
            {verTerminados ? '▾' : '▸'} Terminados ({terminados.length}){destello ? ' ✓' : ''}
          </button>
          {verTerminados && <div className="space-y-2 mt-2 opacity-70">{terminados.map(item)}</div>}
        </div>
      )}

      {showModal && (
        <NewProjectModal onClose={() => setShowModal(false)} onCreate={(p) => mutar(ops.crearProyecto(p))} />
      )}
    </div>
  )
}
