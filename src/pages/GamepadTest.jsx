// Probador de mandos: muestra lo que el navegador recibe de cada mando.
//
// Sirve para saber si un mando (por ejemplo, uno de PS2 con adaptador USB)
// funciona en el sitio y, si no está reconocido, qué número tiene cada botón.

import { useState } from 'react'
import { STANDARD_BUTTONS, useGamepads } from '../lib/gamepads.js'

const PRESSED = 0.5 // los gatillos analógicos van de 0 a 1

function buttonName(pad, index) {
  if (pad.mapping === 'standard' && STANDARD_BUTTONS[index]) return STANDARD_BUTTONS[index]
  return `Botón ${index}`
}

function ButtonGrid({ pad }) {
  return (
    <ul className="pad-buttons">
      {pad.buttons.map((value, index) => (
        <li key={index} className={value >= PRESSED ? 'is-pressed' : undefined}>
          {buttonName(pad, index)}
        </li>
      ))}
    </ul>
  )
}

function AxisBars({ axes }) {
  return (
    <ul className="pad-axes">
      {axes.map((value, index) => (
        <li key={index}>
          <span>Eje {index}</span>
          <span className="pad-axis-track">
            <span className="pad-axis-dot" style={{ left: `${(value + 1) * 50}%` }} />
          </span>
          <span className="pad-axis-value">{value.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  )
}

// Texto para copiar y pegar en una consulta: alcanza para armar el mapeo.
function describe(pad) {
  const pressed = pad.buttons.flatMap((value, index) => (value >= PRESSED ? [index] : []))
  return [
    `Mando: ${pad.id}`,
    `Reconocido: ${pad.mapping === 'standard' ? 'sí (estándar)' : 'no'}`,
    `Botones: ${pad.buttons.length}, ejes: ${pad.axes.length}`,
    `Apretados ahora: ${pressed.join(', ') || 'ninguno'}`,
    `Ejes: ${pad.axes.join(', ')}`,
  ].join('\n')
}

function CopyButton({ pad }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(describe(pad))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button type="button" className="btn btn-quiet" onClick={copy}>
      {copied ? 'Copiado' : 'Copiar datos del mando'}
    </button>
  )
}

function PadCard({ pad }) {
  const known = pad.mapping === 'standard'
  return (
    <section className="pad-card">
      <p className="eyebrow">Mando {pad.index + 1}</p>
      <h2 className="pad-name">{pad.id}</h2>
      <p className={known ? 'pad-status is-ok' : 'pad-status is-warn'}>
        {known
          ? 'Reconocido: los botones están en el orden estándar y los juegos lo entienden.'
          : 'No reconocido: los botones llegan en el orden del fabricante. Apretá uno por uno y anotá el número de cada uno.'}
      </p>
      <ButtonGrid pad={pad} />
      <AxisBars axes={pad.axes} />
      <CopyButton pad={pad} />
    </section>
  )
}

export default function GamepadTest() {
  const pads = useGamepads()
  return (
    <div className="wrap pad-page">
      <p className="eyebrow">Mandos</p>
      <h1 className="hero-title">Probá tu mando</h1>
      <p className="hero-copy">
        Conectá el mando y apretá cualquier botón: el navegador no lo muestra hasta entonces. Un mando de PS2 se
        conecta a la computadora con un adaptador USB.
      </p>
      {pads.length === 0 && <p className="pad-empty">Esperando un mando… apretá un botón.</p>}
      {pads.map((pad) => (
        <PadCard key={pad.index} pad={pad} />
      ))}
    </div>
  )
}
