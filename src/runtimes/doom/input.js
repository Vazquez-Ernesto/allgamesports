// Entrada: teclado, mouse y mando -> teclas de Doom.
//
// Todo termina en dos funciones exportadas por el motor:
//   dg_key(presionada, teclaDoom, caracterTipeado)
//   dg_mouse(botones, movimientoX)

import { DK, PAD_BUTTONS, buildKeyMap, doomKeyFor } from './keys.js'

const STICK_THRESHOLD = 0.5 // cuánto hay que mover el stick para "apretar"
const STICK_DEADZONE = 0.15
const STICK_TURN_SPEED = 28 // "píxeles de mouse" por frame con el stick a fondo

export function createInput({ module, canvas, bindings, settings }) {
  let keyMap = buildKeyMap(bindings)
  let mouseSensitivity = settings.mouseSensitivity ?? 1
  let mouseLook = settings.mouseLook !== false
  let enabled = true

  // Varias teclas físicas pueden mapear a la misma tecla de Doom (W y ↑),
  // así que se cuenta cuántas la mantienen apretada.
  const heldCount = new Map() // teclaDoom -> cantidad
  const heldCodes = new Map() // code del teclado -> teclaDoom que se mandó

  function press(doomKey, typed = 0) {
    const count = heldCount.get(doomKey) ?? 0
    heldCount.set(doomKey, count + 1)
    if (count === 0) module._dg_key(1, doomKey, typed)
  }

  function release(doomKey) {
    const count = heldCount.get(doomKey) ?? 0
    if (count <= 0) return
    heldCount.set(doomKey, count - 1)
    if (count === 1) module._dg_key(0, doomKey, 0)
  }

  function releaseAll() {
    for (const [doomKey, count] of heldCount) {
      if (count > 0) module._dg_key(0, doomKey, 0)
    }
    heldCount.clear()
    heldCodes.clear()
    padState.clear()
    mouseButtons = 0
    module._dg_mouse(0, 0)
  }

  // ----- Teclado -----
  function onKeyDown(e) {
    if (!enabled) return
    // Atajos del navegador (Ctrl+R, Cmd+L, etc.) pasan de largo.
    if (e.ctrlKey || e.metaKey) return

    const doomKey = doomKeyFor(e.code, keyMap)
    if (!doomKey) return
    e.preventDefault()
    if (e.repeat || heldCodes.has(e.code)) return

    // Carácter tipeado: lo usan los trucos (iddqd) y el nombre de la partida.
    const typed = e.key.length === 1 && e.key.charCodeAt(0) < 128 ? e.key.toLowerCase().charCodeAt(0) : 0

    heldCodes.set(e.code, doomKey)
    press(doomKey, typed)
  }

  function onKeyUp(e) {
    const doomKey = heldCodes.get(e.code)
    if (doomKey === undefined) return
    e.preventDefault()
    heldCodes.delete(e.code)
    release(doomKey)
  }

  // ----- Mouse (con el puntero capturado) -----
  let mouseButtons = 0
  const isLocked = () => document.pointerLockElement === canvas

  function onCanvasClick() {
    if (enabled && mouseLook && !isLocked()) {
      canvas.requestPointerLock?.()
    }
  }

  function onMouseMove(e) {
    if (!enabled || !isLocked()) return
    const dx = Math.round(e.movementX * 2.5 * mouseSensitivity)
    if (dx !== 0) module._dg_mouse(mouseButtons, dx)
  }

  // Botón del navegador (0 izq, 1 medio, 2 der) -> bit de Doom (0 izq, 1 der, 2 medio)
  const buttonBit = (button) => (button === 0 ? 1 : button === 2 ? 2 : button === 1 ? 4 : 0)

  function onMouseDown(e) {
    if (!enabled || !isLocked()) return
    e.preventDefault()
    mouseButtons |= buttonBit(e.button)
    module._dg_mouse(mouseButtons, 0)
  }

  function onMouseUp(e) {
    if (!isLocked() && mouseButtons === 0) return
    mouseButtons &= ~buttonBit(e.button)
    module._dg_mouse(mouseButtons, 0)
  }

  // La rueda cambia de arma: un toque corto de tecla.
  const pendingTaps = []
  function onWheel(e) {
    if (!enabled || !isLocked()) return
    e.preventDefault()
    const key = e.deltaY > 0 ? DK.NEXT_WEAPON : DK.PREV_WEAPON
    press(key)
    pendingTaps.push(key)
  }

  const onContextMenu = (e) => e.preventDefault()

  // ----- Mando -----
  const padState = new Map() // id lógico -> apretado
  let padConnected = false

  function setPad(id, pressed, keys) {
    const was = padState.get(id) ?? false
    if (pressed === was) return
    padState.set(id, pressed)
    for (const key of keys) {
      if (pressed) press(key)
      else release(key)
    }
  }

  function pollGamepad() {
    const pads = navigator.getGamepads?.() ?? []
    const pad = Array.from(pads).find((p) => p && p.connected)
    padConnected = Boolean(pad)
    if (!pad) return

    for (const button of PAD_BUTTONS) {
      const state = pad.buttons[button.index]
      setPad('b' + button.index, Boolean(state && (state.pressed || state.value > 0.5)), button.keys)
    }

    // Stick izquierdo: caminar y paso lateral.
    const [lx = 0, ly = 0, rx = 0] = pad.axes
    setPad('ly-', ly < -STICK_THRESHOLD, [DK.UP])
    setPad('ly+', ly > STICK_THRESHOLD, [DK.DOWN])
    setPad('lx-', lx < -STICK_THRESHOLD, [DK.STRAFE_L])
    setPad('lx+', lx > STICK_THRESHOLD, [DK.STRAFE_R])

    // Stick derecho: giro analógico, reutilizando el canal del mouse.
    if (Math.abs(rx) > STICK_DEADZONE) {
      module._dg_mouse(mouseButtons, Math.round(rx * STICK_TURN_SPEED))
    }
  }

  // Se llama una vez por frame desde el bucle del juego.
  function poll() {
    // Soltar los toques de rueda del frame anterior.
    while (pendingTaps.length) release(pendingTaps.pop())
    if (enabled) pollGamepad()
  }

  // Si la pestaña pierde el foco, soltar todo para que no queden teclas pegadas.
  const onBlur = () => releaseAll()
  const onLockChange = () => {
    if (!isLocked() && mouseButtons !== 0) {
      mouseButtons = 0
      module._dg_mouse(0, 0)
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  document.addEventListener('pointerlockchange', onLockChange)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('click', onCanvasClick)
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('contextmenu', onContextMenu)

  return {
    poll,
    isPadConnected: () => padConnected,
    setBindings(next) {
      releaseAll()
      keyMap = buildKeyMap(next)
    },
    setMouseSensitivity(value) {
      mouseSensitivity = value
    },
    setMouseLook(value) {
      mouseLook = value
      if (!value && isLocked()) document.exitPointerLock()
    },
    // Se desactiva mientras hay un panel abierto (controles, ajustes).
    setEnabled(value) {
      enabled = value
      if (!value) {
        releaseAll()
        if (isLocked()) document.exitPointerLock()
      }
    },
    destroy() {
      releaseAll()
      if (isLocked()) document.exitPointerLock()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('click', onCanvasClick)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    },
  }
}
