// Configuración de OpenLara dentro del iframe del reproductor.
//
// 1. Cuando el motor termina de cargar, avisa 'loaded' a la página que lo
//    contiene. Esa página responde con los archivos del disco del jugador
//    ({ type: 'start', files: [{ path, bytes }] }).
// 2. Se escriben en el sistema de archivos del motor con las mismas carpetas
//    que el disco de PlayStation (PSXDATA/, DELDATA/): OpenLara los reconoce
//    solo. Después se llama a main() y se avisa 'ready'.
//
// snd_init y getLanguage son funciones globales porque el motor las llama por
// nombre (emscripten_run_script).

var SPANISH = 3 // índice de idioma de OpenLara (ver su index.php)
var audioContext = null

function notify(type, detail) {
  if (window.parent !== window) {
    window.parent.postMessage({ source: 'openlara', type: type, detail: detail }, window.location.origin)
  }
}

function getLanguage() {
  Module.ccall('set_def_lang', null, ['number'], [SPANISH])
}

// El motor mezcla el sonido; acá se le piden muestras y se pasan a Web Audio.
function snd_init() {
  audioContext = new AudioContext()
  var count = 4096
  var rate = 44100 / audioContext.sampleRate
  var framesCount = Math.ceil(count * rate)
  var frames = Module._malloc(framesCount * 4) // short L, short R intercalados
  var processor = audioContext.createScriptProcessor(count, 2, 2)
  processor.onaudioprocess = function (event) {
    var left = event.outputBuffer.getChannelData(0)
    var right = event.outputBuffer.getChannelData(1)
    Module._snd_fill(frames, framesCount)
    for (var i = 0; i < count; i++) {
      var index = frames + Math.floor(i * rate) * 4
      left[i] = Module.getValue(index, 'i16') / 0x8000
      right[i] = Module.getValue(index + 2, 'i16') / 0x8000
    }
  }
  processor.connect(audioContext.destination)
}

function writeFiles(files) {
  files.forEach(function (file) {
    var folder = file.path.slice(0, file.path.lastIndexOf('/'))
    if (folder && !Module.FS.analyzePath('/' + folder).exists) Module.FS.mkdir('/' + folder)
    Module.FS.writeFile('/' + file.path, file.bytes)
  })
}

function start(files) {
  try {
    writeFiles(files)
    Module.callMain([])
    notify('ready')
  } catch (error) {
    notify('error', String(error && error.message ? error.message : error))
  }
}

var Module = {
  canvas: document.getElementById('canvas'),
  onRuntimeInitialized: function () {
    notify('loaded')
  },
  onAbort: function (reason) {
    notify('error', String(reason))
  },
}

window.addEventListener('message', function (event) {
  if (event.source === window.parent && event.data && event.data.type === 'start') start(event.data.files)
})

window.addEventListener('unhandledrejection', function (event) {
  if (event.reason instanceof WebAssembly.RuntimeError) notify('error', event.reason.message)
})

// El navegador solo deja sonar después de una acción del jugador.
;['click', 'keydown'].forEach(function (name) {
  window.addEventListener(name, function () {
    if (audioContext && audioContext.state === 'suspended' && !window.pausedByPlayer) audioContext.resume()
  })
})
