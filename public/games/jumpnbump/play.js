// Arranque de Jump 'n Bump dentro del iframe del reproductor.
//
// Los datos (jumpbump.dat) viajan en jumpnbump.data y el motor los monta en
// /data antes de arrancar. El juego no guarda partidas ni ajustes, así que no
// hace falta IndexedDB. Acá solo se arranca main() con la ruta de los datos y
// se avisa a la página que lo contiene cuándo está listo, si falla o si salió
// (postMessage con { source: 'jumpnbump', type }).

;(function () {
  var DATA_FILE = '/data/jumpbump.dat'
  var lastError = ''

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'jumpnbump', type: type, detail: detail }, window.location.origin)
    }
  }

  function start() {
    notify('ready')
    Module.callMain(['-dat', DATA_FILE])
  }

  // El juego sale con 0 al apretar Esc en el menú, y con 1 si falla.
  function onExit(code) {
    if (code === 0) notify('exit')
    else notify('error', lastError || 'código ' + code)
  }

  // Modo captura (play.html?captura): conserva la imagen del canvas para
  // poder copiarla y sacar la portada. No se usa al jugar.
  if (window.location.search.indexOf('captura') !== -1) {
    var realGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return realGetContext.call(this, type, Object.assign({}, options, { preserveDrawingBuffer: true }))
    }
  }

  window.Module = {
    canvas: document.getElementById('canvas'),
    printErr: function (text) {
      lastError = text
      console.error(text)
    },
    onRuntimeInitialized: function () {
      try {
        start()
      } catch (error) {
        notify('error', error.message)
      }
    },
    onAbort: function (reason) {
      notify('error', String(reason))
    },
    onExit: onExit,
  }

  // Con Asyncify, los errores del motor llegan como promesas rechazadas.
  window.addEventListener('unhandledrejection', function (event) {
    if (event.reason instanceof WebAssembly.RuntimeError) notify('error', event.reason.message)
  })
})()
