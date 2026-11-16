// Arranque de SuperTux dentro del iframe del reproductor.
//
// SuperTux trae su propia página para navegador; esta la reemplaza. El motor
// llama a varias funciones de JavaScript que esa página definía
// (window.supertux_*): acá están las que hacen falta para jugar.
//
// Los datos llegan en varios paquetes (data/*.js + data/*.data, armados por
// engines/supertux/prepare-data.sh) que se cargan antes del motor y quedan en
// /data. El guardado (partidas y ajustes) va a IndexedDB.

;(function () {
  var USER_DIR = '/home/web_user/.local/share/supertux2'
  var SAVE_EVERY_MS = 10000

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'supertux', type: type, detail: detail }, window.location.origin)
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

  // Antes de main(): el guardado ya montado. Los datos van en /data (ver
  // engines/supertux/patches/0003-datos-en-data.patch).
  function prepare() {
    Module.FS.mkdirTree(USER_DIR)
    Module.FS.mount(Module.IDBFS, {}, USER_DIR)
    Module.addRunDependency('guardado')
    syncSaves(true, function () {
      Module.removeRunDependency('guardado')
    })
    setInterval(syncSaves, SAVE_EVERY_MS, false)
  }

  // --- Funciones que llama el motor ------------------------------------------

  // Al terminar de arrancar.
  window.supertux_onready = function () {
    notify('ready')
    fitToWindow()
  }
  // Cada vez que guarda algo.
  window.supertux2_syncfs = function () {
    syncSaves(false)
  }
  window.supertux2_ispersistent = function () {
    return 1
  }
  // La configuración ya vive en IndexedDB con el resto del guardado.
  window.supertux_loadFiles = function () {}
  window.supertux_saveFiles = function () {
    syncSaves(false)
  }
  window.supertux_setAutofit = function () {
    fitToWindow()
  }
  // El editor de niveles exporta e importa archivos: no se usa en el sitio.
  window.supertux_download = function () {}
  window.supertux_upload = function () {}
  // Descargas de complementos desde internet: no se usan en el sitio.
  window.supertux_xhr_file_download = function (pointer, id) {
    Module.ccall('onDownloadError', null, ['number', 'number'], [pointer, id])
  }
  window.supertux_xhr_string_download = window.supertux_xhr_file_download

  // El juego dibuja al tamaño de la ventana (del iframe).
  function fitToWindow() {
    try {
      Module.ccall('set_resolution', null, ['number', 'number'], [window.innerWidth, window.innerHeight])
    } catch (error) {}
  }
  window.addEventListener('resize', fitToWindow)

  // --- Audio -----------------------------------------------------------------
  // El motor crea sus AudioContext por su cuenta; se los anota para que la
  // pausa del reproductor pueda callarlos (window.supertuxAudio).
  var contexts = []
  var RealAudioContext = window.AudioContext
  window.AudioContext = function (options) {
    var context = new RealAudioContext(options)
    contexts.push(context)
    return context
  }
  window.AudioContext.prototype = RealAudioContext.prototype
  window.supertuxAudio = {
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
    locateFile: function (path) {
      return path.endsWith('.data') ? 'data/' + path : path
    },
    onAbort: function (reason) {
      notify('error', String(reason))
    },
  }

  window.addEventListener('unhandledrejection', function (event) {
    if (event.reason instanceof WebAssembly.RuntimeError) notify('error', event.reason.message)
  })
})()
