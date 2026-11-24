# Pendientes (dashboard)

App para ver y mover los pendientes personales de Casta: proyectos → tareas →
subtareas (solo check). Los datos viven en **un solo archivo en Google Drive**,
así Claude los puede leer y editar desde el proyecto "Pendientes" y la app solo
los muestra. Ver `SPEC.md` para el spec original.

## Stack

- React + Vite + Tailwind, PWA instalable (pensada para el Galaxy Z Fold).
- Google Drive como almacenamiento: `Pendientes Casta/pendientes.json`.
- Inicio de sesión con Google (solo Client ID público). Sin backend, sin secretos.
- Deploy en Vercel.

## Datos en Drive

```
Pendientes Casta/
  pendientes.json          ← el archivo vigente
  respaldo/
    pendientes-AAAA-MM-DD.json
```

Estructura de `pendientes.json` documentada en `src/lib/datos.js`. Campos clave:

- `version`: sube en 1 con cada escritura (de la app o de Claude).
- `updated_at` / `updated_by`: quién cambió por última vez.
- `tasks[].last_moved_at`: se actualiza al cambiar de estado; alimenta el "oxidado".

### Cómo escriben la app y Claude sin pisarse

- **App**: antes de guardar vuelve a leer el archivo vigente y reaplica el cambio
  sobre esa versión, luego escribe `version + 1`. El primer guardado del día
  copia el archivo a `respaldo/`.
- **Claude** (conector de Drive): no puede sobrescribir el contenido de un
  archivo, así que crea un `pendientes.json` nuevo con `version + 1` y mueve el
  anterior a `respaldo/` con nombre fechado. Si llegaran a convivir dos
  `pendientes.json`, la app usa el modificado más reciente.

## Poner a correr

```bash
npm install
npm run dev
```

Usa el Client ID de OAuth del proyecto de Google Cloud "dashboard pendientes"
(`src/lib/config.js`); se puede cambiar con `VITE_GOOGLE_CLIENT_ID`.

### Google Cloud (una sola vez)

En el proyecto de Google Cloud del Client ID:

1. **Clientes → Pendientes web → Orígenes de JavaScript autorizados**:
   `https://pendientes-casta.vercel.app` (y `http://localhost:5173` para desarrollo).
2. La app pide el scope `drive` completo (necesario para editar un archivo que
   creó Claude). Como la app está en modo de prueba, Google muestra el aviso de
   "app no verificada": es esperado, continuar.

## Deploy en Vercel

Framework preset **Vite**. No requiere variables de entorno.

## Efecto "oxidado"

| Días sin moverse | Color |
|---|---|
| 0-3 | normal |
| 4-7 | amarillo |
| 8-14 | naranja |
| 15+ | rojo |

La tarjeta de cada proyecto hereda el peor nivel entre sus tareas no terminadas.

## Trocear tareas grandes

Al crear una tarea puedes marcarla como "es grande" y partirla en subtareas
ahí mismo (una por línea).
