// Arranque de Wolfenstein 3D dentro del iframe del reproductor.
//
// 1. Baja los archivos del juego (data/*.wl1) y los copia al sistema de
//    archivos en memoria del motor, que los busca en su carpeta de trabajo.
// 2. Monta /save sobre IndexedDB: ahí van la configuración y las partidas.
// 3. Llama a main() y avisa a la página que lo contiene cuándo está listo, si
//    falla o si salió (postMessage con { source: 'wolf3d', type }).

;(function () {
  var DATA_FILES = ['audiohed', 'audiot', 'gamemaps', 'maphead', 'vgadict', 'vgagraph', 'vgahead', 'vswap']
  // La ruta le da nombre a la base de IndexedDB: propia, para no mezclarse
  // con las partidas de Doom, que usa /save.
  var SAVE_DIR = '/save-wolf3d'
  var SAVE_EVERY_MS = 5000
  var lastError = ''

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'wolf3d', type: type, detail: detail }, window.location.origin)
    }
  }

  async function copyDataFile(name) {
    var response = await fetch('data/' + name + '.wl1')
    if (!response.ok) throw new Error('No se pudo bajar ' + name + '.wl1')
    Module.FS.writeFile('/' + name + '.wl1', new Uint8Array(await response.arrayBuffer()))
  }

  // syncfs(true) trae de IndexedDB lo guardado; syncfs(false) lo lleva.
  function syncSaves(fromBrowser) {
    return new Promise(function (resolve) {
      Module.FS.syncfs(fromBrowser, resolve)
    })
  }

  async function mountSaves() {
    Module.FS.mkdir(SAVE_DIR)
    Module.FS.mount(Module.IDBFS, {}, SAVE_DIR)
    await syncSaves(true)
    setInterval(syncSaves, SAVE_EVERY_MS, false)
  }

  async function start() {
    await Promise.all(DATA_FILES.map(copyDataFile).concat(mountSaves()))
    notify('ready')
    // --windowed: sin esto pide pantalla completa, que el navegador no da sola.
    Module.callMain(['--windowed', '--configdir', SAVE_DIR])
  }

  async function onExit(code) {
    await syncSaves(false)
    if (code === 0) notify('exit')
    else notify('error', lastError || 'código ' + code)
  }

  // Modo captura (play.html?captura): el juego dibuja con WebGL, que borra la
  // imagen después de mostrarla. Con esto se conserva y se puede copiar el
  // canvas para sacar la portada. No se usa al jugar.
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
