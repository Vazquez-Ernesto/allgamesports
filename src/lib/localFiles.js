// Archivos grandes guardados en el navegador (OPFS: Origin Private File System).
// Se usa para el WAD que aporta el jugador: queda en su máquina y la próxima
// visita no hay que volver a elegirlo.

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

export async function removeLocalFile(name) {
  if (!supported()) return
  try {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry(name)
  } catch {
    // no existía
  }
}
