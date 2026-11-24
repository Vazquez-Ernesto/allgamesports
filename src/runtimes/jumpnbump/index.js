// Runtime de Jump 'n Bump: corre la página games/jumpnbump/play.html en un
// iframe (ver ../iframe.js). Esa página arranca el motor (el juego original
// compilado a WebAssembly) con sus datos adentro.

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/jumpnbump/`

export function startJumpnbump({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: "Jump 'n Bump",
    source: 'jumpnbump',
    src: `${ENGINE_DIR}play.html`,
    audioContextOf: (win) => win.Module?.SDL2?.audioContext,
    onQuit,
    onError,
  })
}
