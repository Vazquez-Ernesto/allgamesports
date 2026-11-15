// Arranque de OpenJazz dentro del iframe del reproductor.
//
// El juego va en el #: play.html#jazz, #xmas94 o #xmas95.
//
// 1. Baja el paquete shareware original (un .zip, tal cual lo publicó Epic
//    MegaGames: su licencia pide repartirlo completo y sin tocar) y lo
//    descomprime acá, en el navegador, al sistema de archivos en memoria.
// 2. Monta una carpeta sobre IndexedDB para la configuración y las partidas.
// 3. Llama a main() y avisa a la página que lo contiene cuándo está listo, si
//    falla o si salió (postMessage con { source: 'openjazz', type }).

;(function () {
  var PACKAGES = { jazz: 'jazz.zip', xmas94: 'JAZZXMAS.ZIP', xmas95: 'JJXMAS95.ZIP' }
  var DATA_DIR = '/data'
  var SAVE_EVERY_MS = 5000
  var gameId = window.location.hash.slice(1)
  // La ruta le da nombre a la base de IndexedDB: una por juego.
  var saveDir = '/save-openjazz-' + gameId
  var lastError = ''

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'openjazz', type: type, detail: detail }, window.location.origin)
    }
  }

  // --- Lector de .zip -------------------------------------------------------
  // Un zip termina con un índice (el "directorio central") que dice dónde
  // empieza cada archivo, cuánto ocupa y si está comprimido.

  function findDirectory(view) {
    for (var at = view.byteLength - 22; at >= 0; at--) {
      if (view.getUint32(at, true) === 0x06054b50) {
        return { count: view.getUint16(at + 10, true), offset: view.getUint32(at + 16, true) }
      }
    }
    throw new Error('El paquete del juego está dañado.')
  }

  function readEntry(view, bytes, at) {
    var nameLength = view.getUint16(at + 28, true)
    var local = view.getUint32(at + 42, true)
    var dataStart = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    return {
      name: new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength)),
      compressed: view.getUint16(at + 10, true) === 8,
      data: bytes.subarray(dataStart, dataStart + view.getUint32(at + 20, true)),
      next: at + 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true),
    }
  }

  async function inflate(data) {
    var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }

  async function unzipTo(bytes, dir) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    var directory = findDirectory(view)
    var at = directory.offset
    for (var i = 0; i < directory.count; i++) {
      var entry = readEntry(view, bytes, at)
      at = entry.next
      if (entry.name.endsWith('/')) continue
      Module.FS.writeFile(dir + '/' + entry.name, entry.compressed ? await inflate(entry.data) : entry.data)
    }
  }

  // --- Arranque -------------------------------------------------------------

  async function copyGameData() {
    var response = await fetch(PACKAGES[gameId])
    if (!response.ok) throw new Error('No se pudieron bajar los datos del juego.')
    Module.FS.mkdir(DATA_DIR)
    await unzipTo(new Uint8Array(await response.arrayBuffer()), DATA_DIR)
  }

  // syncfs(true) trae de IndexedDB lo guardado; syncfs(false) lo lleva.
  function syncSaves(fromBrowser) {
    return new Promise(function (resolve) {
      Module.FS.syncfs(fromBrowser, resolve)
    })
  }

  async function mountSaves() {
    Module.FS.mkdir(saveDir)
    Module.FS.mount(Module.IDBFS, {}, saveDir)
    await syncSaves(true)
    setInterval(syncSaves, SAVE_EVERY_MS, false)
  }

  async function start() {
    if (!PACKAGES[gameId]) throw new Error('Juego desconocido: ' + gameId)
    await Promise.all([copyGameData(), mountSaves()])
    // OpenJazz guarda su configuración y sus partidas en la carpeta actual.
    Module.FS.chdir(saveDir)
    notify('ready')
    // --scale 2: dibuja a 320x240 y lo agranda al doble, como se veía el
    // original (sin esto usa 640x480 y los personajes quedan chiquitos).
    Module.callMain(['--scale', '2', DATA_DIR + '/'])
  }

  async function onExit(code) {
    await syncSaves(false)
    if (code === 0) notify('exit')
    else notify('error', lastError || 'código ' + code)
  }

  // Modo captura (play.html?captura#jazz): conserva la imagen del canvas para
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
