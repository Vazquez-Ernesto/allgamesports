// Prepara public/games/scummvm/data: los juegos y los archivos de soporte.
//
// Uso: node engines/scummvm/prepare-data.mjs <carpeta data/ del build de ScummVM>
//
// ScummVM monta /data como un sistema de archivos HTTP: por cada carpeta pide
// un index.json ({ "archivo": tamaño, "subcarpeta": {} }) y baja cada archivo
// recién cuando el juego lo abre. Para que pesen menos, acá se guardan con gzip
// y extensión .dgz; play.js los descomprime al vuelo. El index.json lleva el
// tamaño SIN comprimir, porque ScummVM lo compara con lo que recibe.

import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { listZip } from '../../src/lib/zip.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '../../public/games/scummvm/data')
const CACHE = join(HERE, '.cache')
const GZ_EXT = '.dgz' // no .gz: algunos servidores le agregan Content-Encoding

// Juegos freeware: se distribuyen gratis con su readme intacto (ver cada readme.txt).
const GAMES = [
  {
    id: 'sky',
    url: 'https://downloads.scummvm.org/frs/extras/Beneath%20a%20Steel%20Sky/BASS-Floppy-1.3.zip',
    sha256: 'd0bac1bd61747a67e885fa44b78c78887bf2b15d3dfa2790c483fad651078818',
  },
  {
    id: 'queen',
    url: 'https://downloads.scummvm.org/frs/extras/Flight%20of%20the%20Amazon%20Queen/FOTAQ_Floppy.zip',
    sha256: '2e59de85f708cdb32bf85c85b394ac091c05f7647e856b71f5b3ae73fde761e0',
  },
]

// Archivos del build que necesitan los motores (sky.cpt, queen.tbl) y el tema
// del menú. El resto (traducciones, íconos del lanzador...) no hace falta.
const SUPPORT_FILES = ['sky.cpt', 'queen.tbl', 'scummremastered.zip']

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function download(game) {
  const cached = join(CACHE, basename(new URL(game.url).pathname))
  if (!existsSync(cached)) {
    const response = await fetch(game.url)
    if (!response.ok) throw new Error(`No se pudo bajar ${game.url} (HTTP ${response.status})`)
    mkdirSync(CACHE, { recursive: true })
    writeFileSync(cached, new Uint8Array(await response.arrayBuffer()))
  }
  const bytes = new Uint8Array(readFileSync(cached))
  if (sha256(bytes) !== game.sha256) throw new Error(`El SHA-256 de ${cached} no coincide`)
  return bytes
}

// Guarda un archivo comprimido y devuelve su entrada para el index.json.
function writeCompressed(dir, name, bytes) {
  writeFileSync(join(dir, name + GZ_EXT), gzipSync(bytes, { level: 9 }))
  return [name, bytes.length]
}

async function prepareGame(game) {
  const dir = join(OUT, 'games', game.id)
  mkdirSync(dir, { recursive: true })
  const index = {}
  for (const entry of listZip(await download(game))) {
    const name = basename(entry.name)
    const bytes = await entry.read()
    const [key, size] = writeCompressed(dir, name, bytes)
    index[key] = size
    if (name.toLowerCase() === 'readme.txt') writeFileSync(join(dir, name), bytes) // legible, como pide la licencia
  }
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index))
  console.log(`${game.id}: ${Object.keys(index).join(', ')}`)
}

function prepareSupport(buildDataDir) {
  const index = { games: {} }
  for (const name of SUPPORT_FILES) {
    const [key, size] = writeCompressed(OUT, name, readFileSync(join(buildDataDir, name)))
    index[key] = size
  }
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index))
}

function writeGamesIndex() {
  const index = Object.fromEntries(GAMES.map((game) => [game.id, {}]))
  writeFileSync(join(OUT, 'games', 'index.json'), JSON.stringify(index))
}

const buildDataDir = process.argv[2]
if (!buildDataDir) throw new Error('Falta la carpeta data/ del build de ScummVM')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'games'), { recursive: true })
prepareSupport(buildDataDir)
for (const game of GAMES) await prepareGame(game)
writeGamesIndex()
