// Lectura de mandos con la Gamepad API del navegador.
//
// El navegador no avisa cuando se aprieta un botón: hay que preguntarle el
// estado de los mandos en cada cuadro (navigator.getGamepads()). Además, por
// privacidad, no muestra ningún mando hasta que se aprieta un botón con la
// página abierta.
//
// "mapping" dice si el navegador reconoció el mando: 'standard' quiere decir
// que reordenó los botones a la disposición estándar (la de un mando de
// PlayStation o Xbox). Si viene vacío, los botones llegan en el orden que
// decidió el fabricante del adaptador, y hay que averiguar cuál es cuál.

import { useEffect, useState } from 'react'

// Nombres de los botones en la disposición estándar, con los de PlayStation.
export const STANDARD_BUTTONS = [
  'Cruz ✕', 'Círculo ○', 'Cuadrado □', 'Triángulo △',
  'L1', 'R1', 'L2', 'R2',
  'Select', 'Start', 'L3 (stick izquierdo)', 'R3 (stick derecho)',
  'Arriba', 'Abajo', 'Izquierda', 'Derecha',
  'Botón central (PS)',
]

function snapshot(pad) {
  return {
    index: pad.index,
    id: pad.id,
    mapping: pad.mapping,
    buttons: pad.buttons.map((button) => button.value),
    axes: pad.axes.map((axis) => Math.round(axis * 100) / 100),
  }
}

function readPads() {
  return Array.from(navigator.getGamepads?.() ?? []).filter((pad) => pad?.connected).map(snapshot)
}

/** Devuelve el estado de los mandos conectados y se actualiza solo. */
export function useGamepads() {
  const [pads, setPads] = useState([])

  useEffect(() => {
    let frame = 0
    let last = ''
    function poll() {
      const next = readPads()
      const key = JSON.stringify(next)
      if (key !== last) setPads(next) // solo redibuja si algo cambió
      last = key
      frame = requestAnimationFrame(poll)
    }
    poll()
    return () => cancelAnimationFrame(frame)
  }, [])

  return pads
}
