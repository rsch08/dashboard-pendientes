// Llamadas directas a la API de Drive v3 desde el navegador.

import { ARCHIVO_DATOS, CARPETA_RAIZ, CARPETA_RESPALDO } from './config.js'

const API = 'https://www.googleapis.com/drive/v3'
const SUBIDA = 'https://www.googleapis.com/upload/drive/v3'
const CARPETA = 'application/vnd.google-apps.folder'

export class ErrorDrive extends Error {
  constructor(mensaje, estado) {
    super(mensaje)
    this.estado = estado
  }
}

async function pedir(token, url, init = {}) {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } })
  if (!r.ok) {
    let detalle = ''
    try {
      detalle = (await r.json()).error?.message ?? ''
    } catch {
      // sin JSON
    }
    throw new ErrorDrive(`Drive respondió ${r.status}${detalle ? `: ${detalle}` : ''}`, r.status)
  }
  return r
}

const comillas = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

async function buscar(token, q, campos = 'files(id,name,modifiedTime)', orden) {
  const params = new URLSearchParams({ q, fields: campos, pageSize: '100', spaces: 'drive' })
  if (orden) params.set('orderBy', orden)
  const r = await (await pedir(token, `${API}/files?${params}`)).json()
  return r.files ?? []
}

async function buscarCarpeta(token, nombre, padre) {
  const q = [
    `name = '${comillas(nombre)}'`,
    `mimeType = '${CARPETA}'`,
    'trashed = false',
    padre && `'${padre}' in parents`,
  ]
    .filter(Boolean)
    .join(' and ')
  const [primera] = await buscar(token, q, 'files(id,name)')
  return primera
}

async function crearCarpeta(token, nombre, padre) {
  const r = await pedir(token, `${API}/files?fields=id,name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nombre, mimeType: CARPETA, parents: [padre] }),
  })
  return r.json()
}

// Ubica la carpeta y el pendientes.json vigente. Si hubiera dos con el mismo
// nombre (Claude crea uno nuevo en lugar de sobrescribir), gana el más reciente.
export async function ubicarDatos(token) {
  const raiz = await buscarCarpeta(token, CARPETA_RAIZ)
  if (!raiz) throw new Error(`No encontré la carpeta "${CARPETA_RAIZ}" en tu Drive.`)
  const [archivo] = await buscar(
    token,
    `'${raiz.id}' in parents and name = '${ARCHIVO_DATOS}' and trashed = false`,
    'files(id,name,modifiedTime)',
    'modifiedTime desc',
  )
  if (!archivo) throw new Error(`No encontré ${ARCHIVO_DATOS} dentro de "${CARPETA_RAIZ}".`)
  return { raizId: raiz.id, archivo }
}

export async function leerJson(token, id) {
  return (await pedir(token, `${API}/files/${id}?alt=media`)).json()
}

export async function escribirJson(token, id, datos) {
  const r = await pedir(token, `${SUBIDA}/files/${id}?uploadType=media&fields=id,modifiedTime`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos, null, 2),
  })
  return r.json()
}

// Copia del archivo en respaldo/ con la fecha del día. Si ya hay una de hoy,
// no hace nada (un respaldo diario basta).
export async function respaldarSiHaceFalta(token, raizId, archivoId) {
  const hoy = new Date().toLocaleDateString('en-CA') // AAAA-MM-DD local
  const nombre = `pendientes-${hoy}.json`
  const carpeta =
    (await buscarCarpeta(token, CARPETA_RESPALDO, raizId)) ??
    (await crearCarpeta(token, CARPETA_RESPALDO, raizId))
  const [existente] = await buscar(
    token,
    `'${carpeta.id}' in parents and name = '${nombre}' and trashed = false`,
    'files(id)',
  )
  if (existente) return
  await pedir(token, `${API}/files/${archivoId}/copy?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nombre, parents: [carpeta.id] }),
  })
}
