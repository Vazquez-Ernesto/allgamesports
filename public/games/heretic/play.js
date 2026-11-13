// Arranque de Heretic dentro del iframe del reproductor.
//
// 1. Baja los datos del juego (heretic1.wadgz, comprimido con gzip), los
//    descomprime y los copia al sistema de archivos en memoria del motor.
// 2. Monta /save-heretic sobre IndexedDB: ahí van la configuración y las
//    partidas.
// 3. Llama a main() y avisa a la página que lo contiene cuándo está listo, si
//    falla o si salió (postMessage con { source: 'heretic', type }).

;(function () {
  var WAD_URL = 'heretic1.wadgz'
  var WAD_PATH = '/heretic1.wad'
  // La ruta le da nombre a la base de IndexedDB: una propia por juego.
  var SAVE_DIR = '/save-heretic'
  var SAVE_EVERY_MS = 5000
  var lastError = ''

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'heretic', type: type, detail: detail }, window.location.origin)
    }
  }

  async function copyGameData() {
    var response = await fetch(WAD_URL)
    if (!response.ok) throw new Error('No se pudieron bajar los datos del juego.')
    var stream = response.body.pipeThrough(new DecompressionStream('gzip'))
    Module.FS.writeFile(WAD_PATH, new Uint8Array(await new Response(stream).arrayBuffer()))
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

  // -window: sin esto pide pantalla completa, que el navegador no da sola.
  function gameArguments() {
    return [
      '-iwad', WAD_PATH,
      '-window',
      '-savedir', SAVE_DIR + '/',
      '-config', SAVE_DIR + '/heretic.cfg',
      '-extraconfig', SAVE_DIR + '/chocolate-heretic.cfg',
    ]
  }

  async function start() {
    await Promise.all([copyGameData(), mountSaves()])
    notify('ready')
    Module.callMain(gameArguments())
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
