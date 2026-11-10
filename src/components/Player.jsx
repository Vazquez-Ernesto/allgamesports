import { useCallback, useEffect, useRef, useState } from 'react'

import Modal from './Modal.jsx'
import ControlsPanel from './ControlsPanel.jsx'
import SettingsPanel from './SettingsPanel.jsx'
import { fetchBytes, startDoom } from '../runtimes/doom/index.js'
import { defaultBindings } from '../runtimes/doom/keys.js'
import { identifyWad } from '../lib/wad.js'
import { loadLocalFile, removeLocalFile, saveLocalFile } from '../lib/localFiles.js'
import { loadJSON, removeKey, saveJSON } from '../lib/storage.js'

const DEFAULT_SETTINGS = {
  volume: 0.8,
  mouseLook: true,
  mouseSensitivity: 1,
  sharpPixels: true,
  aspect: '4 / 3', // así se veía en un monitor de la época
}

const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(1)

export default function Player({ game }) {
  const isByo = game.source.type === 'byo'
  const byoKey = isByo ? `byo:${game.source.storageKey}` : null

  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const gameRef = useRef(null) // el motor en marcha (lo que devuelve startDoom)
  const runRef = useRef(0) // identifica cada arranque, para descartar los viejos

  // idle | loading | running | ended | error
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(null) // { loaded, total }
  const [error, setError] = useState('')
  const [panel, setPanel] = useState(null) // 'controls' | 'settings' | null
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [bindings, setBindings] = useState(() => ({ ...defaultBindings(), ...loadJSON('doom:bindings', {}) }))
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...loadJSON('doom:settings', {}) }))
  // WAD que el jugador ya cargó en una visita anterior: { wadName, title, size }
  const [byoFile, setByoFile] = useState(() => (isByo ? loadJSON(byoKey, null) : null))

  // ----- Arranque y parada del motor -----

  const stop = useCallback(() => {
    runRef.current += 1
    const running = gameRef.current
    gameRef.current = null
    running?.destroy()
  }, [])

  // Al salir de la página, liberar el motor.
  useEffect(() => stop, [stop])

  async function start(pickedWad) {
    stop()
    const run = runRef.current
    setPhase('loading')
    setError('')
    setProgress(null)

    try {
      let wad
      let wadName
      let saveKey

      if (!isByo) {
        wad = await fetchBytes(import.meta.env.BASE_URL + game.source.url, (loaded, total) =>
          setProgress({ loaded, total }),
        )
        wadName = game.source.wadName
        saveKey = game.slug
      } else {
        wad = pickedWad?.bytes ?? (await loadLocalFile(game.source.storageKey))
        wadName = pickedWad?.wadName ?? byoFile?.wadName
        if (!wad || !wadName) {
          forgetByoFile()
          throw new Error('No se encontró el archivo guardado. Elegilo de nuevo.')
        }
        saveKey = `byo-${wadName.replace('.wad', '')}`
      }

      if (run !== runRef.current) return // se canceló mientras descargaba

      const running = await startDoom({
        canvas: canvasRef.current,
        wad,
        wadName,
        saveKey,
        bindings,
        settings,
        onQuit: () => setPhase('ended'),
        onError: (message) => {
          setError(message)
          setPhase('error')
        },
      })

      if (run !== runRef.current) {
        running.destroy()
        return
      }

      gameRef.current = running
      setPhase('running')
    } catch (failure) {
      if (run !== runRef.current) return
      setError(failure.message || 'No se pudo iniciar el juego.')
      setPhase('error')
    }
  }

  // ----- "Bring your own": el jugador aporta su WAD -----

  async function handleFile(file) {
    if (!file) return
    setError('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const { wadName, title } = identifyWad(bytes, file.name)
      const info = { wadName, title, size: bytes.length }

      // Guardarlo en el navegador para la próxima visita (si se puede).
      const stored = await saveLocalFile(game.source.storageKey, bytes)
      if (stored) {
        saveJSON(byoKey, info)
        setByoFile(info)
      }

      start({ bytes, wadName })
    } catch (failure) {
      setError(failure.message)
      setPhase('error')
    }
  }

  function forgetByoFile() {
    removeLocalFile(game.source.storageKey)
    removeKey(byoKey)
    setByoFile(null)
  }

  function onDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (isByo && phase !== 'running') handleFile(event.dataTransfer.files[0])
  }

  // ----- Ajustes y controles: guardar y aplicar al motor en marcha -----

  useEffect(() => {
    saveJSON('doom:settings', settings)
    const running = gameRef.current
    if (!running) return
    running.setVolume(settings.volume)
    running.input.setMouseSensitivity(settings.mouseSensitivity)
    running.input.setMouseLook(settings.mouseLook)
  }, [settings])

  useEffect(() => {
    saveJSON('doom:bindings', bindings)
    gameRef.current?.input.setBindings(bindings)
  }, [bindings])

  // Con un panel abierto el juego se pausa (y no le llegan las teclas).
  useEffect(() => {
    const running = gameRef.current
    if (!running || phase !== 'running') return
    if (panel) running.pause()
    else running.resume()
  }, [panel, phase])

  // ----- Pantalla completa -----

  useEffect(() => {
    function onChange() {
      const active = document.fullscreenElement === frameRef.current
      setIsFullscreen(active)
      // En pantalla completa, pedirle al navegador que Esc llegue al juego
      // (abre el menú de Doom) en vez de salir. Solo Chrome/Edge lo soportan.
      if (active) navigator.keyboard?.lock?.(['Escape']).catch(() => {})
      else navigator.keyboard?.unlock?.()
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else frameRef.current?.requestFullscreen?.().catch(() => {})
  }

  // ----- Render -----

  const percent = progress?.total ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null
  const canPlay = !isByo || Boolean(byoFile)

  return (
    <section className="player" aria-label={`Reproductor de ${game.title}`}>
      <div
        ref={frameRef}
        className={`player-frame${dragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          if (!isByo || phase === 'running') return
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <canvas
          ref={canvasRef}
          className={`player-canvas${settings.sharpPixels ? ' is-sharp' : ''}`}
          style={{ aspectRatio: settings.aspect }}
          hidden={phase !== 'running'}
        />

        {phase === 'idle' && (
          <div
            className="player-overlay"
            style={game.cover ? { '--cover': `url(${import.meta.env.BASE_URL}${game.cover})` } : undefined}
          >
            {canPlay ? (
              <>
                <button type="button" className="btn btn-primary btn-big" onClick={() => start()}>
                  ▶ Jugar
                </button>
                <p className="player-note">
                  {isByo
                    ? `${byoFile.title} · ${formatMB(byoFile.size)} MB guardados en este navegador`
                    : `Descarga de ${game.source.downloadMB} MB la primera vez`}
                </p>
                {isByo && (
                  <button type="button" className="btn btn-quiet" onClick={forgetByoFile}>
                    Usar otro archivo
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="player-drop-title">Arrastrá acá tu archivo .WAD</p>
                <p className="player-note">
                  DOOM.WAD, DOOM2.WAD, TNT.WAD, PLUTONIA.WAD o DOOM1.WAD (shareware). Se guarda en tu navegador, no se
                  sube a ningún lado.
                </p>
                <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                  Elegir archivo
                </button>
              </>
            )}
            <p className="player-hint">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> mover · <kbd>Mouse</kbd> girar · <kbd>Espacio</kbd> o clic disparar · <kbd>E</kbd> usar
            </p>
          </div>
        )}

        {phase === 'loading' && (
          <div className="player-overlay" role="status" aria-live="polite">
            <p className="player-loading-title">{progress ? 'Descargando…' : 'Iniciando motor…'}</p>
            <div className="progress" aria-hidden="true">
              <div className="progress-bar" style={{ width: `${percent ?? 100}%` }} data-indeterminate={percent === null} />
            </div>
            <p className="player-note">
              {progress
                ? `${formatMB(progress.loaded)} MB${progress.total ? ` de ${formatMB(progress.total)} MB` : ''}`
                : 'Un momento'}
            </p>
          </div>
        )}

        {phase === 'ended' && (
          <div className="player-overlay">
            <p className="player-loading-title">Saliste del juego</p>
            <p className="player-note">Tu partida guardada sigue en este navegador.</p>
            <button type="button" className="btn btn-primary" onClick={() => start()}>
              Volver a jugar
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="player-overlay" role="alert">
            <p className="player-loading-title">No se pudo iniciar</p>
            <p className="player-error">{error}</p>
            {canPlay ? (
              <button type="button" className="btn btn-primary" onClick={() => start()}>
                Reintentar
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                Elegir otro archivo
              </button>
            )}
          </div>
        )}

        {isByo && (
          <input
            ref={fileRef}
            type="file"
            accept=".wad,.WAD"
            hidden
            onChange={(event) => {
              handleFile(event.target.files[0])
              event.target.value = '' // permite volver a elegir el mismo archivo
            }}
          />
        )}
      </div>

      <div className="player-bar">
        <button type="button" className="btn" onClick={toggleFullscreen}>
          {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        </button>
        <button type="button" className="btn" onClick={() => setPanel('controls')}>
          Controles
        </button>
        <button type="button" className="btn" onClick={() => setPanel('settings')}>
          Ajustes
        </button>
        {(phase === 'running' || phase === 'ended') && (
          <button type="button" className="btn btn-quiet" onClick={() => start()}>
            Reiniciar
          </button>
        )}
      </div>

      {panel === 'controls' && (
        <Modal title="Controles" onClose={() => setPanel(null)}>
          <ControlsPanel bindings={bindings} onChange={setBindings} />
        </Modal>
      )}
      {panel === 'settings' && (
        <Modal title="Ajustes" onClose={() => setPanel(null)}>
          <SettingsPanel settings={settings} onChange={setSettings} defaults={DEFAULT_SETTINGS} />
        </Modal>
      )}
    </section>
  )
}
