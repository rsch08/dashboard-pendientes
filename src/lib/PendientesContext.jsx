// Estado global: los datos de pendientes.json, la conexión con Drive y la
// cola de escrituras. La última copia leída se guarda en localStorage para
// mostrar los pendientes al instante (y sin conexión) aunque no haya token.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { cargarScript, obtenerToken, olvidarToken, tokenGuardado } from './auth.js'
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
      setError(null)
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
    // Precarga el script de Google para que renovar el token tras un toque sea inmediato.
    cargarScript().catch(() => {})
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
      // Si el token venció, se pide uno nuevo AQUÍ, todavía dentro del toque
      // que disparó el cambio (si se pide después, el navegador bloquea la ventana).
      const tokenNuevo = tokenGuardado() ? null : obtenerToken()
      tokenNuevo?.catch(() => {})
      const tarea = cola.current.then(async () => {
        setEstado('guardando')
        setError(null)
        try {
          const token = tokenGuardado() ?? (tokenNuevo ? await tokenNuevo : null)
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
  // Se puede editar aunque el token haya vencido: al tocar se renueva solo.
  const puedeEditar = !!datos && estado !== 'cargando'

  return (
    <Ctx.Provider value={{ datos, estado, error, conectar, recargar: sincronizar, mutar, puedeEditar }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePendientes() {
  return useContext(Ctx)
}
