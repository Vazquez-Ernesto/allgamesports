// Runtime de Game Boy y Game Boy Color: corre un juego sobre binjgb, un
// emulador libre compilado a WebAssembly (ver engines/gameboy).
//
// A diferencia de los otros motores, acá lo que se compila es la consola. El
// juego es el archivo original (la "ROM"), publicado por su autor con una
// licencia que permite repartirlo.
//
// El emulador no sabe de pantallas ni de teclados. Expone tres cosas:
//   - emulator_run_until(ticks): avanza la consola hasta ese instante y avisa
//     si terminó un cuadro o se llenó el buffer de audio.
//   - punteros a su memoria con el cuadro (160x144, RGBA) y el audio.
//   - set_joyp_*: aprieta o suelta un botón.
// Este archivo conecta eso con el canvas, Web Audio, el teclado y el guardado.

import { createInput } from './input.js'
import { loadEngineScript } from '../../lib/engineScript.js'
import { loadLocalFile, saveLocalFile } from '../../lib/localFiles.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/gameboy/`
const WIDTH = 160
const HEIGHT = 144
const TICKS_PER_SECOND = 4194304 // velocidad del procesador de la Game Boy
const MAX_STEP_SECONDS = 5 / 60 // si la pestaña se trabó, no intentar recuperar todo
const AUDIO_FRAMES = 4096
const AUDIO_LATENCY_SECONDS = 0.1
const COLOR_CURVE = 2 // corrige los colores como se veían en la pantalla real
const SAVE_CHECK_MS = 1000
const EVENT_NEW_FRAME = 1
const EVENT_AUDIO_BUFFER_FULL = 2
const EVENT_UNTIL_TICKS = 4

// Vista de un pedazo de la memoria del emulador. Se pide cada vez: si la
// memoria crece, el buffer anterior deja de servir.
const view = (module, pointer, size) => new Uint8Array(module.HEAPU8.buffer, pointer, size)

function createEmulator(module, rom, sampleRate) {
  const size = (rom.length + 0x7fff) & ~0x7fff // la ROM se redondea a bloques de 32 KB
  const romPointer = module._malloc(size)
  view(module, romPointer, size).fill(0).set(rom)
  const emulator = module._emulator_new_simple(romPointer, size, sampleRate, AUDIO_FRAMES, COLOR_CURVE)
  if (emulator === 0) throw new Error('El archivo del juego no es una ROM de Game Boy válida.')
  const joypad = module._joypad_new()
  module._emulator_set_default_joypad_callback(emulator, joypad)
  return emulator
}

function createVideo(module, emulator, canvas) {
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  const image = context.createImageData(WIDTH, HEIGHT)
  const pointer = module._get_frame_buffer_ptr(emulator)
  const size = module._get_frame_buffer_size(emulator)
  return () => {
    image.data.set(view(module, pointer, size))
    context.putImageData(image, 0, 0)
  }
}

// Cada vez que el emulador llena su buffer, se programa para sonar justo
// después del anterior.
function createAudio(module, emulator, context, getVolume) {
  const pointer = module._get_audio_buffer_ptr(emulator)
  let nextStart = 0
  return () => {
    const now = context.currentTime
    if (nextStart < now) nextStart = now + AUDIO_LATENCY_SECONDS // se atrasó: reempezar
    const samples = view(module, pointer, AUDIO_FRAMES * 2)
    const buffer = context.createBuffer(2, AUDIO_FRAMES, context.sampleRate)
    const [left, right] = [buffer.getChannelData(0), buffer.getChannelData(1)]
    for (let i = 0; i < AUDIO_FRAMES; i++) {
      left[i] = (samples[2 * i] * getVolume()) / 255
      right[i] = (samples[2 * i + 1] * getVolume()) / 255
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.start(nextStart)
    nextStart += AUDIO_FRAMES / context.sampleRate
  }
}

// La partida guardada es la memoria del cartucho ("RAM externa"). El emulador
// la entrega y la recibe a través de un bloque temporal de su memoria.
function createSaves(module, emulator, saveKey) {
  const name = `gameboy-${saveKey}.sav`
  function withFileData(callback) {
    const fileData = module._ext_ram_file_data_new(emulator)
    const bytes = view(module, module._get_file_data_ptr(fileData), module._get_file_data_size(fileData))
    const result = callback(fileData, bytes)
    module._file_data_delete(fileData)
    return result
  }
  return {
    async load() {
      const saved = await loadLocalFile(name)
      withFileData((fileData, bytes) => {
        if (!saved || saved.length !== bytes.length) return
        bytes.set(saved)
        module._emulator_read_ext_ram(emulator, fileData)
      })
    },
    saveIfChanged() {
      if (!module._emulator_was_ext_ram_updated(emulator)) return
      const copy = withFileData((fileData, bytes) => {
        module._emulator_write_ext_ram(emulator, fileData)
        return new Uint8Array(bytes)
      })
      if (copy.length > 0) saveLocalFile(name, copy)
    },
  }
}

// Avanza la consola el tiempo que pasó desde el cuadro anterior.
function createLoop(module, emulator, drawFrame, pushAudio) {
  let frameId = 0
  let lastSeconds = 0
  let leftoverTicks = 0

  function runUntil(ticks) {
    for (;;) {
      const event = module._emulator_run_until_f64(emulator, ticks)
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
    const target = module._emulator_get_ticks_f64(emulator) + delta * TICKS_PER_SECOND - leftoverTicks
    runUntil(target)
    leftoverTicks = (module._emulator_get_ticks_f64(emulator) - target) | 0
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
 * Arranca un juego de Game Boy.
 *
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas  Dónde dibujar (se ajusta a 160x144).
 * @param {Uint8Array} options.data           La ROM del juego.
 * @param {string} options.saveKey            Nombre de la partida guardada (uno por juego).
 * @param {object} options.settings           { volume }
 */
export async function startGameBoy({ canvas, data, saveKey, settings }) {
  const Binjgb = await loadEngineScript(`${ENGINE_DIR}binjgb.js`, 'Binjgb')
  const module = await Binjgb({ locateFile: (file) => ENGINE_DIR + file })
  const audioContext = new AudioContext()
  let volume = settings.volume ?? 1

  const emulator = createEmulator(module, data, audioContext.sampleRate)
  const saves = createSaves(module, emulator, saveKey)
  await saves.load()

  const drawFrame = createVideo(module, emulator, canvas)
  const pushAudio = createAudio(module, emulator, audioContext, () => volume)
  const loop = createLoop(module, emulator, drawFrame, pushAudio)
  const input = createInput(module, emulator)
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
