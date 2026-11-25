// Partidas guardadas y configuración de Doom y Tyrian, en IndexedDB.
//
// Cada juego usa su carpeta /save/<saveKey> del sistema de archivos virtual
// del motor (en memoria). Al arrancar se llena con lo que hay en la base
// '/save' (mismo formato que IDBFS, ver lib/idbfs.js) y cada tanto se copian
// solo las diferencias con la última foto que vio ESTA instancia: lo que
// cambió se escribe y lo que se borró se borra. Lo demás no se toca.
//
// Antes se montaba IDBFS, pero su syncfs es un espejo de toda la carpeta:
// borraba de la base lo que no tenía en memoria. Con dos instancias vivas
// (dos pestañas, o una trabada), la de la foto vieja borraba las partidas
// que había guardado la otra, aunque fueran de otro juego.

import { listFiles, updateFiles } from './idbfs.js'

const SYNC_MS = 4000
const DB = '/save'

export async function mountSaves(module, saveKey) {
  const { FS } = module
  const place = { db: DB, dir: saveKey }
  const dir = `${DB}/${saveKey}`
  FS.mkdirTree(dir)
  let known = await loadFiles(FS, place, dir)
  const sync = oneAtATime(async () => {
    known = await saveChanges(FS, place, dir, known)
  })

  const stopAutoSync = startAutoSync(sync)
  return {
    dir,
    flush: sync,
    async close() {
      stopAutoSync()
      await sync()
    },
  }
}

// Copia a la carpeta del juego lo que hay en la base y devuelve esa foto.
async function loadFiles(FS, place, dir) {
  const known = new Map()
  for (const { path, bytes } of await listFiles(place)) {
    const file = `${dir}/${path}`
    FS.mkdirTree(file.slice(0, file.lastIndexOf('/')))
    FS.writeFile(file, bytes)
    known.set(path, bytes)
  }
  return known
}

// Escribe en la base lo que cambió desde la última foto y devuelve la nueva.
async function saveChanges(FS, place, dir, known) {
  const current = readTree(FS, dir)
  const changed = [...current]
    .filter(([path, bytes]) => !sameBytes(known.get(path), bytes))
    .map(([path, bytes]) => ({ path, bytes }))
  const removed = [...known.keys()].filter((path) => !current.has(path))
  if (changed.length || removed.length) await updateFiles(place, changed, removed)
  return current
}

// Archivos de una carpeta y sus subcarpetas: Map(ruta relativa -> bytes).
function readTree(FS, root, files = new Map(), sub = '') {
  for (const name of FS.readdir(sub ? `${root}/${sub}` : root)) {
    if (name === '.' || name === '..') continue
    const path = sub ? `${sub}/${name}` : name
    const full = `${root}/${path}`
    if (FS.isDir(FS.stat(full).mode)) readTree(FS, root, files, path)
    else files.set(path, FS.readFile(full))
  }
  return files
}

function sameBytes(a, b) {
  if (!a || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// Si se pide copiar mientras otra copia está en curso, espera a que termine:
// así cada copia parte de la foto que dejó la anterior.
function oneAtATime(task) {
  let last = Promise.resolve()
  const run = () =>
    task().catch((error) => console.warn('No se pudieron sincronizar las partidas guardadas', error))
  return () => (last = last.then(run))
}

// Copia a IndexedDB cada tanto y cuando se oculta la pestaña.
function startAutoSync(sync) {
  const timer = setInterval(sync, SYNC_MS)
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') sync()
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
