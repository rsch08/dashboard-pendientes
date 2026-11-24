// Timer Pomodoro (25 enfoque / 5 descanso). Vive arriba de las vistas para que
// siga corriendo al cambiar de pestaña, y se guarda en localStorage para
// sobrevivir si se cierra la app. Al terminar un enfoque registra el pomodoro
// en la tarea elegida (si no hay conexión, lo guarda y lo sube después).

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePendientes } from './PendientesContext.jsx'
import { ops } from './datos.js'
import { abrirPip, cerrarPip, estadoReproduccion } from './pip.js'

export const MIN = { enfoque: 25, descanso: 5 }
const CLAVE = 'pendientes-casta.timer'
const CLAVE_PENDIENTES = 'pendientes-casta.pomodoros-sin-subir'
const Ctx = createContext(null)

function leer(clave, porDefecto) {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? 'null') ?? porDefecto
  } catch {
    return porDefecto
  }
}
function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // sin almacenamiento
  }
}

const INICIAL = { modo: 'enfoque', corriendo: false, finEn: null, restante: MIN.enfoque * 60000, tarea: null }

function avisar(modoTerminado) {
  const titulo = modoTerminado === 'enfoque' ? '¡Pomodoro terminado! Toma 5 minutos.' : 'Se acabó el descanso.'
  try {
    navigator.vibrate?.([300, 120, 300])
  } catch {
    // sin vibración
  }
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.35].forEach((t) => {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.2, ac.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.3)
      o.connect(g).connect(ac.destination)
      o.start(ac.currentTime + t)
      o.stop(ac.currentTime + t + 0.3)
    })
  } catch {
    // sin audio
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(titulo, { icon: '/icono-192.png', tag: 'pomodoro' }))
      .catch(() => {})
  }
}

export function TimerProvider({ children }) {
  const { datos, estado: estadoDrive, mutar } = usePendientes()
  const pipRef = useRef(null)
  const alternarRef = useRef(() => {})
  const [t, setT] = useState(() => leer(CLAVE, INICIAL))
  const [ahora, setAhora] = useState(Date.now())
  const terminando = useRef(false)

  const guardar = useCallback((fn) => {
    setT((prev) => {
      const sig = typeof fn === 'function' ? fn(prev) : fn
      escribir(CLAVE, sig)
      return sig
    })
  }, [])

  const subirPendientes = useCallback(() => {
    const lista = leer(CLAVE_PENDIENTES, [])
    if (lista.length === 0) return
    escribir(CLAVE_PENDIENTES, [])
    lista.forEach((p) =>
      mutar(ops.registrarPomodoro(p.projectId, p.taskId, p.min)).catch(() => {
        escribir(CLAVE_PENDIENTES, [...leer(CLAVE_PENDIENTES, []), p])
      }),
    )
  }, [mutar])

  useEffect(() => {
    if (estadoDrive === 'listo') subirPendientes()
  }, [estadoDrive, subirPendientes])

  // Reloj
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 500)
    return () => clearInterval(id)
  }, [])

  // ¿Terminó el periodo?
  useEffect(() => {
    if (!t.corriendo || !t.finEn || ahora < t.finEn || terminando.current) return
    terminando.current = true
    const terminado = t.modo
    if (terminado === 'enfoque' && t.tarea) {
      escribir(CLAVE_PENDIENTES, [...leer(CLAVE_PENDIENTES, []), { ...t.tarea, min: MIN.enfoque }])
      if (estadoDrive === 'listo' || estadoDrive === 'guardando') subirPendientes()
    }
    avisar(terminado)
    // Tras el enfoque arranca el descanso solo; tras el descanso se detiene.
    guardar((prev) =>
      terminado === 'enfoque'
        ? { ...prev, modo: 'descanso', corriendo: true, finEn: Date.now() + MIN.descanso * 60000, restante: MIN.descanso * 60000 }
        : { ...prev, modo: 'enfoque', corriendo: false, finEn: null, restante: MIN.enfoque * 60000 },
    )
    terminando.current = false
  }, [ahora, t, estadoDrive, guardar, subirPendientes])

  const restanteMs = t.corriendo && t.finEn ? Math.max(0, t.finEn - ahora) : t.restante
  const project = t.tarea && datos?.projects.find((p) => p.id === t.tarea.projectId)
  const task = project?.tasks.find((x) => x.id === t.tarea.taskId)
  // La ventana flotante lee esto en cada cuadro, esté en la vista que esté.
  pipRef.current = { tiempo: mmss(restanteMs), modo: t.modo, corriendo: t.corriendo, tarea: task?.title, proyecto: project?.name }

  const api = {
    ...t,
    restanteMs,
    flotante: () =>
      document.pictureInPictureElement
        ? cerrarPip()
        : abrirPip(() => pipRef.current, { alternar: () => alternarRef.current() }),
    elegirTarea: (tarea) => guardar((p) => ({ ...p, tarea })),
    iniciar: () => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
      guardar((p) => ({ ...p, corriendo: true, finEn: Date.now() + p.restante }))
    },
    pausar: () => guardar((p) => ({ ...p, corriendo: false, finEn: null, restante: Math.max(0, p.finEn - Date.now()) })),
    reiniciar: () => guardar((p) => ({ ...p, corriendo: false, finEn: null, restante: MIN[p.modo] * 60000 })),
    cambiarModo: (modo) => guardar((p) => ({ ...p, modo, corriendo: false, finEn: null, restante: MIN[modo] * 60000 })),
  }

  alternarRef.current = () => (t.corriendo ? api.pausar() : api.iniciar())

  useEffect(() => {
    if (document.pictureInPictureElement) estadoReproduccion(t.corriendo)
  }, [t.corriendo])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useTimer = () => useContext(Ctx)

export function mmss(ms) {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
