// Arranque de LibreQuake (motor FTEQW) dentro del iframe del reproductor.
//
// FTEQW trae su propia página para navegador; esta la reemplaza. Lo que hace:
// 1. Le pasa los datos del juego en Module.files: ruta dentro del juego ->
//    promesa con el contenido. Los .pak se sirven comprimidos con gzip
//    (.pakgz) y se descomprimen acá.
// 2. Anota los AudioContext que crea el motor, para que la pausa del
//    reproductor pueda callarlos (window.quakeAudio).
// 3. Avisa a la página que lo contiene cuándo está listo, si falla o si
//    salió (postMessage con { source: 'quake', type }).

;(function () {
  var PAKS = ['pak0', 'pak1']

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'quake', type: type, detail: detail }, window.location.origin)
    }
  }

  async function fetchPak(name) {
    var response = await fetch('data/' + name + '.pakgz')
    if (!response.ok) throw new Error('No se pudieron bajar los datos del juego (' + name + ').')
    var stream = response.body.pipeThrough(new DecompressionStream('gzip'))
    return new Response(stream).arrayBuffer()
  }

  function gameFiles() {
    var files = {}
    PAKS.forEach(function (name) {
      files['id1/' + name + '.pak'] = fetchPak(name).catch(function (error) {
        notify('error', error.message)
        throw error
      })
    })
    return files
  }

  // El motor crea sus AudioContext por su cuenta; se los anota para poder
  // suspenderlos todos juntos.
  var contexts = []
  var RealAudioContext = window.AudioContext
  window.AudioContext = function (options) {
    var context = new RealAudioContext(options)
    contexts.push(context)
    return context
  }
  window.AudioContext.prototype = RealAudioContext.prototype
  window.quakeAudio = {
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
    files: gameFiles(),
    // Explícitos: si no, FTEQW toma argumentos de la dirección de la página.
    arguments: [],
    onRuntimeInitialized: function () {
      notify('ready')
    },
    onAbort: function (reason) {
      notify('error', String(reason))
    },
    // FTEQW la llama al elegir "Quit" en el menú.
    close: function () {
      notify('exit')
    },
    setStatus: function () {},
  }
})()
