// Runtime de Tyrian (OpenTyrian compilado con Emscripten + SDL2 + Asyncify).
//
// A diferencia de Doom, acá el bucle del juego lo maneja C: main() corre
// siempre y cede el control al navegador cada frame (ver engines/tyrian/src/web.c).
// JS solo prepara los archivos, arranca main() y avisa cuándo pausar o salir.
// Video, sonido y teclado los resuelve el port de SDL2 de Emscripten.
//
// Flujo:
//   1. Se carga tyrian.js + tyrian.wasm.
//   2. Se descomprime el tyrian21.zip del jugador en /tyrian.
//   3. Se monta IndexedDB en /save (configuración y partidas).
//   4. Se llama a main("--data=/tyrian").

import { loadEngineScript } from '../../lib/engineScript.js'
import { mountSaves } from '../../lib/saves.js'
import { listZip } from '../../lib/zip.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/tyrian/`
const DATA_DIR = '/tyrian'
const MARKER_FILE = 'tyrian1.lvl' // si está, es Tyrian
const STOP_TIMEOUT_MS = 3000
const LOG_LINES = 40

const baseName = (path) => path.split('/').pop().toLowerCase()

// Valida el archivo que aporta el jugador (el tyrian21.zip oficial).
export function identifyTyrianZip(bytes) {
  let entries
  try {
    entries = listZip(bytes)
  } catch {
    throw new Error('Ese archivo no es un .zip. Elegí el tyrian21.zip que descargaste.')
  }
  if (!entries.some((entry) => baseName(entry.name) === MARKER_FILE)) {
    throw new Error('Ese .zip no tiene los datos de Tyrian (falta tyrian1.lvl).')
  }
  return { fileName: 'tyrian21.zip', title: 'Tyrian 2.1' }
}

/**
 * Arranca Tyrian.
 *
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas  Con id="canvas": SDL2 lo busca por ese selector.
 * @param {Uint8Array} options.data           El tyrian21.zip.
 * @param {string} options.saveKey            Carpeta de configuración y partidas.
 * @param {() => void} [options.onQuit]       El jugador salió desde el menú del juego.
 * @param {(message: string) => void} [options.onError]
 */
export async function startTyrian({ canvas, data, saveKey, onQuit, onError }) {
  const log = createLog()
  const exit = createExitSignal()
  const env = environmentFor(saveKey, canvas)
  const module = await createModule({ env, log, exit, canvas, onError })

  await writeGameFiles(module.FS, data)
  const saves = await mountSaves(module, saveKey) // crea env.XDG_CONFIG_HOME
  exit.onQuit = () => saves.flush().then(() => onQuit?.())

  const pageTitle = document.title
  try {
    // Con Asyncify, callMain vuelve en cuanto el juego cede el control por primera vez.
    module.callMain([`--data=${DATA_DIR}`])
  } catch (error) {
    await saves.close()
    throw new Error(log.lastLines(error))
  }

  document.title = pageTitle // SDL le pone "OpenTyrian" al crear la ventana
  canvas.focus()
  const stopWatching = watchCrashes(exit, onError)
  return createController({ module, canvas, saves, exit, stopWatching })
}

// Un error dentro del motor (por ejemplo, leer fuera de su memoria) salta en
// un callback de Asyncify y no pasa por onAbort: llega como promesa rechazada.
// En la página corre un solo motor a la vez, así que todo error de wasm es suyo.
function watchCrashes(exit, onError) {
  const onRejection = (event) => {
    if (!(event.reason instanceof WebAssembly.RuntimeError)) return
    event.preventDefault()
    console.error('Tyrian se cerró por un error del motor:', event.reason)
    exit.exited = true // el motor ya no corre: no hay que volver a llamarlo
    onError?.(`El juego se cerró por un error interno: ${event.reason.message}`)
  }
  window.addEventListener('unhandledrejection', onRejection)
  return () => window.removeEventListener('unhandledrejection', onRejection)
}

function createLog() {
  const lines = []
  return {
    push: (line) => lines.push(line) > LOG_LINES && lines.shift(),
    lastLines: (fallback) => lines.slice(-4).join('\n').trim() || String(fallback?.message ?? fallback),
  }
}

// El motor avisa justo antes de terminar (web_exit en web.c).
function createExitSignal() {
  const signal = { exited: false, destroying: false, onQuit: null }
  signal.promise = new Promise((resolve) => {
    signal.handle = () => {
      signal.exited = true
      resolve()
      if (!signal.destroying) signal.onQuit?.()
    }
  })
  return signal
}

async function createModule({ env, log, exit, canvas, onError }) {
  const createTyrianModule = await loadEngineScript(`${ENGINE_DIR}tyrian.js`, 'createTyrianModule')
  return createTyrianModule({
    canvas,
    // La libc copia las variables de entorno al inicializarse: hay que
    // ponerlas en preRun, antes de eso. Después ya no las ve.
    preRun: [(module) => Object.assign(module.ENV, env)],
    locateFile: (file) => ENGINE_DIR + file,
    print: log.push,
    printErr: log.push,
    onAbort: (reason) => onError?.(log.lastLines(reason)),
    tyrian: { onExit: exit.handle },
  })
}

async function writeGameFiles(FS, zipBytes) {
  FS.mkdir(DATA_DIR)
  for (const entry of listZip(zipBytes)) {
    FS.writeFile(`${DATA_DIR}/${baseName(entry.name)}`, await entry.read())
  }
}

// Variables de entorno que leen el juego y SDL al arrancar.
function environmentFor(saveKey, canvas) {
  return {
    XDG_CONFIG_HOME: `/save/${saveKey}`, // el juego guarda en <esta carpeta>/opentyrian
    SDL_EMSCRIPTEN_KEYBOARD_ELEMENT: `#${canvas.id}`, // teclas solo con el juego enfocado
    SDL_RENDER_DRIVER: 'software', // canvas 2D, como Doom: sin WebGL
  }
}

function createController({ module, canvas, saves, exit, stopWatching }) {
  const audioContext = () => module.SDL2?.audioContext

  function setPaused(paused) {
    if (exit.exited) return
    module._web_set_paused(paused ? 1 : 0)
    if (paused) audioContext()?.suspend()
    else audioContext()?.resume()
    if (!paused) canvas.focus()
  }

  return {
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    destroy: () => destroy({ module, saves, exit, audioContext, stopWatching }),
  }
}

// Pide al juego que guarde y termine; si no responde a tiempo, se abandona igual.
async function destroy({ module, saves, exit, audioContext, stopWatching }) {
  if (exit.destroying) return
  exit.destroying = true
  stopWatching()
  if (!exit.exited) {
    module._web_request_stop()
    module._web_set_paused(0)
    await Promise.race([exit.promise, new Promise((resolve) => setTimeout(resolve, STOP_TIMEOUT_MS))])
  }
  audioContext()?.close()
  await saves.close()
}
