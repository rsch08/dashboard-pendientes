// Ventana flotante (picture-in-picture) con el tiempo restante y la tarea.
// Truco: se dibuja en un <canvas>, su imagen se pasa a un <video> y ese video
// se abre en PiP. Funciona en Chrome de Android (Fold) y de escritorio.

let video = null
let canvas = null
let intervalo = null

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

export async function abrirPip(estado) {
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
    video.addEventListener('leavepictureinpicture', () => {
      clearInterval(intervalo)
      intervalo = null
    })
  }
  dibujar(estado)
  if (!video.srcObject) video.srcObject = canvas.captureStream(4)
  await video.play()
  clearInterval(intervalo)
  intervalo = setInterval(() => dibujar(estado), 500)
  await video.requestPictureInPicture()
}

export async function cerrarPip() {
  if (document.pictureInPictureElement) await document.exitPictureInPicture()
}
