// Runtime de ScummVM: corre la página games/scummvm/play.html en un iframe
// (ver lib/engineFrame.js). Los datos los baja el propio ScummVM a medida que
// el juego los pide (ver play.js), que avisa 'ready', 'error' y 'exit'.

import { createEngineIframe, listenToFrame } from '../../lib/engineFrame.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/scummvm/`

/**
 * Arranca un juego de ScummVM.
 *
 * @param {object} options
 * @param {HTMLElement} options.frame      Contenedor donde va el iframe.
 * @param {string} options.gameId          Id de ScummVM ('sky', 'queen'...): también es su carpeta en data/games.
 * @param {string} [options.args]          Opciones extra de ScummVM (p. ej. "--language=es").
 * @param {() => void} [options.onQuit]
 * @param {(message: string) => void} [options.onError]
 */
export async function startScummvm({ frame, gameId, args = '', onQuit, onError }) {
  // Los argumentos de ScummVM van en el #, separados por espacios; el juego, al final.
  const hash = `${`--path=/data/games/${gameId} ${args}`.trim()} ${gameId}`
  const iframe = createEngineIframe(`${ENGINE_DIR}play.html#${hash}`, 'ScummVM')
  const messages = listenToFrame(iframe, 'scummvm')
  frame.appendChild(iframe)

  try {
    await messages.waitFor('ready')
  } catch (error) {
    messages.stop()
    iframe.remove()
    throw error
  }

  messages.onAfterReady({ onQuit, onError })
  iframe.focus()
  return createController(iframe, messages)
}

function createController(iframe, messages) {
  // Mismo origen: se puede llegar al AudioContext de SDL dentro del iframe.
  // ScummVM 2026 usa SDL3 (Doom no usa SDL; Tyrian, SDL2).
  const audioContext = () => iframe.contentWindow?.Module?.SDL3?.audioContext

  return {
    pause: () => audioContext()?.suspend(),
    resume() {
      audioContext()?.resume()
      iframe.focus()
    },
    async destroy() {
      messages.stop()
      iframe.remove()
    },
  }
}
