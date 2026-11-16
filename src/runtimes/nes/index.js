// Runtime de NES: corre un juego sobre binjnes, un emulador libre compilado a
// WebAssembly (ver engines/nes). Es del mismo autor que el de Game Boy y
// funciona igual: acá lo que se compila es la consola, y el juego es el
// archivo original (la "ROM"), publicado por su autor con licencia libre.
//
// El emulador expone:
//   - emulator_run_until_secs(segundos): avanza la consola hasta ese instante
//     y avisa si terminó un cuadro o se llenó el buffer de audio.
//   - punteros a su memoria con el cuadro (256x240, RGBA) y el audio.
//   - set_joyp_*(jugador, apretado): aprieta o suelta un botón. Hay dos
//     controles, como en la consola (jugador 0 y 1).
// Este archivo conecta eso con el canvas, Web Audio, los controles y el guardado.

import { createInput } from '../consoleInput.js'
import { loadEngineScript } from '../../lib/engineScript.js'
import { loadLocalFile, saveLocalFile } from '../../lib/localFiles.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/nes/`
const WIDTH = 256
const HEIGHT = 240
const MAX_STEP_SECONDS = 5 / 60 // si la pestaña se trabó, no intentar recuperar todo
const AUDIO_FRAMES = 4096
const AUDIO_LATENCY_SECONDS = 0.1
const SAVE_CHECK_MS = 1000
const EVENT_NEW_FRAME = 1
const EVENT_AUDIO_BUFFER_FULL = 2
const EVENT_UNTIL_TICKS = 4

// Vistas de un pedazo de la memoria del emulador. Se piden cada vez: si la
// memoria crece, el buffer anterior deja de servir.
const bytes = (module, pointer, size) => new Uint8Array(module.HEAPU8.buffer, pointer, size)
const floats = (module, pointer, count) => new Float32Array(module.HEAPF32.buffer, pointer, count)

function createEmulator(module, rom, sampleRate) {
  const romPointer = module._malloc(rom.length)
  bytes(module, romPointer, rom.length).set(rom)
  const emulator = module._emulator_new_simple(romPointer, rom.length, sampleRate, AUDIO_FRAMES)
  if (emulator === 0) throw new Error('El archivo del juego no es una ROM de NES válida.')
  module._joypad_new_simple(emulator)
  return emulator
}

function createVideo(module, emulator, canvas) {
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  const image = context.createImageData(WIDTH, HEIGHT)
  const pointer = module._get_rgba_frame_buffer_ptr(emulator)
  const size = module._get_rgba_frame_buffer_size(emulator)
  return () => {
    // La consola guarda cada punto como un número de color: se pasa a RGBA.
    module._emulator_convert_frame_buffer_simple(emulator)
    image.data.set(bytes(module, pointer, size))
    context.putImageData(image, 0, 0)
  }
}

// Cada vez que el emulador llena su buffer, se programa para sonar justo
// después del anterior. La NES suena por un solo canal (mono).
function createAudio(module, emulator, context, getVolume) {
  const pointer = module._get_audio_buffer_ptr(emulator)
  let nextStart = 0
  return () => {
    const now = context.currentTime
    if (nextStart < now) nextStart = now + AUDIO_LATENCY_SECONDS // se atrasó: reempezar
    const buffer = context.createBuffer(1, AUDIO_FRAMES, context.sampleRate)
    const volume = getVolume()
    buffer.getChannelData(0).set(floats(module, pointer, AUDIO_FRAMES).map((sample) => sample * volume))
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.start(nextStart)
    nextStart += AUDIO_FRAMES / context.sampleRate
  }
}

// La partida guardada es la memoria con pila del cartucho. El emulador la
// entrega y la recibe a través de un bloque temporal de su memoria. Los
// cartuchos sin pila no guardan nada: el bloque mide cero.
function createSaves(module, emulator, saveKey) {
  const name = `nes-${saveKey}.sav`
  function withFileData(callback) {
    const fileData = module._prg_ram_file_data_new(emulator)
    const data = bytes(module, module._get_file_data_ptr(fileData), module._get_file_data_size(fileData))
    const result = callback(fileData, data)
    module._file_data_delete(fileData)
    return result
  }
  return {
    async load() {
      const saved = await loadLocalFile(name)
      withFileData((fileData, data) => {
        if (!saved || saved.length !== data.length) return
        data.set(saved)
        module._emulator_read_prg_ram(emulator, fileData)
      })
    },
    saveIfChanged() {
      if (!module._emulator_was_prg_ram_updated(emulator)) return
      const copy = withFileData((fileData, data) => {
        module._emulator_write_prg_ram(emulator, fileData)
        return new Uint8Array(data)
      })
      if (copy.length > 0) saveLocalFile(name, copy)
    },
  }
}

// Avanza la consola el tiempo que pasó desde el cuadro anterior.
function createLoop(module, emulator, drawFrame, pushAudio) {
  let frameId = 0
  let lastSeconds = 0

  function runUntil(seconds) {
    for (;;) {
      const event = module._emulator_run_until_secs(emulator, seconds)
      if (event & EVENT_NEW_FRAME) drawFrame()
      if (event & EVENT_AUDIO_BUFFER_FULL) pushAudio()
      if (event & EVENT_UNTIL_TICKS) return
    }
  }

  function onFrame(milliseconds) {
    frameId = requestAnimationFrame(onFrame)
    const seconds = milliseconds / 1000
    const delta = Math.min(Math.max(seconds - (lastSeconds || seconds), 0), MAX_STEP_SECONDS)
    lastSeconds = seconds
    runUntil(module._emulator_get_secs(emulator) + delta)
  }

  let running = false
  return {
    // El reproductor puede pedir "reanudar" con el juego ya en marcha: sin
    // esta guarda quedarían dos bucles y la pausa frenaría solo uno.
    start() {
      if (running) return
      running = true
      lastSeconds = 0
      frameId = requestAnimationFrame(onFrame)
    },
    stop() {
      running = false
      cancelAnimationFrame(frameId)
    },
  }
}

/**
 * Arranca un juego de NES.
 *
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas  Dónde dibujar (se ajusta a 256x240).
 * @param {Uint8Array} options.data           La ROM del juego.
 * @param {string} options.saveKey            Nombre de la partida guardada (uno por juego).
 * @param {object} options.settings           { volume }
 */
export async function startNes({ canvas, data, saveKey, settings }) {
  const Binjnes = await loadEngineScript(`${ENGINE_DIR}binjnes.js`, 'Binjnes')
  const module = await Binjnes({ locateFile: (file) => ENGINE_DIR + file })
  const audioContext = new AudioContext()
  let volume = settings.volume ?? 1

  const emulator = createEmulator(module, data, audioContext.sampleRate)
  const saves = createSaves(module, emulator, saveKey)
  await saves.load()

  const drawFrame = createVideo(module, emulator, canvas)
  const pushAudio = createAudio(module, emulator, audioContext, () => volume)
  const loop = createLoop(module, emulator, drawFrame, pushAudio)
  const press = (button, down, player) => module[`_set_joyp_${button}`](emulator, player, down)
  const input = createInput(press, { players: 2 })
  const saveTimer = setInterval(saves.saveIfChanged, SAVE_CHECK_MS)

  await audioContext.resume()
  loop.start()

  return {
    applySettings: (next) => (volume = next.volume ?? 1),
    pause() {
      loop.stop()
      input.setEnabled(false)
      audioContext.suspend()
    },
    resume() {
      input.setEnabled(true)
      audioContext.resume()
      loop.start()
    },
    async destroy() {
      loop.stop()
      clearInterval(saveTimer)
      saves.saveIfChanged()
      input.destroy()
      await audioContext.close()
    },
  }
}
