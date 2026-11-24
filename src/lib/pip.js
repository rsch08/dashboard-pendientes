// Ventana flotante (picture-in-picture) con el tiempo restante y la tarea.
// Truco: se dibuja en un <canvas>, su imagen se pasa a un <video> y ese video
// se abre en PiP. Funciona en Chrome de Android (Fold) y de escritorio.

let video = null
let canvas = null
let intervalo = null
let controles = { alternar: () => {} }

// El botón central de la ventana flotante (play/pausa) controla el timer.
// Con Media Session el navegador manda el toque aquí en vez de pausar el video,
// así la imagen sigue actualizándose.
function prepararControles() {
  const ms = navigator.mediaSession
  if (!ms) return
  try {
    ms.metadata = new window.MediaMetadata({ title: 'Pomodoro', artist: 'Pendientes' })
  } catch {
    // sin MediaMetadata
  }
  const alternar = () => controles.alternar()
  for (const accion of ['play', 'pause']) {
    try {
      ms.setActionHandler(accion, alternar)
    } catch {
      // acción no soportada
    }
  }
}

// Muestra el ícono correcto (▶ si está en pausa, ❚❚ si corre).
export function estadoReproduccion(corriendo) {
  if (navigator.mediaSession) navigator.mediaSession.playbackState = corriendo ? 'playing' : 'paused'
}

export const pipDisponible = () =>
  typeof document !== 'undefined' &&
  document.pictureInPictureEnabled &&
  typeof HTMLCanvasElement !== 'undefined' &&
  'captureStream' in HTMLCanvasElement.prototype

function recortar(ctx, texto, ancho) {
  if (ctx.measureText(texto).width <= ancho) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1)
  return `${t}…`
}

function dibujar(estado) {
  const ctx = canvas.getContext('2d')
  const { tiempo, modo, tarea, proyecto, corriendo } = estado()
  const W = canvas.width
  const H = canvas.height
  ctx.fillStyle = modo === 'descanso' ? '#065f46' : '#312e81'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '600 22px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${modo === 'descanso' ? 'Descanso' : 'Enfoque'}${corriendo ? '' : ' · en pausa'}`, W / 2, 40)
  ctx.fillStyle = '#fff'
  ctx.font = '700 96px system-ui, sans-serif'
  ctx.fillText(tiempo, W / 2, 140)
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillText(recortar(ctx, tarea ?? 'Sin tarea elegida', W - 32), W / 2, 190)
  if (proyecto) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '20px system-ui, sans-serif'
    ctx.fillText(recortar(ctx, proyecto, W - 32), W / 2, 220)
  }
}

export async function abrirPip(estado, { alternar } = {}) {
  if (alternar) controles = { alternar }
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 240
  }
  if (!video) {
    video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.style.cssText = 'position:fixed;bottom:0;left:0;width:2px;height:1px;opacity:0;pointer-events:none'
    document.body.appendChild(video)
    // Si el navegador pausa el video de todos modos, lo toma como toque y lo reanuda.
    video.addEventListener('pause', () => {
      if (!document.pictureInPictureElement) return
      controles.alternar()
      video.play().catch(() => {})
    })
    video.addEventListener('leavepictureinpicture', () => {
      clearInterval(intervalo)
      intervalo = null
    })
  }
  dibujar(estado)
  if (!video.srcObject) video.srcObject = canvas.captureStream(4)
  await video.play()
  prepararControles()
  estadoReproduccion(estado().corriendo)
  clearInterval(intervalo)
  intervalo = setInterval(() => dibujar(estado), 500)
  await video.requestPictureInPicture()
}

export async function cerrarPip() {
  if (document.pictureInPictureElement) await document.exitPictureInPicture()
}
