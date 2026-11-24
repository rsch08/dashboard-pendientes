// Estado global: los datos de pendientes.json, la conexión con Drive y la
// cola de escrituras. La última copia leída se guarda en localStorage para
// mostrar los pendientes al instante (y sin conexión) aunque no haya token.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { obtenerToken, olvidarToken, tokenGuardado } from './auth.js'
import { ErrorDrive, escribirJson, leerJson, respaldarSiHaceFalta, ubicarDatos } from './drive.js'
import { normalizar } from './datos.js'

const CLAVE_CACHE = 'pendientes-casta.cache'
const Ctx = createContext(null)

function leerCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CACHE) ?? 'null')
    return c ? normalizar(c) : null
  } catch {
    return null
  }
}

function guardarCache(datos) {
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify(datos))
  } catch {
    // sin almacenamiento
  }
}

export function PendientesProvider({ children }) {
  const [datos, setDatos] = useState(leerCache)
  // estado: 'desconectado' | 'cargando' | 'listo' | 'guardando' | 'error'
  const [estado, setEstado] = useState(tokenGuardado() ? 'cargando' : 'desconectado')
  const [error, setError] = useState(null)
  const cola = useRef(Promise.resolve())
  const confirmados = useRef(datos)

  const aplicar = useCallback((nuevos) => {
    confirmados.current = nuevos
    setDatos(nuevos)
    guardarCache(nuevos)
  }, [])

  const manejarError = useCallback((e) => {
    if (e instanceof ErrorDrive && e.estado === 401) {
      olvidarToken()
      setEstado('desconectado')
      setError('La sesión de Google venció. Toca "Conectar" para seguir.')
    } else {
      setEstado('error')
      setError(e.message)
    }
  }, [])

  const sincronizar = useCallback(
    async ({ interactivo = false } = {}) => {
      if (!interactivo && !tokenGuardado()) {
        setEstado('desconectado')
        return
      }
      setEstado('cargando')
      setError(null)
      try {
        const token = await obtenerToken()
        const { archivo } = await ubicarDatos(token)
        aplicar(normalizar(await leerJson(token, archivo.id)))
        setEstado('listo')
      } catch (e) {
        manejarError(e)
      }
    },
    [aplicar, manejarError],
  )

  useEffect(() => {
    sincronizar()
    // Al volver a la app (p. ej. después de hablar con Claude), recarga.
    const alVolver = () => document.visibilityState === 'visible' && sincronizar()
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [sincronizar])

  // Aplica una operación: primero en pantalla, luego en Drive. Para guardar,
  // vuelve a leer el archivo vigente y reaplica la operación sobre él, así no
  // se pisa lo que Claude haya cambiado mientras tanto.
  const mutar = useCallback(
    (op) => {
      setDatos((d) => (d ? op(d) : d))
      const tarea = cola.current.then(async () => {
        setEstado('guardando')
        try {
          const token = tokenGuardado()
          if (!token) throw new ErrorDrive('Sin sesión', 401)
          const { raizId, archivo } = await ubicarDatos(token)
          const remoto = normalizar(await leerJson(token, archivo.id))
          await respaldarSiHaceFalta(token, raizId, archivo.id).catch(() => {})
          const siguiente = {
            ...op(remoto),
            esquema: remoto.esquema,
            version: remoto.version + 1,
            updated_at: new Date().toISOString(),
            updated_by: 'app',
          }
          await escribirJson(token, archivo.id, siguiente)
          aplicar(siguiente)
          setEstado('listo')
        } catch (e) {
          // revierte a lo último confirmado
          setDatos(confirmados.current)
          manejarError(e)
          throw e
        }
      })
      cola.current = tarea.catch(() => {})
      return tarea
    },
    [aplicar, manejarError],
  )

  const conectar = useCallback(() => sincronizar({ interactivo: true }), [sincronizar])

  return (
    <Ctx.Provider value={{ datos, estado, error, conectar, recargar: sincronizar, mutar }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePendientes() {
  return useContext(Ctx)
}
