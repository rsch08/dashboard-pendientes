const TONOS = {
  rojo: 'bg-red-100 text-red-700',
  naranja: 'bg-orange-100 text-orange-700',
  ambar: 'bg-amber-100 text-amber-800',
  gris: 'bg-slate-100 text-slate-600',
}

export default function Aviso({ aviso }) {
  if (!aviso) return null
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${TONOS[aviso.tono]}`}>
      {aviso.tono === 'rojo' || aviso.tono === 'naranja' ? '⚠ ' : ''}
      {aviso.texto}
    </span>
  )
}

export function Barra({ valor, className = '' }) {
  return (
    <div className={`h-1.5 bg-slate-200 rounded-full overflow-hidden ${className}`}>
      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round(valor * 100)}%` }} />
    </div>
  )
}
