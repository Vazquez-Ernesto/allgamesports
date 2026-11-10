// Efectos de sonido de Doom con Web Audio.
//
// El motor (C) nos pasa cada sonido una sola vez como PCM de 8 bits sin signo
// y después solo nos dice "reproducí el sonido N en el canal C con este
// volumen y este paneo". Ver engines/doom/src/i_websound.c.

const NUM_CHANNELS = 16

export function createAudio(initialVolume = 1) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return createSilentAudio()

  const ctx = new AudioCtx()
  const master = ctx.createGain()
  master.gain.value = initialVolume
  master.connect(ctx.destination)

  const buffers = new Map() // número de lump -> AudioBuffer
  const channels = new Array(NUM_CHANNELS).fill(null) // { source, gain, pan }

  // Doom manda volumen 0..127 y separación 0..254 (127 = centro).
  const toGain = (vol) => Math.max(0, Math.min(1, vol / 127))
  const toPan = (sep) => Math.max(-1, Math.min(1, (sep - 127) / 127))

  function stop(channel) {
    const playing = channels[channel]
    if (!playing) return
    channels[channel] = null
    try {
      playing.source.onended = null
      playing.source.stop()
    } catch {
      // ya había terminado
    }
  }

  return {
    resume: () => ctx.resume(),
    suspend: () => ctx.suspend(),
    setVolume(value) {
      master.gain.value = value
    },
    close() {
      for (let i = 0; i < NUM_CHANNELS; i++) stop(i)
      ctx.close()
    },

    // --- callbacks que llama el motor (Module.dg.sfx*) ---
    isCached: (lump) => buffers.has(lump),

    load(lump, bytes, sampleRate) {
      const buffer = ctx.createBuffer(1, bytes.length, sampleRate)
      const out = buffer.getChannelData(0)
      for (let i = 0; i < bytes.length; i++) {
        out[i] = (bytes[i] - 128) / 128 // 0..255 -> -1..1
      }
      buffers.set(lump, buffer)
    },

    play(channel, lump, vol, sep) {
      const buffer = buffers.get(lump)
      if (!buffer) return
      stop(channel)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      const gain = ctx.createGain()
      gain.gain.value = toGain(vol)
      const pan = ctx.createStereoPanner()
      pan.pan.value = toPan(sep)
      source.connect(gain).connect(pan).connect(master)

      const entry = { source, gain, pan }
      source.onended = () => {
        if (channels[channel] === entry) channels[channel] = null
      }
      channels[channel] = entry
      source.start()
    },

    stop,
    isPlaying: (channel) => channels[channel] !== null,

    update(channel, vol, sep) {
      const playing = channels[channel]
      if (!playing) return
      playing.gain.gain.value = toGain(vol)
      playing.pan.pan.value = toPan(sep)
    },
  }
}

// Si el navegador no tiene Web Audio, el juego corre igual pero mudo.
function createSilentAudio() {
  const noop = () => {}
  return {
    resume: noop,
    suspend: noop,
    setVolume: noop,
    close: noop,
    isCached: () => true,
    load: noop,
    play: noop,
    stop: noop,
    isPlaying: () => false,
    update: noop,
  }
}
