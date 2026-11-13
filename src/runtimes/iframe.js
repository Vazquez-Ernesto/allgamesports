// Motores que corren en su propia página, dentro de un iframe.
//
// Lo usan los motores que tienen un Module global y no se pueden reiniciar en
// la misma página (ScummVM, Wolfenstein 3D). Arrancar es crear el iframe y
// salir es sacarlo: eso libera el wasm, el audio y los eventos. La página del
// motor avisa con postMessage({ source, type, detail }): 'ready', 'error' y
// 'exit'.

const START_TIMEOUT_MS = 60000

/**
 * @param {object} options
 * @param {HTMLElement} options.frame   Contenedor donde va el iframe.
 * @param {string} options.name         Nombre para mostrar ('ScummVM').
 * @param {string} options.source       Marca de los mensajes de esa página ('scummvm').
 * @param {string} options.src          Dirección de la página del motor.
 * @param {(win: Window) => AudioContext | undefined} options.audioContextOf
 * @param {() => void} [options.onQuit]
 * @param {(message: string) => void} [options.onError]
 */
export async function startIframeEngine({ frame, name, source, src, audioContextOf, onQuit, onError }) {
  const iframe = createIframe(name, src)
  const messages = listenTo(iframe, source, name)
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
  return createController(iframe, messages, audioContextOf)
}

function createIframe(name, src) {
  const iframe = document.createElement('iframe')
  iframe.className = 'player-iframe'
  iframe.title = name
  iframe.allow = 'autoplay; fullscreen'
  iframe.src = src
  return iframe
}

// Escucha los avisos que vienen de ESTE iframe.
function listenTo(iframe, source, name) {
  let handlers = {}
  const onMessage = (event) => {
    if (event.source !== iframe.contentWindow || event.data?.source !== source) return
    handlers[event.data.type]?.(event.data.detail)
  }
  window.addEventListener('message', onMessage)

  return {
    waitForReady: () => waitForReady((next) => (handlers = next), name),
    onAfterReady({ onQuit, onError }) {
      handlers = { exit: () => onQuit?.(), error: (detail) => onError?.(`${name} se cerró por un error: ${detail}`) }
    },
    stop: () => window.removeEventListener('message', onMessage),
  }
}

function waitForReady(setHandlers, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name} tardó demasiado en arrancar.`)), START_TIMEOUT_MS)
    const finish = (callback) => (detail) => {
      clearTimeout(timer)
      callback(detail)
    }
    setHandlers({ ready: finish(resolve), error: finish((detail) => reject(new Error(detail))) })
  })
}

function createController(iframe, messages, audioContextOf) {
  // Mismo origen: se puede llegar al AudioContext de SDL dentro del iframe.
  const audioContext = () => iframe.contentWindow && audioContextOf(iframe.contentWindow)

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
