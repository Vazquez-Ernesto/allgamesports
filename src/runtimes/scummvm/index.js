// Runtime de ScummVM: corre la página games/scummvm/play.html en un iframe.
//
// ScummVM usa un Module global y no se puede reiniciar dentro de la misma
// página, así que vive en su propio documento: arrancar es crear el iframe y
// salir es sacarlo (eso libera el wasm, el audio y los eventos). Los datos los
// baja el propio ScummVM a medida que el juego los pide (ver play.js).
// play.js avisa con postMessage: 'ready', 'error' y 'exit'.

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/scummvm/`
const START_TIMEOUT_MS = 60000

/**
 * Arranca un juego de ScummVM.
 *
 * @param {object} options
 * @param {HTMLElement} options.frame      Contenedor donde va el iframe.
 * @param {string} options.gameId          Id de ScummVM ('sky', 'queen'...): también es su carpeta en data/games.
 * @param {() => void} [options.onQuit]
 * @param {(message: string) => void} [options.onError]
 */
export async function startScummvm({ frame, gameId, onQuit, onError }) {
  const iframe = createIframe(gameId)
  const messages = listenTo(iframe)
  frame.appendChild(iframe)

  try {
    await messages.waitForReady()
  } catch (error) {
    messages.stop()
    iframe.remove()
    throw error
  }

  messages.onAfterReady({ onQuit, onError })
  iframe.focus()
  return createController(iframe, messages)
}

function createIframe(gameId) {
  const iframe = document.createElement('iframe')
  iframe.className = 'player-iframe'
  iframe.title = 'ScummVM'
  iframe.allow = 'autoplay; fullscreen'
  iframe.src = `${ENGINE_DIR}play.html#--path=/data/games/${gameId} ${gameId}`
  return iframe
}

// Escucha los avisos de play.js que vienen de ESTE iframe.
function listenTo(iframe) {
  let handlers = {}
  const onMessage = (event) => {
    if (event.source !== iframe.contentWindow || event.data?.source !== 'scummvm') return
    handlers[event.data.type]?.(event.data.detail)
  }
  window.addEventListener('message', onMessage)

  return {
    waitForReady: () => waitForReady((next) => (handlers = next)),
    onAfterReady({ onQuit, onError }) {
      handlers = { exit: () => onQuit?.(), error: (detail) => onError?.(`ScummVM se cerró por un error: ${detail}`) }
    },
    stop: () => window.removeEventListener('message', onMessage),
  }
}

function waitForReady(setHandlers) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ScummVM tardó demasiado en arrancar.')), START_TIMEOUT_MS)
    const finish = (callback) => (detail) => {
      clearTimeout(timer)
      callback(detail)
    }
    setHandlers({ ready: finish(resolve), error: finish((detail) => reject(new Error(detail))) })
  })
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
