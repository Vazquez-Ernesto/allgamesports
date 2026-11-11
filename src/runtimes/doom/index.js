// Runtime de Doom: carga el motor (WebAssembly), le da un WAD y lo hace correr
// dentro de un <canvas>.
//
// Flujo:
//   1. Se carga doom.js (el "pegamento" que genera Emscripten) y doom.wasm.
//   2. Se escribe el WAD en el sistema de archivos virtual del motor.
//   3. Se monta IndexedDB en /save para que las partidas guardadas persistan.
//   4. Se llama a dg_start() y después a doomgeneric_Tick() en cada frame.

import { createAudio } from './audio.js'
import { createInput } from './input.js'
import { loadEngineScript } from '../../lib/engineScript.js'
import { mountSaves } from '../../lib/saves.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/doom/`

/**
 * Arranca Doom.
 *
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas  Dónde dibujar (se ajusta a 320x200).
 * @param {Uint8Array} options.wad            Contenido del IWAD.
 * @param {string} options.wadName            Nombre con el que Doom lo reconoce (freedoom1.wad, doom.wad...).
 * @param {string} options.saveKey            Carpeta de partidas guardadas (una por juego).
 * @param {object} options.bindings           Teclas asignadas (ver keys.js).
 * @param {object} options.settings           { volume, mouseSensitivity, mouseLook }
 * @param {string} [options.extraArgs]        Argumentos extra de Doom (p. ej. "-warp 1 3 -skill 4").
 * @param {() => void} [options.onQuit]       El jugador eligió "Quit Game".
 * @param {(message: string) => void} [options.onError]
 */
export async function startDoom({ canvas, wad, wadName, saveKey, bindings, settings, extraArgs = '', onQuit, onError }) {
  const createDoomModule = await loadEngineScript(`${ENGINE_DIR}doom.js`, 'createDoomModule')

  const audio = createAudio(settings.volume ?? 1)
  const log = [] // últimas líneas que imprimió el motor, para mostrar si falla

  canvas.width = 320
  canvas.height = 200
  const ctx2d = canvas.getContext('2d')
  const image = ctx2d.createImageData(320, 200)
  const imagePixels = new Uint32Array(image.data.buffer)

  let quitRequested = false

  const module = await createDoomModule({
    locateFile: (file) => ENGINE_DIR + file,
    print: (line) => pushLog(line),
    printErr: (line) => pushLog(line),

    // Funciones que el código C llama (ver doomgeneric_web.c e i_websound.c).
    dg: {
      drawFrame(ptr, width, height) {
        // Doom entrega 0x00RRGGBB; el canvas quiere bytes R,G,B,A.
        const src = new Uint32Array(module.HEAPU8.buffer, ptr, width * height)
        for (let i = 0; i < src.length; i++) {
          const p = src[i]
          imagePixels[i] = 0xff000000 | ((p & 0xff) << 16) | (p & 0xff00) | ((p >> 16) & 0xff)
        }
        ctx2d.putImageData(image, 0, 0)
      },
      setTitle() {},
      quit() {
        quitRequested = true
      },
      sfxIsCached: (lump) => audio.isCached(lump),
      sfxLoad(lump, ptr, length, sampleRate) {
        audio.load(lump, module.HEAPU8.subarray(ptr, ptr + length), sampleRate)
      },
      sfxPlay: (channel, lump, vol, sep) => audio.play(channel, lump, vol, sep),
      sfxStop: (channel) => audio.stop(channel),
      sfxIsPlaying: (channel) => audio.isPlaying(channel),
      sfxUpdate: (channel, vol, sep) => audio.update(channel, vol, sep),
    },
  })

  function pushLog(line) {
    log.push(line)
    if (log.length > 40) log.shift()
  }

  const { FS } = module

  // --- Sistema de archivos virtual ---
  FS.mkdir('/iwad')
  FS.writeFile(`/iwad/${wadName}`, wad, { canOwn: true })

  // /save vive en IndexedDB: ahí quedan la configuración y las partidas.
  const saves = await mountSaves(module, saveKey)
  FS.chdir(saves.dir)

  // --- Arranque del motor ---
  await audio.resume()

  let running = false
  let frameId = 0
  let destroyed = false

  function fail(error) {
    stopLoop()
    const lastLines = log.slice(-4).join('\n').trim()
    onError?.(lastLines || String(error?.message ?? error))
  }

  try {
    // -mb: memoria (en MB) para la "zona" de Doom. Freedoom necesita más que el original.
    module.ccall('dg_start', null, ['string'], [`doom -iwad /iwad/${wadName} -mb 64 ${extraArgs}`.trim()])
  } catch (error) {
    audio.close()
    saves.close()
    const lastLines = log.slice(-4).join('\n').trim()
    throw new Error(lastLines || String(error?.message ?? error))
  }

  const input = createInput({ module, canvas, bindings, settings })

  function frame() {
    if (!running) return
    try {
      input.poll()
      module._doomgeneric_Tick()
    } catch (error) {
      fail(error)
      return
    }

    if (quitRequested) {
      stopLoop()
      saves.flush().then(() => onQuit?.())
      return
    }

    frameId = requestAnimationFrame(frame)
  }

  function startLoop() {
    if (running || destroyed) return
    running = true
    frameId = requestAnimationFrame(frame)
  }

  function stopLoop() {
    running = false
    cancelAnimationFrame(frameId)
  }

  startLoop()

  return {
    input,
    setVolume: (value) => audio.setVolume(value),
    // Pausa "dura": deja de pedir frames (el juego se congela).
    pause() {
      stopLoop()
      input.setEnabled(false)
      audio.suspend()
    },
    resume() {
      input.setEnabled(true)
      audio.resume()
      startLoop()
    },
    async destroy() {
      if (destroyed) return
      destroyed = true
      stopLoop()
      input.destroy()
      audio.close()
      await saves.close()
    },
  }
}
