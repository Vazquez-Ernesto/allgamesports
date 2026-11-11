// Catálogo. Para sumar un juego: agregá una entrada acá y, si usa un motor
// nuevo, un runtime en src/runtimes/<motor>/.
//
// source.type:
//   'hosted' -> los datos del juego son libres y se sirven desde este sitio.
//               fileName: nombre con el que el motor reconoce el archivo.
//   'byo'    -> "bring your own": el jugador aporta su propio archivo, que
//               nunca sale de su navegador. accept, dropTitle y dropNote son
//               los textos del reproductor; download (opcional) es un enlace
//               a la descarga oficial del archivo.

export const GAMES = [
  {
    slug: 'freedoom-1',
    title: 'Freedoom: Phase 1',
    short: 'El motor original de DOOM (1993) con cuatro episodios de niveles libres.',
    platform: 'PC (DOS)',
    genre: 'FPS',
    year: 1993,
    engine: 'doom',
    cover: 'games/doom/freedoom1-cover.png',
    source: {
      type: 'hosted',
      url: 'games/doom/freedoom1.wadgz',
      fileName: 'freedoom1.wad',
      downloadMB: 9.8,
    },
    description: [
      'El código fuente de DOOM que id Software liberó en 1997, compilado a WebAssembly. Corre directo en el navegador: no hay un emulador de DOS por debajo.',
      'Los niveles, gráficos y sonidos son de Freedoom, un proyecto comunitario que reemplaza todo el contenido original por material libre. Cuatro episodios completos, compatibles con el motor clásico.',
    ],
    facts: [
      ['Motor', 'doomgeneric (id Software, GPL-2.0)'],
      ['Datos', 'Freedoom 0.13 (BSD-3)'],
      ['Tecnología', 'C → WebAssembly con Emscripten'],
      ['Guardado', 'En tu navegador (IndexedDB)'],
    ],
  },
  {
    slug: 'freedoom-2',
    title: 'Freedoom: Phase 2',
    short: '32 niveles libres sobre el motor de DOOM II, con la escopeta de dos caños.',
    platform: 'PC (DOS)',
    genre: 'FPS',
    year: 1994,
    engine: 'doom',
    cover: 'games/doom/freedoom2-cover.png',
    source: {
      type: 'hosted',
      url: 'games/doom/freedoom2.wadgz',
      fileName: 'freedoom2.wad',
      downloadMB: 10.4,
    },
    description: [
      'La segunda parte de Freedoom: una campaña de 32 niveles pensada para el motor de DOOM II, con más enemigos y armas que Phase 1.',
      'Usa exactamente el mismo motor compilado a WebAssembly; lo único que cambia es el archivo de datos (WAD).',
    ],
    facts: [
      ['Motor', 'doomgeneric (id Software, GPL-2.0)'],
      ['Datos', 'Freedoom 0.13 (BSD-3)'],
      ['Tecnología', 'C → WebAssembly con Emscripten'],
      ['Guardado', 'En tu navegador (IndexedDB)'],
    ],
  },
  {
    slug: 'doom-tu-wad',
    title: 'DOOM: tu propio WAD',
    short: 'Cargá el DOOM.WAD o DOOM2.WAD de tu copia y jugá el original.',
    platform: 'PC (DOS)',
    genre: 'FPS',
    year: 1993,
    engine: 'doom',
    cover: null,
    source: {
      type: 'byo',
      storageKey: 'doom-iwad',
      accept: '.wad,.WAD',
      dropTitle: 'Arrastrá acá tu archivo .WAD',
      dropNote: 'DOOM.WAD, DOOM2.WAD, TNT.WAD, PLUTONIA.WAD o DOOM1.WAD (shareware).',
    },
    description: [
      'El motor es libre, pero los niveles originales de DOOM siguen siendo de id Software. Por eso acá no se distribuyen: los ponés vos.',
      'Elegí el archivo .WAD de tu copia (Steam, GOG o la versión shareware). Queda guardado en tu navegador y no se sube a ningún servidor; la próxima vez entrás directo a jugar.',
    ],
    facts: [
      ['Motor', 'doomgeneric (id Software, GPL-2.0)'],
      ['Datos', 'Los aportás vos (no se suben)'],
      ['Acepta', 'DOOM, DOOM II, Final Doom, shareware'],
      ['Guardado', 'En tu navegador (IndexedDB)'],
    ],
  },
  {
    slug: 'tyrian',
    title: 'Tyrian 2.1',
    short: "Shoot 'em up vertical de 1995: cuatro episodios y una tienda de armas entre misión y misión.",
    platform: 'PC (DOS)',
    genre: "Shoot 'em up",
    year: 1995,
    engine: 'tyrian',
    cover: null,
    source: {
      type: 'byo',
      storageKey: 'tyrian-data',
      accept: '.zip,.ZIP',
      dropTitle: 'Arrastrá acá el tyrian21.zip',
      dropNote: 'Es la versión gratuita y oficial de Tyrian 2.1 (4,7 MB). Descargala y elegila tal cual, sin descomprimir.',
      download: {
        url: 'https://camanis.net/tyrian/tyrian21.zip',
        label: 'Descargar tyrian21.zip',
      },
    },
    description: [
      'Un shooter de naves de scroll vertical publicado por Epic MegaGames en 1995. Entre nivel y nivel comprás armas, escudos y naves acompañantes con lo que juntaste.',
      'Corre sobre OpenTyrian, una reconstrucción en C del motor original, compilada a WebAssembly. Tyrian es gratis desde 2004, pero su autor solo permite compartirlo de forma personal: por eso los datos no se hospedan acá. Bajás el zip oficial y lo cargás vos; queda en tu navegador.',
    ],
    facts: [
      ['Motor', 'OpenTyrian (GPL-2.0)'],
      ['Datos', 'Tyrian 2.1, gratis desde 2004 (los aportás vos)'],
      ['Tecnología', 'C → WebAssembly con Emscripten, SDL2 y Asyncify'],
      ['Guardado', 'En tu navegador (IndexedDB)'],
    ],
  },
]

export function findGame(slug) {
  return GAMES.find((game) => game.slug === slug)
}

// Valores únicos de un campo, para armar los filtros.
export function uniqueValues(field) {
  return [...new Set(GAMES.map((game) => game[field]))]
}
