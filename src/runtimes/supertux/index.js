// Runtime de SuperTux: corre la página games/supertux/play.html en un iframe
// (ver ../iframe.js). Esa página carga los paquetes de datos y el motor.

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/supertux/`
// La primera vez baja unos cuantos MB: se le da más tiempo que al resto.
const START_TIMEOUT_MS = 5 * 60 * 1000

export function startSupertux({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'SuperTux',
    source: 'supertux',
    src: `${ENGINE_DIR}play.html`,
    // SuperTux crea sus AudioContext por su cuenta; play.js los junta en uno.
    audioContextOf: (win) => win.supertuxAudio,
    pausesMainLoop: true, // el bucle lo maneja el navegador (emscripten_set_main_loop)
    startTimeoutMs: START_TIMEOUT_MS,
    onQuit,
    onError,
  })
}
