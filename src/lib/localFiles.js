// Archivos guardados en el navegador (OPFS: Origin Private File System).
// Se usa para el archivo que aporta el jugador (queda en su máquina y la
// próxima visita no hay que volver a elegirlo) y para las partidas de Game
// Boy y NES.

const supported = () => Boolean(navigator.storage?.getDirectory)

export async function saveLocalFile(name, bytes) {
  if (!supported()) return false
  try {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(name, { create: true })
    const writable = await handle.createWritable()
    await writable.write(bytes)
    await writable.close()
    return true
  } catch {
    return false
  }
}

export async function loadLocalFile(name) {
  if (!supported()) return null
  try {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(name)
    const file = await handle.getFile()
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    return null
  }
}

// El File (con su tamaño y su fecha), o null si no existe.
export async function localFileInfo(name) {
  if (!supported()) return null
  try {
    const root = await navigator.storage.getDirectory()
    return await (await root.getFileHandle(name)).getFile()
  } catch {
    return null
  }
}

export async function removeLocalFile(name) {
  if (!supported()) return
  try {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry(name)
  } catch {
    // no existía
  }
}
