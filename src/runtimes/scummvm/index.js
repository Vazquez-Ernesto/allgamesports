// Runtime de ScummVM: corre la página games/scummvm/play.html en un iframe
// (ver ../iframe.js). Los datos los baja el propio ScummVM a medida que el
// juego los pide (ver play.js).

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/scummvm/`

// Cómo nombra cada motor sus partidas (ver engines/<motor>/ en ScummVM). Los
// que no figuran usan "<juego>.000", "<juego>.001"... porque ScummVM arranca
// con el id del juego como nombre de la partida.
const SAVE_NAMES = {
  sky: /^SKY-VM\.(SAV|\d{3})$/i, // SKY-VM.SAV es la lista con los nombres de las partidas
  queen: /^queen\.s\d{2}$/i,
  dreamweb: /^DREAMWEB\.D\d{2}$/i,
}

// Dónde guarda un juego: $HOME/saves, en la base que comparten todos. Es la
// carpeta que usa la versión para navegador (se vio en la base: no es la
// .local/share/scummvm/saves de Linux).
export function scummvmSaves(gameId) {
  return {
    type: 'idbfs',
    db: '/home/web_user',
    dir: 'saves',
    match: SAVE_NAMES[gameId] ?? new RegExp(`^${gameId}\\.\\d{3}$`, 'i'),
  }
}

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
