// Controles de Game Boy: teclado y mando.
//
// La consola tiene una cruz, dos botones (A y B) y Start y Select. Cada uno
// se aprieta llamando a una función del emulador (set_joyp_*).

// Tecla física -> botón de la consola.
const KEYS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyX: 'A',
  KeyZ: 'B',
  Enter: 'start',
  ShiftRight: 'select',
  ShiftLeft: 'select',
}

// Botón del mando (numeración estándar del navegador) -> botón de la consola.
const PAD_BUTTONS = { 0: 'A', 1: 'B', 2: 'B', 3: 'A', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' }
const PAD_POLL_MS = 16

export function createInput(module, emulator) {
  let enabled = true
  const press = (button, down) => module[`_set_joyp_${button}`](emulator, down)

  function onKey(event) {
    const button = KEYS[event.code]
    if (!button || !enabled) return
    event.preventDefault() // que las flechas no muevan la página
    press(button, event.type === 'keydown')
  }

  // El mando no avisa: hay que preguntarle su estado cada tanto.
  const padState = {}
  function pollPad() {
    const pad = Array.from(navigator.getGamepads?.() ?? []).find((candidate) => candidate?.connected)
    if (!pad || !enabled) return
    for (const [index, button] of Object.entries(PAD_BUTTONS)) {
      const down = Boolean(pad.buttons[index]?.pressed)
      if (padState[index] !== down) press(button, down)
      padState[index] = down
    }
  }

  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  const padTimer = setInterval(pollPad, PAD_POLL_MS)

  return {
    setEnabled: (value) => (enabled = value),
    destroy() {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      clearInterval(padTimer)
    },
  }
}
