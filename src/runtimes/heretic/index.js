// Runtime de Heretic: corre la página games/heretic/play.html en un
// iframe (ver ../iframe.js). Esa página baja los datos del juego y arranca el
// motor (Chocolate Heretic compilado a WebAssembly).

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/heretic/`

export function startHeretic({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'Heretic',
    source: 'heretic',
    src: `${ENGINE_DIR}play.html`,
    audioContextOf: (win) => win.Module?.SDL2?.audioContext,
    onQuit,
    onError,
  })
}
