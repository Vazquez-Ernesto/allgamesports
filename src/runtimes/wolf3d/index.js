// Runtime de Wolfenstein 3D: corre la página games/wolf3d/play.html en un
// iframe (ver ../iframe.js). Esa página baja los datos del juego y arranca el
// motor (Wolf4SDL compilado a WebAssembly).

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/wolf3d/`

export function startWolf3d({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'Wolfenstein 3D',
    source: 'wolf3d',
    src: `${ENGINE_DIR}play.html`,
    audioContextOf: (win) => win.Module?.SDL2?.audioContext,
    onQuit,
    onError,
  })
}
