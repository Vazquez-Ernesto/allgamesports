// Lectura mínima de un archivo WAD para saber qué juego es.
//
// Formato: 12 bytes de cabecera ("IWAD" o "PWAD", cantidad de lumps, posición
// del directorio) y un directorio con entradas de 16 bytes (posición, tamaño,
// nombre de 8 caracteres).

const KNOWN_NAMES = ['doom.wad', 'doom1.wad', 'doom2.wad', 'tnt.wad', 'plutonia.wad', 'freedoom1.wad', 'freedoom2.wad', 'freedm.wad']

const TITLES = {
  'doom.wad': 'DOOM',
  'doom1.wad': 'DOOM (shareware)',
  'doom2.wad': 'DOOM II',
  'tnt.wad': 'Final Doom: TNT Evilution',
  'plutonia.wad': 'Final Doom: The Plutonia Experiment',
  'freedoom1.wad': 'Freedoom: Phase 1',
  'freedoom2.wad': 'Freedoom: Phase 2',
  'freedm.wad': 'FreeDM',
}

/**
 * Identifica un IWAD de Doom.
 * @returns {{ wadName: string, title: string }} nombre con el que el motor lo reconoce.
 * @throws {Error} con un mensaje para mostrarle al usuario.
 */
export function identifyWad(bytes, fileName = '') {
  if (bytes.length < 12) throw new Error('El archivo es demasiado chico para ser un WAD.')

  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  if (magic === 'PWAD') {
    throw new Error('Ese archivo es un PWAD (un mod o mapa suelto). Hace falta el IWAD principal del juego, como DOOM.WAD o DOOM2.WAD.')
  }
  if (magic !== 'IWAD') throw new Error('Ese archivo no es un WAD de Doom.')

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const lumpCount = view.getInt32(4, true)
  const directory = view.getInt32(8, true)
  if (lumpCount <= 0 || directory < 12 || directory + lumpCount * 16 > bytes.length) {
    throw new Error('El WAD parece estar dañado o incompleto.')
  }

  const lumps = new Set()
  for (let i = 0; i < lumpCount; i++) {
    const start = directory + i * 16 + 8
    let name = ''
    for (let j = 0; j < 8 && bytes[start + j] !== 0; j++) {
      name += String.fromCharCode(bytes[start + j])
    }
    lumps.add(name.toUpperCase())
  }

  // Si el nombre del archivo es uno conocido, se respeta (distingue TNT y Plutonia).
  const lower = fileName.toLowerCase()
  let wadName = KNOWN_NAMES.includes(lower) ? lower : null

  if (!wadName) {
    if (lumps.has('MAP01')) wadName = 'doom2.wad'
    else if (lumps.has('E2M1')) wadName = 'doom.wad'
    else if (lumps.has('E1M1')) wadName = 'doom1.wad'
  }

  if (!wadName || (!lumps.has('MAP01') && !lumps.has('E1M1'))) {
    throw new Error('No se reconoce como un WAD de Doom o Doom II (Heretic, Hexen y Strife todavía no están soportados).')
  }

  return { wadName, title: TITLES[wadName] }
}
