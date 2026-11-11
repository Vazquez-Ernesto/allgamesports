// Carga el "pegamento" JS que genera Emscripten (doom.js, tyrian.js...).
// Cada uno define una función global que crea el módulo; se carga una sola vez.

const loading = new Map()

export function loadEngineScript(url, globalName) {
  if (!loading.has(url)) {
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = url
      script.onload = () => resolve(window[globalName])
      script.onerror = () => {
        loading.delete(url)
        reject(new Error('No se pudo cargar el motor del juego.'))
      }
      document.head.appendChild(script)
    })
    loading.set(url, promise)
  }
  return loading.get(url)
}
