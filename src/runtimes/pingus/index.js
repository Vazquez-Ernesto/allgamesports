// Runtime de Pingus: corre la página games/pingus/play.html en un iframe
// (ver ../iframe.js). Esa página carga el motor con sus datos.

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/pingus/`
// La primera vez baja unos 40 MB: se le da más tiempo que el minuto normal.
const START_TIMEOUT_MS = 3 * 60 * 1000

export function startPingus({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'Pingus',
    source: 'pingus',
    src: `${ENGINE_DIR}play.html`,
    // OpenAL crea su AudioContext por su cuenta; play.js lo junta en uno.
    audioContextOf: (win) => win.pingusAudio,
    pausesMainLoop: true, // el bucle lo maneja el navegador (emscripten_set_main_loop)
    startTimeoutMs: START_TIMEOUT_MS,
    onQuit,
    onError,
  })
}
