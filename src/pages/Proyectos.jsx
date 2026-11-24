import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePendientes } from '../lib/PendientesContext.jsx'
import { ops, ordenProyectos, proyectoTerminado } from '../lib/datos.js'
import ProyectoItem from '../components/ProyectoItem.jsx'
import NewProjectModal from '../components/NewProjectModal.jsx'

// Un renglón por proyecto con su siguiente paso, ordenados por fecha (lo más
// próximo arriba; sin fecha, lo más estancado arriba). Al tocar un proyecto se
// expande con sus tareas; al tocar una tarea, con sus subtareas.
export default function Proyectos() {
  const { datos, estado, mutar } = usePendientes()
  const [params, setParams] = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [verTerminados, setVerTerminados] = useState(false)
  const abierto = params.get('p')
  const tareaAbierta = params.get('t')
  const puedeEditar = estado === 'listo' || estado === 'guardando'

  const todos = [...(datos?.projects ?? [])].sort(ordenProyectos)
  const activos = todos.filter((p) => !proyectoTerminado(p))
  const terminados = todos.filter(proyectoTerminado)

  const alternar = (id) => setParams(abierto === id ? {} : { p: id }, { replace: true })
  const accion = (op) => (puedeEditar ? mutar(op).catch(() => {}) : undefined)

  const item = (p) => (
    <ProyectoItem
      key={p.id}
      project={p}
      abierto={abierto === p.id}
      tareaInicial={abierto === p.id ? tareaAbierta : null}
      onAlternar={() => alternar(p.id)}
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
          <button onClick={() => setVerTerminados((v) => !v)} className="text-sm text-slate-500">
            {verTerminados ? '▾' : '▸'} Terminados ({terminados.length})
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
