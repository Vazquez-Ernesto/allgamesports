// Configuración de OpenTTD dentro del iframe del reproductor.
//
// OpenTTD trae soporte oficial para navegador: su código llama a las
// funciones de este Module (onExit, onAbort, onBootstrap...) y guarda las
// partidas en IndexedDB por su cuenta (ver engines/openttd/pre.js).
// Acá solo se traducen esos avisos a postMessage({ source: 'openttd', type })
// para la página que contiene el iframe.

;(function () {
  function notify(type, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: 'openttd', type: type, detail: detail }, window.location.origin)
    }
  }

  // Los gráficos van dentro de openttd.data: si el juego igual intenta
  // bajarlos de internet, es que ese archivo quedó mal armado.
  function missingGraphics() {
    notify('error', 'faltan los gráficos del juego')
  }

  window.Module = {
    preRun: [],
    postRun: [],
    arguments: [],
    canvas: document.getElementById('canvas'),
    onRuntimeInitialized: function () {
      notify('ready')
    },
    onExit: function () {
      notify('exit')
    },
    onAbort: function (reason) {
      notify('error', String(reason || 'el juego se detuvo'))
    },
    onBootstrap: missingGraphics,
    onBootstrapFailed: missingGraphics,
    onBootstrapReload: missingGraphics,
    // El juego avisa la primera vez que guarda en el navegador; la ficha ya lo explica.
    onWarningFs: function () {},
  }
})()
