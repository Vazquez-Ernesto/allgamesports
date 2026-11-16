// Runtime de LibreQuake: corre la página games/quake/play.html en un iframe
// (ver ../iframe.js). Esa página baja los datos del juego y arranca el motor
// (FTEQW compilado a WebAssembly).

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/quake/`

export function startQuake({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'LibreQuake',
    source: 'quake',
    src: `${ENGINE_DIR}play.html`,
    // FTEQW crea sus AudioContext por su cuenta; play.js los junta en uno.
    audioContextOf: (win) => win.quakeAudio,
    onQuit,
    onError,
  })
}
