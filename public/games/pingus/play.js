// Arranque de Pingus dentro del iframe del reproductor.
//
// El motor trae sus datos en pingus.data (los monta solo en /data). Esta
// página agrega lo que el build de Pingus deja para después: guardar el
// progreso en IndexedDB, avisar al reproductor y poder pausar.

;(function () {
  var USER_DIR = '/pingus-user'
  var SAVE_EVERY_MS = 10000

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'pingus', type: type, detail: detail }, window.location.origin)
    }
  }

  function syncSaves(fromBrowser, done) {
    try {
      Module.FS.syncfs(fromBrowser, function () {
        if (done) done()
      })
    } catch (error) {
      if (done) done()
    }
  }

  // Antes de main(): el progreso guardado ya montado en /pingus-user.
  function prepare() {
    Module.FS.mkdirTree(USER_DIR)
    Module.FS.mount(Module.IDBFS, {}, USER_DIR)
    Module.addRunDependency('guardado')
    syncSaves(true, function () {
      Module.removeRunDependency('guardado')
    })
    setInterval(syncSaves, SAVE_EVERY_MS, false)
    window.addEventListener('pagehide', function () {
      syncSaves(false)
    })
  }

  // --- Audio -----------------------------------------------------------------
  // OpenAL crea su AudioContext por su cuenta; se lo anota para que la pausa
  // del reproductor lo pueda callar (window.pingusAudio).
  var contexts = []
  var RealAudioContext = window.AudioContext
  window.AudioContext = function (options) {
    var context = new RealAudioContext(options)
    contexts.push(context)
    return context
  }
  window.AudioContext.prototype = RealAudioContext.prototype
  window.pingusAudio = {
    suspend: function () {
      contexts.forEach(function (context) {
        if (context.state === 'running') context.suspend()
      })
    },
    resume: function () {
      contexts.forEach(function (context) {
        if (context.state === 'suspended') context.resume()
      })
    },
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
    preRun: [prepare],
    // main() ya armó el bucle del juego: está listo.
    postRun: [
      function () {
        notify('ready')
      },
    ],
    // La pausa del reproductor (iframe.js) frena el bucle con estas dos.
    pauseMainLoop: function () {
      Module._emscripten_pause_main_loop()
    },
    resumeMainLoop: function () {
      Module._emscripten_resume_main_loop()
    },
    locateFile: function (path) {
      return path
    },
    onAbort: function (reason) {
      notify('error', String(reason))
    },
  }

  window.addEventListener('unhandledrejection', function (event) {
    if (event.reason instanceof WebAssembly.RuntimeError) notify('error', event.reason.message)
  })
})()
