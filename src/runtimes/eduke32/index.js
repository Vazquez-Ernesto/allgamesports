// Runtime de EDuke32 (Duke Nukem 3D): corre la página games/eduke32/play.html
// en un iframe (ver ../iframe.js). Esa página baja el paquete shareware
// original, lo descomprime y arranca el motor.

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/eduke32/`

export function startEduke32({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'Duke Nukem 3D',
    source: 'eduke32',
    src: `${ENGINE_DIR}play.html`,
    audioContextOf: (win) => win.Module?.SDL2?.audioContext,
    onQuit,
    onError,
  })
}
