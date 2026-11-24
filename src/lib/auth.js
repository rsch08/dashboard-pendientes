// Inicio de sesión con Google Identity Services (modelo de token), igual que
// la app de finanzas. Sin backend no hay refresh token: el access token dura
// ~1 hora y se guarda en localStorage con su vencimiento. Después hace falta
// un toque para pedir otro (el navegador bloquea la ventana si no viene de un
// gesto del usuario).

import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config.js'

const CLAVE = 'pendientes-casta.token'
const MARGEN_MS = 60_000

let scriptPromesa

function cargarScript() {
  scriptPromesa ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromesa = undefined
      reject(new Error('No se pudo cargar el inicio de sesión de Google. ¿Hay conexión?'))
    }
    document.head.appendChild(s)
  })
  return scriptPromesa
}

export function tokenGuardado() {
  try {
    const t = JSON.parse(localStorage.getItem(CLAVE) ?? 'null')
    if (t && t.vence - MARGEN_MS > Date.now()) return t.token
  } catch {
    // almacenamiento no disponible
  }
  return undefined
}

function guardarToken(token, segundos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ token, vence: Date.now() + segundos * 1000 }))
  } catch {
    // sin almacenamiento, el token vive solo en esta sesión
  }
}

export function olvidarToken() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada que borrar
  }
}

// Debe llamarse desde un toque si no hay token guardado.
export async function obtenerToken() {
  const guardado = tokenGuardado()
  if (guardado) return guardado
  await cargarScript()
  return new Promise((resolve, reject) => {
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (r) => {
        if (r.error || !r.access_token) {
          return reject(new Error(r.error_description || r.error || 'Google no entregó el permiso'))
        }
        guardarToken(r.access_token, r.expires_in ?? 3600)
        resolve(r.access_token)
      },
      error_callback: (e) =>
        reject(
          new Error(
            e.type === 'popup_closed'
              ? 'Se cerró la ventana de Google sin dar permiso'
              : e.message || `Error de Google: ${e.type}`,
          ),
        ),
    })
    cliente.requestAccessToken({ prompt: '' })
  })
}
