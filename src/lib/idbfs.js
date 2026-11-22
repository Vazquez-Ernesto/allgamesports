// Leer y escribir, desde afuera del motor, lo que IDBFS guarda en IndexedDB.
//
// IDBFS es la parte de Emscripten que copia una carpeta del sistema de
// archivos del motor a IndexedDB. Cada carpeta montada es una base con el
// nombre de su ruta ('/save-heretic'), con un almacén FILE_DATA adentro:
//   clave  la ruta completa ('/save-heretic/hticsav0.hsg')
//   valor  { timestamp: Date, mode, contents: Uint8Array }
// Las carpetas también se guardan, sin contents; la carpeta montada no.
// IDBFS compara las fechas con getTime(): tienen que ser Date.
//
// Ojo: mientras el motor corre, su copia en memoria manda. Cada vez que
// sincroniza, vuelve a escribir la base y borra lo que no conoce.

const STORE = 'FILE_DATA'
const TYPE_MASK = 0o170000
const FILE_TYPE = 0o100000
const FILE_MODE = 0o100666 // archivo común, como los crea Emscripten
const DIR_MODE = 0o40777

// Si la base no existe: para leer, null (y no se crea); para escribir, se
// crea con el almacén y el índice que espera IDBFS, que después la adopta.
function openDb(name, create) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name)
    request.onupgradeneeded = () => {
      if (!create) return request.transaction.abort()
      request.result.createObjectStore(STORE).createIndex('timestamp', 'timestamp', { unique: false })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => (create ? reject(request.error) : resolve(null))
  })
}

// Carpeta donde están los archivos del juego: la montada o una de adentro.
const rootOf = ({ db, dir }) => (dir ? `${db}/${dir}` : db)

// Qué claves de la base son de este juego (una base puede ser compartida).
function inScope(place, key) {
  const prefix = `${rootOf(place)}/`
  if (!key.startsWith(prefix)) return false
  return !place.match || place.match.test(key.slice(prefix.length))
}

function readAll(db) {
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE).objectStore(STORE)
    const keys = store.getAllKeys()
    const values = store.getAll()
    values.onsuccess = () => resolve(keys.result.map((key, i) => [key, values.result[i]]))
    values.onerror = () => reject(values.error)
  })
}

// Archivos del juego: [{ path, bytes, modified }], con path relativo a su carpeta.
export async function listFiles(place) {
  const db = await openDb(place.db, false)
  if (!db) return []
  try {
    const prefix = `${rootOf(place)}/`
    return (await readAll(db))
      .filter(([key, value]) => inScope(place, key) && (value.mode & TYPE_MASK) === FILE_TYPE)
      .map(([key, value]) => ({ path: key.slice(prefix.length), bytes: new Uint8Array(value.contents), modified: value.timestamp }))
  } finally {
    db.close()
  }
}

// Registros para IDBFS: cada archivo y cada carpeta de su ruta, menos la montada.
function recordsFor(place, files) {
  const timestamp = new Date()
  const records = new Map()
  for (const { path, bytes } of files) {
    const key = `${rootOf(place)}/${path}`
    for (let dir = parentOf(key); dir.length > place.db.length; dir = parentOf(dir)) {
      records.set(dir, { timestamp, mode: DIR_MODE })
    }
    records.set(key, { timestamp, mode: FILE_MODE, contents: bytes })
  }
  return records
}

const parentOf = (path) => path.slice(0, path.lastIndexOf('/'))

// Borra los archivos del juego y escribe los nuevos, todo en una transacción.
function writeAll(db, place, files) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    const keys = store.getAllKeys()
    keys.onsuccess = () => {
      keys.result.filter((key) => inScope(place, key)).forEach((key) => store.delete(key))
      recordsFor(place, files).forEach((record, key) => store.put(record, key))
    }
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function replaceFiles(place, files) {
  const db = await openDb(place.db, true)
  try {
    await writeAll(db, place, files)
  } finally {
    db.close()
  }
}
