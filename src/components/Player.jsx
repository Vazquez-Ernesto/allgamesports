import { useCallback, useEffect, useRef, useState } from 'react'

import Modal from './Modal.jsx'
import ControlsPanel from './ControlsPanel.jsx'
import KeyList from './KeyList.jsx'
import SettingsPanel from './SettingsPanel.jsx'
import { runtimeFor } from '../runtimes/index.js'
import { fetchBytes } from '../lib/fetchBytes.js'
import { loadLocalFile, removeLocalFile, saveLocalFile } from '../lib/localFiles.js'
import { loadJSON, removeKey, saveJSON } from '../lib/storage.js'

const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(1)

export default function Player({ game }) {
  const runtime = runtimeFor(game.engine)
  const usesIframe = runtime.surface === 'iframe'
  const hasSettings = Object.keys(runtime.defaultSettings).length > 0
  const hint = game.hint ?? runtime.hint
  const keyList = game.keyList ?? runtime.keyList
  const isByo = game.source.type === 'byo'
  const byoKey = isByo ? `byo:${game.source.storageKey}` : null

  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const gameRef = useRef(null) // el motor en marcha (lo que devuelve runtime.start)
  const runRef = useRef(0) // identifica cada arranque, para descartar los viejos

  // idle | loading | running | ended | error
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(null) // { loaded, total }
  const [error, setError] = useState('')
  const [panel, setPanel] = useState(null) // 'controls' | 'settings' | null
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dragging, setDragging] = useState(false)

  // Las claves llevan el nombre del motor: 'doom:settings', 'tyrian:settings'...
  const [bindings, setBindings] = useState(() =>
    runtime.defaultBindings ? { ...runtime.defaultBindings(), ...loadJSON(`${game.engine}:bindings`, {}) } : null,
  )
  const [settings, setSettings] = useState(() => ({
    ...runtime.defaultSettings,
    ...loadJSON(`${game.engine}:settings`, {}),
  }))
  // Archivo que el jugador ya cargó en una visita anterior: { fileName, title, size }
  const [byoFile, setByoFile] = useState(() => (isByo ? loadJSON(byoKey, null) : null))
  // Las entradas guardadas antes del segundo motor usaban wadName.
  const byoFileName = byoFile?.fileName ?? byoFile?.wadName

  // ----- Arranque y parada del motor -----

  const stop = useCallback(() => {
    runRef.current += 1
    const running = gameRef.current
    gameRef.current = null
    running?.destroy()
  }, [])

  // Al salir de la página, liberar el motor.
  useEffect(() => stop, [stop])

  async function start(picked) {
    stop()
    const run = runRef.current
    setPhase('loading')
    setError('')
    setProgress(null)

    try {
      let data
      let fileName
      let saveKey

      if (!isByo) {
        // Sin url: el motor baja sus datos solo, a medida que los necesita (ScummVM).
        if (game.source.url) {
          data = await fetchBytes(import.meta.env.BASE_URL + game.source.url, (loaded, total) =>
            setProgress({ loaded, total }),
          )
        }
        fileName = game.source.fileName
        saveKey = game.slug
      } else {
        data = picked?.bytes ?? (await loadLocalFile(game.source.storageKey))
        fileName = picked?.fileName ?? byoFileName
        if (!data || !fileName) {
          forgetByoFile()
          throw new Error('No se encontró el archivo guardado. Elegilo de nuevo.')
        }
        saveKey = `byo-${fileName.replace(/\.[^.]+$/, '')}` // doom.wad -> byo-doom
      }

      if (run !== runRef.current) return // se canceló mientras descargaba

      const running = await runtime.start({
        game,
        frame: frameRef.current,
        canvas: canvasRef.current,
        data,
        fileName,
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

  // ----- "Bring your own": el jugador aporta su archivo -----

  async function handleFile(file) {
    if (!file) return
    setError('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const { fileName, title } = runtime.identifyFile(bytes, file.name)
      const info = { fileName, title, size: bytes.length }

      // Guardarlo en el navegador para la próxima visita (si se puede).
      const stored = await saveLocalFile(game.source.storageKey, bytes)
      if (stored) {
        saveJSON(byoKey, info)
        setByoFile(info)
      }

      start({ bytes, fileName })
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
    saveJSON(`${game.engine}:settings`, settings)
    gameRef.current?.applySettings?.(settings)
  }, [settings, game.engine])

  useEffect(() => {
    if (!bindings) return
    saveJSON(`${game.engine}:bindings`, bindings)
    gameRef.current?.setBindings?.(bindings)
  }, [bindings, game.engine])

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
      // (abre el menú del juego) en vez de salir. Solo Chrome/Edge lo soportan.
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
          // SDL2 (Tyrian) busca el canvas por este id y escucha el teclado ahí.
          id="canvas"
          tabIndex={0}
          className={`player-canvas${settings.sharpPixels ? ' is-sharp' : ''}`}
          style={{ aspectRatio: settings.aspect }}
          hidden={phase !== 'running' || usesIframe}
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
                <p className="player-drop-title">{game.source.dropTitle}</p>
                <p className="player-note">
                  {game.source.dropNote} Se guarda en tu navegador, no se sube a ningún lado.
                </p>
                <div className="player-actions">
                  {game.source.download && (
                    <a className="btn" href={game.source.download.url} target="_blank" rel="noreferrer">
                      {game.source.download.label}
                    </a>
                  )}
                  <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                    Elegir archivo
                  </button>
                </div>
              </>
            )}
            <p className="player-hint">
              {hint.map(([keys, label], index) => (
                <span key={label}>
                  {index > 0 && ' · '}
                  {keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}{' '}
                  {label}
                </span>
              ))}
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
            accept={game.source.accept}
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
        {hasSettings && (
          <button type="button" className="btn" onClick={() => setPanel('settings')}>
            Ajustes
          </button>
        )}
        {(phase === 'running' || phase === 'ended') && (
          <button type="button" className="btn btn-quiet" onClick={() => start()}>
            Reiniciar
          </button>
        )}
      </div>

      {panel === 'controls' && (
        <Modal title="Controles" onClose={() => setPanel(null)}>
          {bindings ? (
            <ControlsPanel bindings={bindings} onChange={setBindings} />
          ) : (
            <KeyList keys={keyList} note={runtime.keyNote} />
          )}
        </Modal>
      )}
      {panel === 'settings' && (
        <Modal title="Ajustes" onClose={() => setPanel(null)}>
          <SettingsPanel settings={settings} onChange={setSettings} defaults={runtime.defaultSettings} />
        </Modal>
      )}
    </section>
  )
}
