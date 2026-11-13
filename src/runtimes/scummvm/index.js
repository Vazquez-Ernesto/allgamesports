// Runtime de ScummVM: corre la página games/scummvm/play.html en un iframe
// (ver ../iframe.js). Los datos los baja el propio ScummVM a medida que el
// juego los pide (ver play.js).

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/scummvm/`

/**
 * Arranca un juego de ScummVM.
 *
 * @param {object} options
 * @param {HTMLElement} options.frame      Contenedor donde va el iframe.
 * @param {string} options.gameId          Id de ScummVM ('sky', 'queen'...): también es su carpeta en data/games.
 * @param {string} [options.args]         Opciones extra de ScummVM (p. ej. "--language=es").
 * @param {() => void} [options.onQuit]
 * @param {(message: string) => void} [options.onError]
 */
export function startScummvm({ frame, gameId, args = '', onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'ScummVM',
    source: 'scummvm',
    // Los argumentos de ScummVM van en el #, separados por espacios; el juego, al final.
    src: `${ENGINE_DIR}play.html#${`--path=/data/games/${gameId} ${args}`.trim()} ${gameId}`,
    // ScummVM 2026 usa SDL3 (Doom no usa SDL; Tyrian y Wolfenstein, SDL2).
    audioContextOf: (win) => win.Module?.SDL3?.audioContext,
    onQuit,
    onError,
  })
}
