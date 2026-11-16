// Arranque de Rise of the Triad (taradino) dentro del iframe del reproductor.
//
// Los datos del shareware viajan en rott.data y el motor los monta en /data
// antes de arrancar. Acá:
// 1. Se monta /libsdl/taradino sobre IndexedDB: ahí guarda SDL las
//    "preferencias" del programa, y ahí escribe taradino su configuración y
//    sus partidas.
// 2. Se arranca main() con /data como carpeta actual (el motor busca los
//    archivos del juego en la carpeta actual).
// 3. Se avisa a la página que lo contiene cuándo está listo, si falla o si
//    salió (postMessage con { source: 'rott', type }).

;(function () {
  var DATA_DIR = '/data'
  // SDL_GetPrefPath("", "taradino"). La ruta de montaje le da nombre a la base
  // de IndexedDB: se monta la carpeta del juego y no /libsdl entero, que
  // comparten todos los juegos con SDL (Duke Nukem II también guarda ahí).
  var PREFS_DIR = '/libsdl/taradino'
  var SAVE_EVERY_MS = 5000
  var lastError = ''

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'rott', type: type, detail: detail }, window.location.origin)
    }
  }

  // syncfs(true) trae de IndexedDB lo guardado; syncfs(false) lo lleva.
  function syncSaves(fromBrowser) {
    return new Promise(function (resolve) {
      Module.FS.syncfs(fromBrowser, resolve)
    })
  }

  async function mountSaves() {
    Module.FS.mkdirTree(PREFS_DIR)
    Module.FS.mount(Module.IDBFS, {}, PREFS_DIR)
    await syncSaves(true)
    setInterval(syncSaves, SAVE_EVERY_MS, false)
  }

  async function start() {
    await mountSaves()
    Module.FS.chdir(DATA_DIR)
    notify('ready')
    // WINDOW: sin esto pide pantalla completa, que el navegador no da sola.
    Module.callMain(['WINDOW'])
  }

  async function onExit(code) {
    await syncSaves(false)
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
      start().catch(function (error) {
        notify('error', error.message)
      })
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
