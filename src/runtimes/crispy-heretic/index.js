// Runtime de Crispy Heretic: corre la página games/crispy-heretic/play.html
// en un iframe (ver ../iframe.js). Esa página baja los datos de Blasphemer y
// arranca el motor (Crispy Heretic compilado a WebAssembly).

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/crispy-heretic/`

export function startCrispyHeretic({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'Blasphemer',
    source: 'crispy-heretic',
    src: `${ENGINE_DIR}play.html`,
    audioContextOf: (win) => win.Module?.SDL2?.audioContext,
    onQuit,
    onError,
  })
}
