// Fechas "AAAA-MM-DD" (sin hora) y los avisos de urgencia/estancamiento.

import { estadoTarea, fechaEfectiva } from '../lib/datos.js'
import { diasDesde, nivelOxidado } from './oxidado.js'

const hoyLocal = () => new Date().toLocaleDateString('en-CA')

export function diasHasta(fecha) {
  const [a, m, d] = fecha.split('-').map(Number)
  const [ha, hm, hd] = hoyLocal().split('-').map(Number)
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86400000)
}

export function fechaCorta(fecha) {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function cuando(dias) {
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias === -1) return 'ayer'
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`
}

// Aviso de fecha: { texto, tono } o null. tono: rojo | naranja | ambar | gris
export function avisoFecha(fecha, esLimite) {
  if (!fecha) return null
  const dias = diasHasta(fecha)
  const base = `${esLimite ? 'Límite' : 'Meta'} ${fechaCorta(fecha)} · ${cuando(dias)}`
  if (dias < 0)
    return esLimite
      ? { texto: `Venció hace ${-dias} días (${fechaCorta(fecha)})`, tono: 'rojo' }
      : { texto: `Se pasó tu meta hace ${-dias} días`, tono: 'naranja' }
  if (dias <= (esLimite ? 7 : 3)) return { texto: base, tono: esLimite ? 'naranja' : 'ambar' }
  return { texto: base, tono: 'gris' }
}

export function avisoEstancado(fechaISO) {
  const nivel = nivelOxidado(fechaISO)
  if (nivel === 'normal') return null
  const dias = diasDesde(fechaISO)
  const texto = nivel === 'rojo' ? `Muy estancada · ${dias} días` : nivel === 'naranja' ? `Estancada · ${dias} días` : `${dias} días sin moverse`
  return { texto, tono: nivel === 'rojo' ? 'rojo' : nivel === 'naranja' ? 'naranja' : 'ambar' }
}

// Avisos de un proyecto: su fecha (o la de la tarea más próxima) y lo estancado.
export function avisosProyecto(p) {
  const avisos = []
  const fecha = fechaEfectiva(p)
  if (fecha) {
    const esLimite = p.fecha ? p.fecha_limite : true // fecha de tarea = deadline de esa tarea
    avisos.push(avisoFecha(fecha, esLimite))
  }
  const activas = p.tasks.filter((t) => estadoTarea(t) !== 'hecho')
  const masVieja = activas.map((t) => t.last_moved_at).sort()[0]
  const est = masVieja && avisoEstancado(masVieja)
  if (est) avisos.push(est)
  return avisos
}
