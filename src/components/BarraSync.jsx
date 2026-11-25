import { usePendientes } from '../lib/PendientesContext.jsx'

const TEXTO = {
  cargando: 'Leyendo Drive…',
  guardando: 'Guardando en Drive…',
  listo: 'Al día con Drive',
}

function haceCuanto(iso) {
  if (!iso) return ''
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

export default function BarraSync() {
  const { datos, estado, error, conectar, recargar } = usePendientes()
  const desconectado = estado === 'desconectado'

  return (
    <div
      className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${
        estado === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white/90 backdrop-blur border-slate-200 text-slate-500'
      }`}
    >
      <span className="truncate flex-1">
        {error ?? (desconectado ? 'Drive en pausa: se reconecta solo al marcar algo' : TEXTO[estado])}
        {datos?.updated_at && !error && (
          <span className="text-slate-400">
            {' '}
            · cambiado {haceCuanto(datos.updated_at)}
            {datos.updated_by === 'claude' ? ' por Claude' : ''}
          </span>
        )}
      </span>
      {desconectado ? (
        <button onClick={conectar} className="px-2 py-1 rounded-md bg-indigo-600 text-white shrink-0">
          Conectar
        </button>
      ) : (
        <button
          onClick={() => recargar()}
          disabled={estado === 'cargando' || estado === 'guardando'}
          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 shrink-0"
        >
          ↻
        </button>
      )}
    </div>
  )
}
