// Configuración pública. El Client ID de OAuth es público por diseño (viaja
// en cada inicio de sesión). No hay secretos en esta app.
// Por defecto usa el mismo Client ID que la app de finanzas: solo hay que
// agregar el dominio de esta app en "Orígenes de JavaScript autorizados".

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1096178184724-dn8hd5j4drt7u7ga8970kl27f28agvlv.apps.googleusercontent.com'

// Scope "drive" completo: el pendientes.json lo crea Claude (con su conector),
// no esta app, así que "drive.file" no alcanzaría para leerlo ni editarlo.
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive'

export const CARPETA_RAIZ = 'Pendientes Casta'
export const CARPETA_RESPALDO = 'respaldo'
export const ARCHIVO_DATOS = 'pendientes.json'
export const VERSION_ESQUEMA = 1
