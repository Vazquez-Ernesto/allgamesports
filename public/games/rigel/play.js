// Arranque de Duke Nukem II (RigelEngine) dentro del iframe del reproductor.
//
// Los datos del shareware viajan en RigelEngine.data, que el propio motor
// baja y monta antes de arrancar. Acá solo hace falta:
// 1. Montar sobre IndexedDB la carpeta donde el motor guarda el perfil del
//    jugador (ajustes, partidas y puntajes).
// 2. Traducir sus avisos a postMessage({ source: 'rigel', type }) para la
//    página que contiene el iframe.

;(function () {
  // SDL pone ahí las "preferencias" de cada programa (SDL_GetPrefPath).
  var PROFILE_DIR = '/libsdl'
  var SAVE_EVERY_MS = 5000

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'rigel', type: type, detail: detail }, window.location.origin)
    }
  }

  // syncfs(true) trae de IndexedDB lo guardado; syncfs(false) lo lleva.
  function syncProfile(fromBrowser) {
    return new Promise(function (resolve) {
      Module.FS.syncfs(fromBrowser, resolve)
    })
  }

  // preRun corre antes de main(): la "dependencia" lo hace esperar hasta que
  // el perfil guardado esté copiado.
  function mountProfile() {
    Module.FS.mkdir(PROFILE_DIR)
    Module.FS.mount(Module.IDBFS, {}, PROFILE_DIR)
    Module.addRunDependency('perfil')
    syncProfile(true).then(function () {
      Module.removeRunDependency('perfil')
      setInterval(syncProfile, SAVE_EVERY_MS, false)
    })
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
    preRun: [mountProfile],
    // Los llama el motor (parche engines/rigel/patches/0001).
    onRigelReady: function () {
      notify('ready')
    },
    onRigelExit: function () {
      syncProfile(false).then(function () {
        notify('exit')
      })
    },
    onAbort: function (reason) {
      notify('error', String(reason))
    },
  }

  window.addEventListener('unhandledrejection', function (event) {
    if (event.reason instanceof WebAssembly.RuntimeError) notify('error', event.reason.message)
  })
})()
