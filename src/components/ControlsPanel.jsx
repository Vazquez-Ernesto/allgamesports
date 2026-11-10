import { useEffect, useState } from 'react'

import { ACTIONS, PAD_BUTTONS, PAD_STICKS, defaultBindings, keyLabel } from '../runtimes/doom/keys.js'

const MAX_KEYS = 2
const GROUPS = [...new Set(ACTIONS.map((action) => action.group))]

const FIXED_KEYS = [
  ['1 – 7', 'Elegir arma'],
  ['Clic izq.', 'Disparar'],
  ['Clic der.', 'Usar / abrir'],
  ['Rueda', 'Cambiar de arma'],
  ['F2 / F3', 'Guardar / cargar partida'],
  ['F6 / F9', 'Guardado / carga rápida'],
  ['- / =', 'Achicar / agrandar la vista'],
]

export default function ControlsPanel({ bindings, onChange }) {
  const [tab, setTab] = useState('keyboard')
  // Qué casilla está esperando una tecla: { actionId, index }
  const [listening, setListening] = useState(null)
  const [padName, setPadName] = useState(null)

  // Reasignar: la próxima tecla que se apriete va a la casilla elegida.
  useEffect(() => {
    if (!listening) return

    function onKeyDown(event) {
      event.preventDefault()
      event.stopPropagation()

      if (event.code === 'Escape') {
        setListening(null)
        return
      }

      const { actionId, index } = listening
      const next = {}
      // Una tecla solo puede estar en una acción: se saca de las demás.
      for (const action of ACTIONS) {
        next[action.id] = (bindings[action.id] ?? []).filter((code) => code !== event.code)
      }
      const keys = [...next[actionId]]
      keys[Math.min(index, keys.length)] = event.code
      next[actionId] = keys.slice(0, MAX_KEYS)

      onChange(next)
      setListening(null)
    }

    // capture: se adelanta al listener que cierra el modal con Esc.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [listening, bindings, onChange])

  // Detectar si hay un mando conectado mientras el panel está abierto.
  useEffect(() => {
    function check() {
      const pads = Array.from(navigator.getGamepads?.() ?? [])
      const pad = pads.find((candidate) => candidate && candidate.connected)
      setPadName(pad ? pad.id.replace(/\s*\(.*\)\s*$/, '') : null)
    }
    check()
    const timer = setInterval(check, 500)
    return () => clearInterval(timer)
  }, [])

  function clearKey(actionId, index) {
    const keys = (bindings[actionId] ?? []).filter((_, i) => i !== index)
    onChange({ ...bindings, [actionId]: keys })
  }

  return (
    <div className="controls">
      <div className="tabs" role="tablist" aria-label="Dispositivo">
        <button type="button" role="tab" aria-selected={tab === 'keyboard'} onClick={() => setTab('keyboard')}>
          Teclado y mouse
        </button>
        <button type="button" role="tab" aria-selected={tab === 'pad'} onClick={() => setTab('pad')}>
          Mando
        </button>
      </div>

      {tab === 'keyboard' && (
        <div role="tabpanel">
          <p className="controls-help">
            Tocá una casilla y apretá la tecla nueva. <kbd>Esc</kbd> cancela.
          </p>

          <div className="controls-groups">
            {GROUPS.map((group) => (
              <section key={group} className="controls-group">
                <h3>{group}</h3>
                <ul>
                  {ACTIONS.filter((action) => action.group === group).map((action) => {
                    const keys = bindings[action.id] ?? []
                    return (
                      <li key={action.id} className="bind-row">
                        <span className="bind-label">{action.label}</span>
                        <span className="bind-keys">
                          {Array.from({ length: MAX_KEYS }, (_, index) => {
                            const code = keys[index]
                            const isListening = listening?.actionId === action.id && listening.index === index
                            // No se muestra una segunda casilla vacía si la primera también lo está.
                            if (!code && index > keys.length) return null
                            return (
                              <span key={index} className="bind-slot">
                                <button
                                  type="button"
                                  className={`keycap${code ? '' : ' is-empty'}${isListening ? ' is-listening' : ''}`}
                                  onClick={() => setListening({ actionId: action.id, index })}
                                  aria-label={`${action.label}: ${code ? keyLabel(code) : 'sin asignar'}. Cambiar`}
                                >
                                  {isListening ? '…' : code ? keyLabel(code) : '+'}
                                </button>
                                {code && keys.length > 1 && (
                                  <button
                                    type="button"
                                    className="bind-clear"
                                    onClick={() => clearKey(action.id, index)}
                                    aria-label={`Quitar ${keyLabel(code)} de ${action.label}`}
                                  >
                                    ✕
                                  </button>
                                )}
                              </span>
                            )
                          })}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}

            <section className="controls-group">
              <h3>Fijos</h3>
              <ul>
                {FIXED_KEYS.map(([key, label]) => (
                  <li key={key} className="bind-row">
                    <span className="bind-label">{label}</span>
                    <span className="keycap is-static">{key}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <button type="button" className="btn btn-quiet" onClick={() => onChange(defaultBindings())}>
            Restablecer teclas
          </button>
        </div>
      )}

      {tab === 'pad' && (
        <div role="tabpanel">
          <p className={`pad-status${padName ? ' is-on' : ''}`} role="status">
            {padName ? `Conectado: ${padName}` : 'Ningún mando detectado. Conectalo y apretá cualquier botón.'}
          </p>
          <div className="controls-groups">
            <section className="controls-group">
              <h3>Botones</h3>
              <ul>
                {PAD_BUTTONS.map((button) => (
                  <li key={button.index} className="bind-row">
                    <span className="bind-label">{button.label}</span>
                    <span className="keycap is-static">{button.name}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="controls-group">
              <h3>Sticks</h3>
              <ul>
                {PAD_STICKS.map((stick) => (
                  <li key={stick.name} className="bind-row">
                    <span className="bind-label">{stick.label}</span>
                    <span className="keycap is-static">{stick.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
