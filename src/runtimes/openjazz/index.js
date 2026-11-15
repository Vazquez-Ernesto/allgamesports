// Runtime de OpenJazz (Jazz Jackrabbit): corre la página
// games/openjazz/play.html en un iframe (ver ../iframe.js). Esa página baja
// el paquete shareware original, lo descomprime y arranca el motor.

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/openjazz/`

/**
 * @param {object} options
 * @param {HTMLElement} options.frame  Contenedor donde va el iframe.
 * @param {string} options.gameId      Qué paquete cargar: 'jazz', 'xmas94' o 'xmas95' (ver play.js).
 */
export function startOpenjazz({ frame, gameId, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'Jazz Jackrabbit',
    source: 'openjazz',
    src: `${ENGINE_DIR}play.html#${gameId}`,
    audioContextOf: (win) => win.Module?.SDL2?.audioContext,
    onQuit,
    onError,
  })
}
