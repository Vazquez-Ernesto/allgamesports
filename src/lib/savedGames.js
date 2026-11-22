// Partidas guardadas de un juego: cuánto ocupan, exportarlas en un .zip e
// importarlas. Cada motor declara dónde guarda (saves en runtimes/index.js):
//
//   { type: 'idbfs', db, dir?, match? }  IndexedDB de Emscripten (ver idbfs.js).
//                                        dir: subcarpeta del juego; match: qué
//                                        nombres son suyos, si la comparte.
//   { type: 'opfs', file }               un archivo en OPFS (Game Boy, NES)
//   { type: 'localStorage', prefix }     claves de localStorage (FTEQW)
//
// El .zip trae allgamesports.json (de qué juego es) y los archivos en
// partidas/, con sus nombres reales. Importar reemplaza lo que había: con el
// juego en marcha no sirve, porque el motor lo pisa con su copia en memoria.

import { createZip, listZip } from './zip.js'
import { listFiles, replaceFiles } from './idbfs.js'
import { localFileInfo, removeLocalFile, saveLocalFile } from './localFiles.js'

const MANIFEST = 'allgamesports.json'
const FOLDER = 'partidas/'
const NOT_OURS = 'Este .zip no es una exportación de partidas de allgamesports.'

const opfs = {
  async list({ file }) {
    const found = await localFileInfo(file)
    if (!found) return []
    return [{ path: file, bytes: new Uint8Array(await found.arrayBuffer()), modified: new Date(found.lastModified) }]
  },
  async replace({ file }, files) {
    await removeLocalFile(file)
    for (const { bytes } of files) {
      if (!(await saveLocalFile(file, bytes))) throw new Error('El navegador no dejó guardar la partida.')
    }
  },
  accepts: ({ file }, path) => path === file,
}

// FTEQW guarda cada archivo en una clave, con un carácter por byte.
const keyValue = {
  async list({ prefix }) {
    return storageKeys(prefix).map((key) => ({ path: key, bytes: Uint8Array.from(localStorage.getItem(key), (c) => c.charCodeAt(0)) }))
  },
  async replace({ prefix }, files) {
    storageKeys(prefix).forEach((key) => localStorage.removeItem(key))
    for (const { path, bytes } of files) localStorage.setItem(path, Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
  },
  accepts: ({ prefix }, path) => path.startsWith(prefix),
}

function storageKeys(prefix) {
  return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((key) => key?.startsWith(prefix))
}

const idbfs = {
  list: listFiles,
  replace: replaceFiles,
  accepts: ({ match }, path) => !match || match.test(path),
}

const PLACES = { idbfs, opfs, localStorage: keyValue }

// { count, bytes, modified } de lo que el juego tiene guardado.
export async function savesSummary(place) {
  const files = await PLACES[place.type].list(place)
  const dates = files.map((file) => file.modified).filter(Boolean)
  return {
    count: files.length,
    bytes: files.reduce((total, file) => total + file.bytes.length, 0),
    modified: dates.length ? new Date(Math.max(...dates)) : null,
  }
}

export async function exportSaves(game, place) {
  const files = await PLACES[place.type].list(place)
  const manifest = { formato: 1, juego: game.slug, titulo: game.title, exportado: new Date().toISOString() }
  return createZip([
    { name: MANIFEST, bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2) + '\n') },
    ...files.map((file) => ({ name: FOLDER + file.path, bytes: file.bytes })),
  ])
}

async function readManifest(entries) {
  const entry = entries.find((candidate) => candidate.name === MANIFEST)
  if (!entry) throw new Error(NOT_OURS)
  try {
    return JSON.parse(new TextDecoder().decode(await entry.read()))
  } catch {
    throw new Error(NOT_OURS)
  }
}

// Rutas relativas simples: sin "..", sin "/" al principio y sin "\".
const isSafePath = (path) => path.split('/').every((part) => part && part !== '.' && part !== '..' && !part.includes('\\'))

// Lee un .zip exportado y devuelve sus partidas, si son de este juego.
export async function readSavesZip(bytes, game, place) {
  const entries = listZip(bytes)
  const manifest = await readManifest(entries)
  if (manifest.juego !== game.slug) throw new Error(`Este archivo tiene partidas de ${manifest.titulo ?? manifest.juego}, no de ${game.title}.`)
  const files = []
  for (const entry of entries.filter((candidate) => candidate.name.startsWith(FOLDER))) {
    const path = entry.name.slice(FOLDER.length)
    if (!isSafePath(path) || !PLACES[place.type].accepts(place, path)) throw new Error(`El archivo trae algo que no es de ${game.title}: ${path}`)
    files.push({ path, bytes: (await entry.read()).slice() }) // slice: copia propia, no un pedazo del zip
  }
  if (files.length === 0) throw new Error('El archivo no trae partidas.')
  return files
}

export const replaceSaves = (place, files) => PLACES[place.type].replace(place, files)

// partidas-soltys-2026-11-22.zip
export function savesFileName(game, date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `partidas-${game.slug}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
