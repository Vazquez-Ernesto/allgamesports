// Configuración de ScummVM dentro del iframe del reproductor.
//
// 1. Avisa a la página que lo contiene cuándo está listo, si falla o si salió
//    (postMessage con { source: 'scummvm', type }).
// 2. Intercepta fetch: ScummVM pide sus datos con rutas absolutas (/data/...)
//    pensadas para un sitio en la raíz del dominio. Acá se vuelven relativas a
//    esta página y se descomprimen (los archivos están guardados con gzip, .dgz).

;(function () {
  var DATA_PREFIX = '/data/'
  var GZ_EXT = '.dgz'

  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'scummvm', type: type, detail: detail }, window.location.origin)
    }
  }

  async function readData(response) {
    var bytes = new Uint8Array(await response.arrayBuffer())
    var isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b
    if (!isGzip) return bytes
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }

  var realFetch = window.fetch.bind(window)
  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : input.url
    if (!url.startsWith(DATA_PREFIX)) return realFetch(input, init)

    var local = url.slice(1) // "data/..." relativo a play.html
    if (local.endsWith('/index.json')) return realFetch(local, init)

    var response = await realFetch(local + GZ_EXT, init)
    if (!response.ok) return response
    return new Response(await readData(response), { status: 200 })
  }

  window.Module = {
    canvas: document.getElementById('canvas'),
    onRuntimeInitialized: function () {
      notify('ready')
    },
    onAbort: function (reason) {
      notify('error', String(reason))
    },
    // Lo llama main() al terminar (parche engines/scummvm/patches/0001):
    // con Asyncify el runtime sigue vivo y Emscripten no llama a onExit.
    onScummvmExit: function (code) {
      notify('exit', code)
    },
  }

  // Solo los errores del motor son fatales. Otros rechazos son inofensivos: por
  // ejemplo, el shell de ScummVM pide acceso a MIDI y el navegador lo niega.
  window.addEventListener('unhandledrejection', function (event) {
    if (event.reason instanceof WebAssembly.RuntimeError) notify('error', event.reason.message)
  })
})()
