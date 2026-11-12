// Motores que corren en su propia página, dentro de un iframe (ScummVM,
// OpenLara). Usan un Module global y no se pueden reiniciar en la misma
// página: arrancar es crear el iframe y salir es sacarlo, que libera el wasm,
// el audio y los eventos.
//
// La página del motor avisa con postMessage({ source, type, detail }), donde
// source es el nombre del motor y type es 'ready', 'error', 'exit' u otro.

const START_TIMEOUT_MS = 60000

export function createEngineIframe(src, title) {
  const iframe = document.createElement('iframe')
  iframe.className = 'player-iframe'
  iframe.title = title
  iframe.allow = 'autoplay; fullscreen'
  iframe.src = src
  return iframe
}

// Escucha los avisos que vienen de ESTE iframe y de ese motor.
export function listenToFrame(iframe, source) {
  let handlers = {}
  const onMessage = (event) => {
    if (event.source !== iframe.contentWindow || event.data?.source !== source) return
    handlers[event.data.type]?.(event.data.detail)
  }
  window.addEventListener('message', onMessage)

  return {
    // Espera un aviso (por defecto 'ready'); un 'error' antes lo rechaza.
    waitFor: (type = 'ready') => waitFor(type, source, (next) => (handlers = next)),
    onAfterReady({ onQuit, onError }) {
      handlers = { exit: () => onQuit?.(), error: (detail) => onError?.(`El juego se cerró por un error: ${detail || 'falla interna del motor'}`) }
    },
    stop: () => window.removeEventListener('message', onMessage),
  }
}

function waitFor(type, source, setHandlers) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${source} tardó demasiado en arrancar.`)), START_TIMEOUT_MS)
    const finish = (callback) => (detail) => {
      clearTimeout(timer)
      callback(detail)
    }
    setHandlers({ [type]: finish(resolve), error: finish((detail) => reject(new Error(detail))) })
  })
}
