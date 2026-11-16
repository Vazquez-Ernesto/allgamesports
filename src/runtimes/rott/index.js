// Runtime de Rise of the Triad: corre la página games/rott/play.html en un
// iframe (ver ../iframe.js). Esa página baja los datos del juego y arranca el
// motor (taradino compilado a WebAssembly).

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/rott/`

export function startRott({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'Rise of the Triad',
    source: 'rott',
    src: `${ENGINE_DIR}play.html`,
    audioContextOf: (win) => win.Module?.SDL2?.audioContext,
    onQuit,
    onError,
  })
}
