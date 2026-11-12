// Runtime de OpenLara (motor de Tomb Raider): corre games/openlara/play.html
// en un iframe (ver lib/engineFrame.js).
//
// El jugador aporta su disco de PlayStation. De la imagen del disco se sacan
// solo los niveles (PSXDATA) y las pantallas de carga (DELDATA), que se
// guardan juntos en un .zip sin comprimir. Al arrancar se le pasan al iframe,
// que los escribe con las mismas carpetas del disco: OpenLara los reconoce.
//
// No se usan los videos ni la música del disco (ver engines/openlara/README.md).

import { createEngineIframe, listenToFrame } from '../../lib/engineFrame.js'
import { listDisc } from '../../lib/iso9660.js'
import { createZip, listZip } from '../../lib/zip.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/openlara/`
const WANTED = /(^|\/)(PSXDATA\/[^/]+\.PSX|DELDATA\/[^/]+\.RAW)$/i
const REQUIRED = ['PSXDATA/GYM.PSX'] // por este archivo OpenLara reconoce el Tomb Raider de PlayStation

const isZip = (bytes) => bytes[0] === 0x50 && bytes[1] === 0x4b

// "carpeta/psxdata/gym.psx" -> "PSXDATA/GYM.PSX"
const normalize = (path) => path.match(WANTED)[2].toUpperCase()

// Archivos del juego dentro de lo que eligió el jugador: [{ path, read() }].
async function findGameFiles(file) {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  if (isZip(head)) {
    const entries = listZip(new Uint8Array(await file.arrayBuffer()))
    return entries.filter((entry) => WANTED.test(entry.name)).map((entry) => ({ path: entry.name, read: entry.read }))
  }
  return (await listDisc(file)).filter((entry) => WANTED.test(entry.path))
}

// Lee el disco (o zip) del jugador y devuelve solo lo que usa el juego.
export async function importTombRaider(file) {
  let found
  try {
    found = await findGameFiles(file)
  } catch {
    throw new Error('Ese archivo no es una imagen de disco (.bin, .img, .iso) ni un .zip.')
  }
  const files = []
  for (const entry of found) files.push({ name: normalize(entry.path), bytes: await entry.read() })

  const names = files.map((entry) => entry.name)
  if (!REQUIRED.every((name) => names.includes(name))) {
    throw new Error('Ese disco no es el Tomb Raider de PlayStation (falta la carpeta PSXDATA con sus niveles).')
  }
  return { fileName: 'tombraider-psx.zip', title: 'Tomb Raider (PlayStation)', bytes: await createZip(files) }
}

async function unpack(zipBytes) {
  const files = []
  for (const entry of listZip(zipBytes)) files.push({ path: entry.name, bytes: await entry.read() })
  return files
}

/**
 * Arranca Tomb Raider.
 *
 * @param {object} options
 * @param {HTMLElement} options.frame   Contenedor donde va el iframe.
 * @param {Uint8Array} options.data     El .zip que armó importTombRaider.
 * @param {(message: string) => void} [options.onError]
 */
export async function startOpenLara({ frame, data, onError }) {
  const iframe = createEngineIframe(`${ENGINE_DIR}play.html`, 'Tomb Raider')
  const messages = listenToFrame(iframe, 'openlara')
  frame.appendChild(iframe)

  try {
    await messages.waitFor('loaded')
    const ready = messages.waitFor('ready')
    iframe.contentWindow.postMessage({ type: 'start', files: await unpack(data) }, window.location.origin)
    await ready
  } catch (error) {
    messages.stop()
    iframe.remove()
    throw error
  }

  messages.onAfterReady({ onError })
  iframe.focus()
  return createController(iframe, messages)
}

function createController(iframe, messages) {
  const inside = () => iframe.contentWindow

  // Pausa de verdad: frena el bucle del motor además del sonido.
  function setPaused(paused) {
    const page = inside()
    if (!page) return
    page.pausedByPlayer = paused
    if (paused) page.MainLoop?.pause()
    else page.MainLoop?.resume()
    if (paused) page.audioContext?.suspend()
    else page.audioContext?.resume()
    if (!paused) iframe.focus()
  }

  return {
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    async destroy() {
      messages.stop()
      iframe.remove()
    },
  }
}
