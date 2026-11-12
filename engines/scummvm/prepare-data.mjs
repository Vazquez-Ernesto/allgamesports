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
const EXTRAS = 'https://downloads.scummvm.org/frs/extras'

// Juegos freeware: su licencia permite distribuirlos gratis con sus avisos
// intactos (ver el archivo de licencia de cada uno, que se copia legible).
//   include: qué archivos del zip se usan, por nombre sin carpeta (los
//            manuales en PDF y los ejecutables de DOS no hacen falta).
//   rename:  nombre final, cuando dos zips traen un archivo con el mismo nombre.
//   legible: archivos de licencia que además se copian sin comprimir.
const GAMES = [
  {
    id: 'sky',
    legible: ['readme.txt'],
    zips: [
      {
        url: `${EXTRAS}/Beneath%20a%20Steel%20Sky/BASS-Floppy-1.3.zip`,
        sha256: 'd0bac1bd61747a67e885fa44b78c78887bf2b15d3dfa2790c483fad651078818',
      },
    ],
  },
  {
    id: 'queen',
    legible: ['readme.txt'],
    zips: [
      {
        url: `${EXTRAS}/Flight%20of%20the%20Amazon%20Queen/FOTAQ_Floppy.zip`,
        sha256: '2e59de85f708cdb32bf85c85b394ac091c05f7647e856b71f5b3ae73fde761e0',
      },
    ],
  },
  {
    id: 'lure', // versión en español
    legible: ['LICENSE.txt', 'README'],
    zips: [
      {
        url: `${EXTRAS}/Lure%20of%20the%20Temptress/lure-es-1.1.zip`,
        sha256: '9306b9faad8c0a8189d3cbbfead511fc4d993655cc845cb8e15369baed2f7bb7',
        include: /\.VGA$|^LICENSE\.txt$|^README$/i,
      },
    ],
  },
  {
    id: 'drascula', // juego base + textos y voces en español (PACKET.004) + música
    legible: ['readme.txt', 'readme-int.txt', 'readme-musica.txt'],
    zips: [
      {
        url: `${EXTRAS}/Drascula_%20The%20Vampire%20Strikes%20Back/drascula-1.0.zip`,
        sha256: 'b731f6cb5a22ba8b4c3b3362f570b9a10a67b6cb0b395394b19a94b36e4e42de',
        include: /^Packet\.001$|^readme\.txt$/i,
      },
      {
        url: `${EXTRAS}/Drascula_%20The%20Vampire%20Strikes%20Back/drascula-int-1.1.zip`,
        sha256: '24d894925c02993d0cd59013cd228b5e5c68c77d0dc57045a2aa2aba4e344388',
        include: /^PACKET\.004$|^readme\.txt$/i,
        rename: { 'readme.txt': 'readme-int.txt' },
      },
      {
        // Música: pistas del CD original. Sin ellas ScummVM avisa en cada arranque.
        url: `${EXTRAS}/Drascula_%20The%20Vampire%20Strikes%20Back/drascula-audio-mp3-2.0.zip`,
        sha256: '32bdb6d5163e538ffe20f6320e20e0b24050823be516775364be629ab1b52eee',
        include: /^track\d+\.mp3$|^readme\.txt$/i,
        rename: { 'readme.txt': 'readme-musica.txt' },
      },
    ],
  },
  {
    id: 'dreamweb',
    legible: ['license.txt'],
    zips: [
      {
        url: `${EXTRAS}/Dreamweb/dreamweb-uk-1.1.zip`,
        sha256: '0f98e5fbeedfff5f5b904220d3bd3288da5a272f9192da03f2160c5edb8cdfb3',
        include: /^DREAMWEB\.|^license\.txt$/i, // ScummVM reconoce la versión por DREAMWEB.EXE
      },
    ],
  },
]

// Archivos del build que necesitan los motores y el tema del menú. El resto
// (traducciones, íconos del lanzador...) no hace falta.
const SUPPORT_FILES = ['sky.cpt', 'queen.tbl', 'lure.dat', 'drascula.dat', 'scummremastered.zip']

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function download({ url, sha256: expected }) {
  const cached = join(CACHE, basename(new URL(url).pathname))
  if (!existsSync(cached)) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`No se pudo bajar ${url} (HTTP ${response.status})`)
    mkdirSync(CACHE, { recursive: true })
    writeFileSync(cached, new Uint8Array(await response.arrayBuffer()))
  }
  const bytes = new Uint8Array(readFileSync(cached))
  if (sha256(bytes) !== expected) throw new Error(`El SHA-256 de ${cached} no coincide`)
  return bytes
}

// Guarda un archivo comprimido y devuelve su tamaño original, para el index.json.
function writeCompressed(dir, name, bytes) {
  writeFileSync(join(dir, name + GZ_EXT), gzipSync(bytes, { level: 9 }))
  return bytes.length
}

// Archivos de un zip que se usan: [nombre final, entrada del zip].
async function filesOf(zip) {
  const entries = listZip(await download(zip)).filter((entry) => !zip.include || zip.include.test(basename(entry.name)))
  return entries.map((entry) => {
    const name = basename(entry.name)
    return [zip.rename?.[name] ?? name, entry]
  })
}

async function prepareGame(game) {
  const dir = join(OUT, 'games', game.id)
  mkdirSync(dir, { recursive: true })
  const index = {}
  for (const zip of game.zips) {
    for (const [name, entry] of await filesOf(zip)) {
      const bytes = await entry.read()
      index[name] = writeCompressed(dir, name, bytes)
      if (game.legible.includes(name)) writeFileSync(join(dir, name), bytes)
    }
  }
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index))
  const megabytes = (Object.values(index).reduce((a, b) => a + b, 0) / 1048576).toFixed(1)
  console.log(`${game.id}: ${Object.keys(index).length} archivos, ${megabytes} MB sin comprimir`)
}

function prepareSupport(buildDataDir) {
  const index = { games: {} }
  for (const name of SUPPORT_FILES) {
    index[name] = writeCompressed(OUT, name, readFileSync(join(buildDataDir, name)))
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
