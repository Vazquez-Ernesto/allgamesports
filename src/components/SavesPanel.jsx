import { useCallback, useEffect, useRef, useState } from 'react'

import { downloadBlob, exportSaves, readSavesZip, replaceSaves, savesFileName, savesSummary } from '../lib/savedGames.js'

const EMPTY = { count: 0, bytes: 0, modified: null }

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`

const formatDate = (date) =>
  date.toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

function describe(summary) {
  if (!summary) return 'Revisando lo guardado…'
  if (!summary.count) return 'Todavía no hay nada guardado de este juego en este navegador.'
  const when = summary.modified ? ` (${formatDate(summary.modified)})` : ''
  return `Guardado en este navegador: ${formatSize(summary.bytes)}${when}.`
}

async function exportToDownload(game, place, flush) {
  await flush() // que el zip lleve lo último que guardó el juego en marcha
  const fileName = savesFileName(game)
  downloadBlob(await exportSaves(game, place), fileName)
  return `Listo: se descargó ${fileName}.`
}

async function importAndReplace(place, files, stopGame, refresh) {
  await stopGame() // con el juego en marcha, el motor pisaría lo importado
  await replaceSaves(place, files)
  await refresh()
  return 'Listo: se importaron tus partidas. Tocá Jugar para seguir.'
}

// Lo guardado ahora: primero le pide al juego en marcha que copie lo último.
function useSummary(place, flush) {
  const [summary, setSummary] = useState(null)
  const refresh = useCallback(async () => {
    await flush()
    setSummary(await savesSummary(place).catch(() => EMPTY))
  }, [place, flush])
  useEffect(() => {
    refresh()
  }, [refresh])
  return [summary, refresh]
}

// Corre una acción y muestra su resultado o su error.
function useTask() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { text, isError }
  const run = useCallback(async (action) => {
    setBusy(true)
    setMessage(null)
    try {
      const text = await action()
      if (text) setMessage({ text })
    } catch (error) {
      setMessage({ text: error.message, isError: true })
    } finally {
      setBusy(false)
    }
  }, [])
  return { busy, message, run }
}

function useSaves({ game, place, isRunning, flush, stopGame }) {
  const [summary, refresh] = useSummary(place, flush)
  const { busy, message, run } = useTask()
  const [pending, setPending] = useState(null) // partidas leídas, esperando confirmación
  const importFiles = (files) => importAndReplace(place, files, stopGame, refresh)

  // Si no hay nada que perder, importa directo; si no, pide confirmación.
  const pick = (file) =>
    run(async () => {
      const files = await readSavesZip(new Uint8Array(await file.arrayBuffer()), game, place)
      if (!summary?.count && !isRunning) return importFiles(files)
      setPending(files)
    })
  const confirm = () => {
    setPending(null)
    run(() => importFiles(pending))
  }
  const exportZip = () => run(() => exportToDownload(game, place, flush))
  return { summary, busy, message, pending, pick, confirm, exportZip, cancel: () => setPending(null) }
}

// Exportar e importar las partidas de un juego en un .zip.
export default function SavesPanel({ game, place, isRunning, flush, stopGame }) {
  const saves = useSaves({ game, place, isRunning, flush, stopGame })
  return (
    <div className="saves">
      <p className="controls-help">
        Tus partidas se guardan en este navegador. Exportalas para tener una copia o llevarlas a otro navegador.
      </p>
      <SavesActions saves={saves} />
      <p className="saves-summary">{describe(saves.summary)}</p>
      {saves.pending && <ConfirmImport game={game} isRunning={isRunning} onConfirm={saves.confirm} onCancel={saves.cancel} />}
      {saves.message && (
        <p className={`saves-message${saves.message.isError ? ' is-error' : ''}`} role="status">
          {saves.message.text}
        </p>
      )}
    </div>
  )
}

function SavesActions({ saves }) {
  const fileRef = useRef(null)
  const onFile = (event) => {
    if (event.target.files[0]) saves.pick(event.target.files[0])
    event.target.value = '' // permite volver a elegir el mismo archivo
  }
  return (
    <div className="saves-actions">
      <button type="button" className="btn btn-primary" disabled={saves.busy || !saves.summary?.count} onClick={saves.exportZip}>
        Exportar (.zip)
      </button>
      <button type="button" className="btn" disabled={saves.busy || Boolean(saves.pending)} onClick={() => fileRef.current?.click()}>
        Importar (.zip)
      </button>
      <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={onFile} />
    </div>
  )
}

function ConfirmImport({ game, isRunning, onConfirm, onCancel }) {
  return (
    <div className="saves-confirm" role="alert">
      <p>
        Esto reemplaza las partidas de {game.title} que hay en este navegador.
        {isRunning && ' El juego se cierra: lo que no guardaste se pierde.'}
      </p>
      <div className="saves-actions">
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          Importar igual
        </button>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
