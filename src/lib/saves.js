// Partidas guardadas y configuración de los motores, en IndexedDB.
//
// Emscripten trae IDBFS: una carpeta del sistema de archivos virtual del motor
// que se puede copiar a IndexedDB y leer de vuelta. Se monta en /save y cada
// juego usa su subcarpeta. La copia no es automática: se sincroniza cada
// tanto, al ocultar la pestaña y al cerrar el juego.

const SYNC_MS = 4000

export async function mountSaves(module, saveKey) {
  const { FS, IDBFS } = module
  FS.mkdir('/save')
  FS.mount(IDBFS, {}, '/save')
  const sync = (fromDisk) => syncfs(FS, fromDisk)

  // Primero leer lo que ya hay: si se escribiera antes, IDBFS borraría las
  // carpetas de los otros juegos al no encontrarlas en memoria.
  await sync(true)
  const dir = `/save/${saveKey}`
  if (!FS.analyzePath(dir).exists) FS.mkdir(dir)

  const stopAutoSync = startAutoSync(sync)
  return {
    dir,
    flush: () => sync(false),
    async close() {
      stopAutoSync()
      await sync(false)
    },
  }
}

// Copia a IndexedDB cada tanto y cuando se oculta la pestaña.
function startAutoSync(sync) {
  const timer = setInterval(() => sync(false), SYNC_MS)
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') sync(false)
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

function syncfs(FS, fromDisk) {
  return new Promise((resolve) => {
    FS.syncfs(fromDisk, (error) => {
      if (error) console.warn('No se pudieron sincronizar las partidas guardadas', error)
      resolve()
    })
  })
}
