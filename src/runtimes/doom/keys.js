// Códigos de tecla que entiende Doom (ver engines/doom/src/doomkeys.h).
export const DK = {
  RIGHT: 0xae,
  LEFT: 0xac,
  UP: 0xad,
  DOWN: 0xaf,
  STRAFE_L: 0xa0,
  STRAFE_R: 0xa1,
  USE: 0xa2,
  FIRE: 0xa3,
  ESCAPE: 27,
  ENTER: 13,
  TAB: 9,
  BACKSPACE: 0x7f,
  RSHIFT: 0x80 + 0x36,
  PAUSE: 0xff,
  EQUALS: 0x3d,
  MINUS: 0x2d,
  PREV_WEAPON: '['.charCodeAt(0),
  NEXT_WEAPON: ']'.charCodeAt(0),
  YES: 'y'.charCodeAt(0),
  NO: 'n'.charCodeAt(0),
}

// Acciones que el jugador puede reasignar. `keys` son valores de
// KeyboardEvent.code (posición física de la tecla, no depende del idioma).
export const ACTIONS = [
  { id: 'forward', label: 'Avanzar', group: 'Movimiento', doomKey: DK.UP, keys: ['KeyW', 'ArrowUp'] },
  { id: 'back', label: 'Retroceder', group: 'Movimiento', doomKey: DK.DOWN, keys: ['KeyS', 'ArrowDown'] },
  { id: 'strafeLeft', label: 'Paso lateral izq.', group: 'Movimiento', doomKey: DK.STRAFE_L, keys: ['KeyA'] },
  { id: 'strafeRight', label: 'Paso lateral der.', group: 'Movimiento', doomKey: DK.STRAFE_R, keys: ['KeyD'] },
  { id: 'turnLeft', label: 'Girar a la izquierda', group: 'Movimiento', doomKey: DK.LEFT, keys: ['ArrowLeft'] },
  { id: 'turnRight', label: 'Girar a la derecha', group: 'Movimiento', doomKey: DK.RIGHT, keys: ['ArrowRight'] },
  { id: 'run', label: 'Correr', group: 'Movimiento', doomKey: DK.RSHIFT, keys: ['ShiftLeft', 'ShiftRight'] },

  { id: 'fire', label: 'Disparar', group: 'Juego', doomKey: DK.FIRE, keys: ['Space'] },
  { id: 'use', label: 'Usar / abrir', group: 'Juego', doomKey: DK.USE, keys: ['KeyE'] },
  { id: 'prevWeapon', label: 'Arma anterior', group: 'Juego', doomKey: DK.PREV_WEAPON, keys: ['KeyZ'] },
  { id: 'nextWeapon', label: 'Arma siguiente', group: 'Juego', doomKey: DK.NEXT_WEAPON, keys: ['KeyX'] },
  { id: 'map', label: 'Mapa', group: 'Juego', doomKey: DK.TAB, keys: ['Tab'] },

  { id: 'menu', label: 'Menú / volver', group: 'Menú', doomKey: DK.ESCAPE, keys: ['Escape'] },
  { id: 'confirm', label: 'Aceptar', group: 'Menú', doomKey: DK.ENTER, keys: ['Enter'] },
]

// Teclas fijas (no reasignables) que Doom usa tal cual.
const FIXED = {
  Backspace: DK.BACKSPACE,
  Pause: DK.PAUSE,
  Minus: DK.MINUS,
  Equal: DK.EQUALS,
  F1: 0x80 + 0x3b,
  F2: 0x80 + 0x3c,
  F3: 0x80 + 0x3d,
  F4: 0x80 + 0x3e,
  // F5, F11 y F12 se dejan para el navegador (recargar, pantalla completa, devtools)
  F6: 0x80 + 0x40,
  F7: 0x80 + 0x41,
  F8: 0x80 + 0x42,
  F9: 0x80 + 0x43,
  F10: 0x80 + 0x44,
}

export function defaultBindings() {
  return Object.fromEntries(ACTIONS.map((a) => [a.id, [...a.keys]]))
}

// Convierte { accion: [codes] } en un mapa code -> tecla de Doom.
export function buildKeyMap(bindings) {
  const map = new Map()
  for (const action of ACTIONS) {
    for (const code of bindings[action.id] ?? []) {
      map.set(code, action.doomKey)
    }
  }
  return map
}

// Tecla de Doom para un evento de teclado, o 0 si no nos interesa.
export function doomKeyFor(code, keyMap) {
  if (keyMap.has(code)) return keyMap.get(code)
  if (code in FIXED) return FIXED[code]
  if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3) + 32 // letra en minúscula
  if (/^Digit[0-9]$/.test(code)) return code.charCodeAt(5)
  if (/^Numpad[0-9]$/.test(code)) return code.charCodeAt(6)
  return 0
}

// Nombre corto para mostrar una tecla en la interfaz.
export function keyLabel(code) {
  const names = {
    Space: 'Espacio',
    Escape: 'Esc',
    Enter: 'Enter',
    Tab: 'Tab',
    ShiftLeft: 'Shift izq.',
    ShiftRight: 'Shift der.',
    ControlLeft: 'Ctrl izq.',
    ControlRight: 'Ctrl der.',
    AltLeft: 'Alt izq.',
    AltRight: 'Alt der.',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Backspace: 'Retroceso',
    BracketLeft: '[',
    BracketRight: ']',
    Comma: ',',
    Period: '.',
    Slash: '/',
    Semicolon: ';',
    Quote: "'",
    Backquote: '`',
    Minus: '-',
    Equal: '=',
  }
  if (code in names) return names[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6)
  return code
}

// Mando con mapeo estándar (Xbox / PlayStation / genéricos modernos).
// Cada botón puede mandar varias teclas: p. ej. A sirve para usar en el
// juego, aceptar en el menú y responder "sí" en las confirmaciones.
export const PAD_BUTTONS = [
  { index: 0, name: 'A / ✕', label: 'Usar / aceptar', keys: [DK.USE, DK.ENTER, DK.YES] },
  { index: 1, name: 'B / ○', label: 'Volver / no', keys: [DK.BACKSPACE, DK.NO] },
  { index: 2, name: 'X / □', label: 'Correr', keys: [DK.RSHIFT] },
  { index: 3, name: 'Y / △', label: 'Mapa', keys: [DK.TAB] },
  { index: 4, name: 'LB / L1', label: 'Arma anterior', keys: [DK.PREV_WEAPON] },
  { index: 5, name: 'RB / R1', label: 'Arma siguiente', keys: [DK.NEXT_WEAPON] },
  { index: 6, name: 'LT / L2', label: 'Correr', keys: [DK.RSHIFT] },
  { index: 7, name: 'RT / R2', label: 'Disparar', keys: [DK.FIRE] },
  { index: 9, name: 'Start', label: 'Menú', keys: [DK.ESCAPE] },
  { index: 12, name: 'Cruceta ↑', label: 'Avanzar', keys: [DK.UP] },
  { index: 13, name: 'Cruceta ↓', label: 'Retroceder', keys: [DK.DOWN] },
  { index: 14, name: 'Cruceta ←', label: 'Girar izq.', keys: [DK.LEFT] },
  { index: 15, name: 'Cruceta →', label: 'Girar der.', keys: [DK.RIGHT] },
]

export const PAD_STICKS = [
  { name: 'Stick izquierdo', label: 'Caminar y paso lateral' },
  { name: 'Stick derecho', label: 'Girar' },
]
