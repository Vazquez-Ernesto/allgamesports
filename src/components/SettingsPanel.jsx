// Muestra solo los ajustes que el motor declara en sus defaults.
export default function SettingsPanel({ settings, onChange, defaults }) {
  const set = (key, value) => onChange({ ...settings, [key]: value })
  const has = (key) => key in defaults

  return (
    <div className="settings">
      {has('volume') && (
        <label className="field">
          <span className="field-label">
            Volumen <output>{Math.round(settings.volume * 100)}%</output>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={(event) => set('volume', Number(event.target.value))}
          />
        </label>
      )}

      {has('mouseLook') && (
        <>
          <label className="field field-check">
            <input
              type="checkbox"
              checked={settings.mouseLook}
              onChange={(event) => set('mouseLook', event.target.checked)}
            />
            <span>
              Girar con el mouse
              <small>Hacé clic sobre el juego para capturar el puntero; Esc lo libera.</small>
            </span>
          </label>

          <label className="field">
            <span className="field-label">
              Sensibilidad del mouse <output>{settings.mouseSensitivity.toFixed(1)}×</output>
            </span>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={settings.mouseSensitivity}
              disabled={!settings.mouseLook}
              onChange={(event) => set('mouseSensitivity', Number(event.target.value))}
            />
          </label>
        </>
      )}

      <fieldset className="field">
        <legend className="field-label">Proporción de pantalla</legend>
        <div className="segmented">
          {[
            ['4 / 3', '4:3 (original)'],
            ['16 / 10', '16:10 (píxeles cuadrados)'],
          ].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={settings.aspect === value} onClick={() => set('aspect', value)}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field field-check">
        <input
          type="checkbox"
          checked={settings.sharpPixels}
          onChange={(event) => set('sharpPixels', event.target.checked)}
        />
        <span>
          Píxeles nítidos
          <small>Desactivalo para suavizar la imagen al agrandarla.</small>
        </span>
      </label>

      <button type="button" className="btn btn-quiet" onClick={() => onChange({ ...defaults })}>
        Restablecer ajustes
      </button>
    </div>
  )
}
