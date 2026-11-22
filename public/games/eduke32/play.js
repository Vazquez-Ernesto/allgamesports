// Arranque de Duke Nukem 3D (EDuke32) dentro del iframe del reproductor.
//
// 1. Baja el paquete shareware original (3dduke13.zip, tal cual lo publicó
//    3D Realms: su licencia pide repartirlo completo y sin tocar). Adentro
//    trae DN3DSW13.SHR, que es otro .zip con los archivos del juego: se
//    descomprimen los dos acá, en el navegador, a /duke3d.
// 2. Monta /save-duke3d sobre IndexedDB y se para ahí: EDuke32 guarda la
//    configuración y las partidas en la carpeta actual.
// 3. Llama a main() y avisa a la página que lo contiene cuándo está listo, si
//    falla o si salió (postMessage con { source: 'eduke32', type }).

;(function () {
  var PACKAGE = '3dduke13.zip'
  var INNER_PACKAGE = 'DN3DSW13.SHR'
  var DATA_DIR = '/duke3d'
  // La ruta le da nombre a la base de IndexedDB: una propia por juego.
  var SAVE_DIR = '/save-duke3d'
  var SAVE_EVERY_MS = 5000
  // Sin esto EDuke32 puede arrancar en pantalla completa o con pantalla negra:
  // ventana de 640x480 a 8 bits, el modo del renderer clásico.
  var FIRST_CONFIG = '[Screen Setup]\nScreenMode = 0\nScreenWidth = 640\nScreenHeight = 480\nScreenBPP = 8\n'
  // Teclas: las originales de Duke Nukem 3D, que EDuke32 trae como "clásicas"
  // (oldkeydefaults en source/duke3d/src/_functio.h). Las modernas avanzan
  // con W y disparan con Ctrl, y Ctrl+W cierra la pestaña sin que la página
  // pueda evitarlo. Se omiten W y T (funciones del multijugador): con Ctrl
  // apretado serían Ctrl+W y Ctrl+T.
  var CLASSIC_KEYS = [
    ['Move_Forward', 'Up', 'Kpad8'], ['Move_Backward', 'Down', 'Kpad2'],
    ['Turn_Left', 'Left', 'Kpad4'], ['Turn_Right', 'Right', 'KPad6'],
    ['Strafe', 'LAlt', 'RAlt'], ['Fire', 'LCtrl', 'RCtrl'], ['Open', 'Space'],
    ['Run', 'LShift', 'RShift'], ['Jump', 'A', '/'], ['Crouch', 'Z'],
    ['Look_Up', 'PgUp', 'Kpad9'], ['Look_Down', 'PgDn', 'Kpad3'],
    ['Look_Left', 'Insert', 'Kpad0'], ['Look_Right', 'Delete', 'Kpad.'],
    ['Strafe_Left', ','], ['Strafe_Right', '.'], ['Aim_Up', 'Home', 'KPad7'], ['Aim_Down', 'End', 'Kpad1'],
    ['Weapon_1', '1'], ['Weapon_2', '2'], ['Weapon_3', '3'], ['Weapon_4', '4'], ['Weapon_5', '5'],
    ['Weapon_6', '6'], ['Weapon_7', '7'], ['Weapon_8', '8'], ['Weapon_9', '9'], ['Weapon_10', '0'],
    ['Inventory', 'Enter', 'KpdEnt'], ['Inventory_Left', '['], ['Inventory_Right', ']'],
    ['Holo_Duke', 'H'], ['Jetpack', 'J'], ['NightVision', 'N'], ['MedKit', 'M'],
    ['TurnAround', 'BakSpc'], ['Map', 'Tab'], ['Shrink_Screen', '-', 'Kpad-'], ['Enlarge_Screen', '=', 'Kpad+'],
    ['Center_View', 'KPad5'], ['Holster_Weapon', 'ScrLck'], ['Map_Follow_Mode', 'F'], ['See_Coop_View', 'K'],
    ['Mouse_Aiming', 'U'], ['Toggle_Crosshair', 'I'], ['Steroids', 'R'], ['Quick_Kick', '`'],
    ['Next_Weapon', "'"], ['Previous_Weapon', ';'], ['Show_Console', 'C'], ['AutoRun', 'CapLck'],
    ['Quick_Save', 'F6'], ['Quick_Load', 'F9'], ['Third_Person_View', 'F7'],
  ]
  var lastError = ''

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'eduke32', type: type, detail: detail }, window.location.origin)
    }
  }

  // --- Lector de .zip (el mismo esquema que games/openjazz/play.js) ---------
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

  // Devuelve [{ name, bytes }] con cada archivo del zip ya descomprimido.
  async function readZip(bytes) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    var directory = findDirectory(view)
    var files = []
    for (var i = 0, at = directory.offset; i < directory.count; i++) {
      var entry = readEntry(view, bytes, at)
      at = entry.next
      if (entry.name.endsWith('/')) continue
      files.push({ name: entry.name, bytes: entry.compressed ? await inflate(entry.data) : entry.data })
    }
    return files
  }

  // --- Arranque -------------------------------------------------------------

  async function copyGameData() {
    var response = await fetch(PACKAGE)
    if (!response.ok) throw new Error('No se pudieron bajar los datos del juego.')
    var outer = await readZip(new Uint8Array(await response.arrayBuffer()))
    var inner = outer.find(function (file) { return file.name.toUpperCase() === INNER_PACKAGE })
    if (!inner) throw new Error('El paquete del juego está incompleto.')
    Module.FS.mkdir(DATA_DIR)
    var files = await readZip(inner.bytes)
    files.forEach(function (file) { Module.FS.writeFile(DATA_DIR + '/' + file.name, file.bytes) })
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

  // settings.cfg: comandos de consola que EDuke32 lee al arrancar (y reescribe
  // al salir, con los cambios del jugador).
  function classicSettings() {
    var lines = ['unbindall']
    CLASSIC_KEYS.forEach(function (entry) {
      entry.slice(1).forEach(function (key) { lines.push('bind "' + key + '" "gamefunc_' + entry[0] + '"') })
    })
    return lines.join('\n') + '\n'
  }

  function writeIfMissing(name, text) {
    var path = SAVE_DIR + '/' + name
    if (!Module.FS.analyzePath(path).exists) Module.FS.writeFile(path, text)
  }

  function writeFirstConfig() {
    writeIfMissing('eduke32.cfg', FIRST_CONFIG)
    writeIfMissing('settings.cfg', classicSettings())
  }

  // -nosetup: sin la ventana de configuración inicial. -j: carpeta de datos.
  async function start() {
    await Promise.all([copyGameData(), mountSaves()])
    writeFirstConfig()
    Module.FS.chdir(SAVE_DIR)
    notify('ready')
    Module.callMain(['-nosetup', '-j' + DATA_DIR])
  }

  async function onExit(code) {
    await syncSaves(false)
    if (code === 0) notify('exit')
    else notify('error', lastError || 'código ' + code)
  }

  // El navegador arranca el audio suspendido hasta que el jugador toca algo.
  function unlockAudio() {
    var context = Module.SDL2 && Module.SDL2.audioContext
    if (context && context.state === 'suspended') context.resume()
  }

  // Modo captura (play.html?captura): conserva la imagen del canvas para poder
  // copiarlo y sacar la portada. No se usa al jugar.
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

  ;['pointerdown', 'keydown'].forEach(function (type) { window.addEventListener(type, unlockAudio) })

  // Con Asyncify, los errores del motor llegan como promesas rechazadas.
  window.addEventListener('unhandledrejection', function (event) {
    if (event.reason instanceof WebAssembly.RuntimeError) notify('error', event.reason.message)
  })
})()
