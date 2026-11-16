// Controles de consola: teclado y mando.
//
// Sirve para las consolas con una cruz, dos botones (A y B) y Start y Select:
// Game Boy, Game Boy Color y NES. Cada runtime dice cómo se aprieta un botón
// en su emulador con la función `press(boton, apretado, jugador)`.
//
// La NES tiene dos controles. El jugador 2 usa las teclas que eligió el autor
// del emulador en su propia demo, o el segundo mando conectado.

// Tecla física -> [jugador, botón].
const KEYS = {
  ArrowUp: [0, 'up'],
  ArrowDown: [0, 'down'],
  ArrowLeft: [0, 'left'],
  ArrowRight: [0, 'right'],
  KeyX: [0, 'A'],
  KeyZ: [0, 'B'],
  Enter: [0, 'start'],
  ShiftRight: [0, 'select'],
  ShiftLeft: [0, 'select'],
  KeyY: [1, 'up'],
  KeyH: [1, 'down'],
  KeyG: [1, 'left'],
  KeyJ: [1, 'right'],
  KeyL: [1, 'A'],
  KeyK: [1, 'B'],
  KeyO: [1, 'start'],
  KeyI: [1, 'select'],
}

// Botón del mando (numeración estándar del navegador) -> botón de la consola.
const PAD_BUTTONS = { 0: 'A', 1: 'B', 2: 'B', 3: 'A', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' }
const PAD_POLL_MS = 16

/**
 * @param {(button: string, down: boolean, player: number) => void} press  Aprieta o suelta un botón.
 * @param {object} [options]
 * @param {number} [options.players]  Cuántos controles tiene la consola (1 o 2).
 */
export function createInput(press, { players = 1 } = {}) {
  let enabled = true

  function onKey(event) {
    const [player, button] = KEYS[event.code] ?? []
    if (button === undefined || player >= players || !enabled) return
    event.preventDefault() // que las flechas no muevan la página
    press(button, event.type === 'keydown', player)
  }

  const padTimer = setInterval(() => enabled && pollPads(press, players), PAD_POLL_MS)
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)

  return {
    setEnabled: (value) => (enabled = value),
    destroy() {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      clearInterval(padTimer)
    },
  }
}

// El mando no avisa: hay que preguntarle su estado cada tanto. El primer mando
// conectado es el jugador 1; el segundo, el jugador 2.
const padState = [{}, {}]

function pollPads(press, players) {
  const pads = Array.from(navigator.getGamepads?.() ?? []).filter((pad) => pad?.connected)
  pads.slice(0, players).forEach((pad, player) => {
    for (const [index, button] of Object.entries(PAD_BUTTONS)) {
      const down = Boolean(pad.buttons[index]?.pressed)
      if (padState[player][index] !== down) press(button, down, player)
      padState[player][index] = down
    }
  })
}
