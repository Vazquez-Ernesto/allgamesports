// Runtime de Duke Nukem II: corre la página games/rigel/play.html en un
// iframe (ver ../iframe.js). El motor es RigelEngine compilado a WebAssembly
// y baja junto con los datos del shareware.

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/rigel/`

export function startRigel({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'Duke Nukem II',
    source: 'rigel',
    src: `${ENGINE_DIR}play.html`,
    audioContextOf: (win) => win.Module?.SDL2?.audioContext,
    pausesMainLoop: true, // el bucle del juego lo maneja el navegador, como en OpenTTD
    onQuit,
    onError,
  })
}
