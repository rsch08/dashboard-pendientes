// Configuración pública. El Client ID de OAuth es público por diseño (viaja
// en cada inicio de sesión). No hay secretos en esta app.
// Client ID propio, del proyecto de Google Cloud "dashboard pendientes".
// Origen autorizado: https://pendientes-casta.vercel.app

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '877190936336-434c0sdmvce0g13vhjuhpcdkhf48fc7q.apps.googleusercontent.com'

// Scope "drive" completo: el pendientes.json lo crea Claude (con su conector),
// no esta app, así que "drive.file" no alcanzaría para leerlo ni editarlo.
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive'

export const CARPETA_RAIZ = 'Pendientes Casta'
export const CARPETA_RESPALDO = 'respaldo'
export const ARCHIVO_DATOS = 'pendientes.json'
export const VERSION_ESQUEMA = 1
