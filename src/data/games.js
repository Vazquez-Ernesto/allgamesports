// Catálogo. Para sumar un juego: agregá una entrada acá y, si usa un motor
// nuevo, un runtime en src/runtimes/<motor>/.
//
// platform: clave de src/data/platforms.js (la plataforma original del juego).
// year, developer, publisher: datos del juego original.
// cover: captura del juego, 320x200. Todos los juegos tienen una.
//
// source.type:
//   'hosted' -> los datos del juego son libres y se sirven desde este sitio.
//               fileName: nombre con el que el motor reconoce el archivo.
//               Sin url, el motor baja sus datos solo (ScummVM, con gameId).
//   'byo'    -> "bring your own": el jugador aporta su propio archivo, que
//               nunca sale de su navegador. accept, dropTitle y dropNote son
//               los textos del reproductor; download (opcional) es un enlace
//               a la descarga oficial del archivo; steps son los pasos que se
//               muestran en la ficha, en lenguaje llano.

export const GAMES = [
  {
    slug: 'freedoom-1',
    title: 'Freedoom: Phase 1',
    short: 'El motor original de DOOM (1993) con cuatro episodios de niveles libres.',
    platform: 'dos',
    genre: 'FPS',
    year: 1993,
    developer: 'id Software (motor) y Proyecto Freedoom (niveles)',
    publisher: 'Proyecto Freedoom',
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
    platform: 'dos',
    genre: 'FPS',
    year: 1994,
    developer: 'id Software (motor) y Proyecto Freedoom (niveles)',
    publisher: 'Proyecto Freedoom',
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
    title: 'DOOM (con tu copia)',
    short: 'El DOOM original de 1993. Necesitás el archivo de datos de tu copia del juego.',
    platform: 'dos',
    genre: 'FPS',
    year: 1993,
    developer: 'id Software',
    publisher: 'id Software',
    engine: 'doom',
    cover: 'games/doom/doom-byo-cover.svg',
    source: {
      type: 'byo',
      storageKey: 'doom-iwad',
      accept: '.wad,.WAD',
      dropTitle: 'Arrastrá acá el archivo de datos de DOOM',
      dropNote: 'Se llama DOOM.WAD, DOOM2.WAD, TNT.WAD, PLUTONIA.WAD o DOOM1.WAD (la demo gratuita).',
      steps: [
        'Buscá el archivo de datos en la carpeta donde instalaste DOOM (Steam o GOG). Se llama DOOM.WAD o DOOM2.WAD. Si no tenés el juego, sirve la demo gratuita de 1993 (DOOM1.WAD).',
        'Arrastralo al reproductor o tocá "Elegir archivo".',
        'Listo: queda guardado en tu navegador y la próxima vez entrás directo. No se sube a ningún servidor.',
      ],
      why: 'Un juego tiene dos partes: el motor (el programa) y los datos (niveles, gráficos y sonidos). El motor de DOOM es libre y está en esta página. Los datos siguen siendo de id Software y vienen en un archivo con extensión .WAD, por eso los ponés vos.',
    },
    description: [
      'El DOOM original, con sus niveles, monstruos y música de 1993. Corre sobre el mismo motor que Freedoom.',
      'Funciona con DOOM, DOOM II, Final Doom y la demo gratuita.',
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
    platform: 'dos',
    genre: "Shoot 'em up",
    year: 1995,
    developer: 'Eclipse Software',
    publisher: 'Epic MegaGames',
    engine: 'tyrian',
    cover: 'games/tyrian/tyrian-cover.png',
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
      steps: [
        'Tocá "Descargar tyrian21.zip": es la versión gratuita y oficial (4,7 MB).',
        'Arrastrá ese archivo al reproductor tal cual, sin descomprimirlo.',
        'Listo: queda guardado en tu navegador y la próxima vez entrás directo.',
      ],
      why: 'Tyrian es gratis desde 2004, pero su autor solo permite compartirlo de persona a persona. Por eso el archivo lo bajás vos del sitio oficial en vez de estar hospedado acá.',
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
  {
    slug: 'beneath-a-steel-sky',
    title: 'Beneath a Steel Sky',
    short: 'Aventura gráfica de ciencia ficción de 1994: una ciudad vertical, un robot de bolsillo y una conspiración.',
    platform: 'dos',
    genre: 'Aventura gráfica',
    year: 1994,
    developer: 'Revolution Software',
    publisher: 'Virgin Interactive',
    engine: 'scummvm',
    cover: 'games/scummvm/covers/sky.png',
    source: {
      type: 'hosted',
      gameId: 'sky',
      downloadMB: 11,
    },
    hint: [
      [['Clic izq.'], 'caminar, mirar, hablar'],
      [['Clic der.'], 'usar'],
      [['F5'], 'menú'],
    ],
    keyList: [
      ['Clic izq.', 'Caminar, mirar o hablar'],
      ['Clic der.', 'Usar'],
      ['F5', 'Panel de control (guardar, cargar, salir)'],
      ['Esc', 'Saltar o cerrar'],
      ['.', 'Saltar una línea de diálogo'],
      ['P', 'Pausa'],
      ['Ctrl+F', 'Modo rápido'],
    ],
    description: [
      'Robert Foster cae en una ciudad gigante donde los pobres viven en torres contaminadas y los ricos bajo tierra. Con la ayuda de Joey, un robot que cabe en una placa de circuito, tiene que descubrir quién es y qué esconde la ciudad. La versión de esta página es la de disquete: textos, sin voces.',
      'Revolution Software lo liberó como freeware en 2003 junto con el equipo de ScummVM, que lo corre acá compilado a WebAssembly. Su licencia permite distribuirlo gratis manteniendo su readme intacto.',
    ],
    facts: [
      ['Motor', 'ScummVM 2026.4.0 (GPL-3.0)'],
      ['Datos', 'Freeware de Revolution Software (readme.txt)'],
      ['Tecnología', 'C++ → WebAssembly con Emscripten'],
      ['Guardado', 'En tu navegador (IndexedDB)'],
    ],
  },
  {
    slug: 'flight-of-the-amazon-queen',
    title: 'Flight of the Amazon Queen',
    short: 'Aventura gráfica de 1995: un piloto de alquiler, una estrella de cine y una selva llena de sorpresas.',
    platform: 'dos',
    genre: 'Aventura gráfica',
    year: 1995,
    developer: 'Interactive Binary Illusions',
    publisher: 'Warner Interactive',
    engine: 'scummvm',
    cover: 'games/scummvm/covers/queen.png',
    source: {
      type: 'hosted',
      gameId: 'queen',
      downloadMB: 11,
    },
    hint: [
      [['Clic izq.'], 'moverse, interactuar'],
      [['Clic der.'], 'acción rápida'],
      [['F1'], 'diario'],
    ],
    keyList: [
      ['Clic izq.', 'Moverse o interactuar'],
      ['Clic der.', 'Moverse, saltar o usar la acción por defecto'],
      ['F1 o F5', 'Diario (guardar, cargar, opciones)'],
      ['F11 / F12', 'Guardado / carga rápida'],
      ['Esc', 'Saltar una escena o diálogo'],
      ['Espacio', 'Saltar el texto'],
      ['1 – 4', 'Objetos del inventario'],
      [', / .', 'Mover el inventario'],
      ['Ctrl+F', 'Modo rápido'],
    ],
    description: [
      'Joe King es un piloto de alquiler en los años 40. Lleva a la actriz Faye Russell a una sesión de fotos en el Amazonas, el avión cae en plena selva y de ahí en más todo sale mal: tribus de amazonas, pigmeos de 1,80 m y una empresa de lederhosen con planes sospechosos. Versión de disquete: textos, sin voces.',
      'Sus autores, John Passfield y Steve Stamatiadis, lo liberaron como freeware junto con ScummVM. Su licencia permite distribuirlo gratis manteniendo su readme intacto.',
    ],
    facts: [
      ['Motor', 'ScummVM 2026.4.0 (GPL-3.0)'],
      ['Datos', 'Freeware de John Passfield y Steve Stamatiadis (readme.txt)'],
      ['Tecnología', 'C++ → WebAssembly con Emscripten'],
      ['Guardado', 'En tu navegador (IndexedDB)'],
    ],
  },
  {
    slug: 'lure-of-the-temptress',
    title: 'Lure of the Temptress',
    short: 'Aventura gráfica de 1992, en español: un campesino preso en un pueblo tomado por una hechicera.',
    platform: 'dos',
    genre: 'Aventura gráfica',
    year: 1992,
    developer: 'Revolution Software',
    publisher: 'Virgin Games',
    engine: 'scummvm',
    cover: 'games/scummvm/covers/lure.png',
    source: {
      type: 'hosted',
      gameId: 'lure',
      downloadMB: 6,
    },
    hint: [
      [['Clic izq.'], 'caminar, elegir'],
      [['Clic der.'], 'menú de acciones'],
      [['F5'], 'guardar'],
    ],
    keyList: [
      ['Clic izq.', 'Caminar o elegir'],
      ['Clic der.', 'Menú de acciones sobre lo que señalás'],
      ['F5 / F7', 'Guardar / cargar partida'],
      ['F9', 'Reiniciar el juego'],
      ['Esc', 'Saltar la introducción'],
    ],
    description: [
      'Diermot, un campesino, despierta en un calabozo del pueblo de Turnvale, tomado por la hechicera Selena y su ejército de Skorl. Fue el primer juego de Revolution Software: los personajes del pueblo se mueven y hacen su vida por su cuenta. Esta es la versión en español.',
      'Revolution Software lo liberó como freeware. Su licencia permite distribuirlo gratis manteniendo sus avisos intactos.',
    ],
    facts: [
      ['Idioma', 'Español'],
      ['Motor', 'ScummVM 2026.4.0 (GPL-3.0)'],
      ['Datos', 'Freeware de Revolution Software (LICENSE.txt)'],
      ['Tecnología', 'C++ → WebAssembly con Emscripten'],
      ['Guardado', 'En tu navegador (IndexedDB)'],
    ],
  },
  {
    slug: 'drascula',
    title: 'Drascula: The Vampire Strikes Back',
    short: 'Aventura gráfica española de 1996, con voces en castellano: un inglés, un conde y mucho humor absurdo.',
    platform: 'dos',
    genre: 'Aventura gráfica',
    year: 1996,
    developer: 'Alcachofa Soft',
    publisher: 'Digital Dreams Multimedia',
    engine: 'scummvm',
    cover: 'games/scummvm/covers/drascula.png',
    source: {
      type: 'hosted',
      gameId: 'drascula',
      args: '--language=es',
      downloadMB: 54,
    },
    hint: [
      [['Clic izq.'], 'moverse, interactuar'],
      [['Clic der.'], 'inventario'],
      [['F10'], 'guardar y cargar'],
    ],
    keyList: [
      ['Clic izq.', 'Moverse, interactuar o elegir'],
      ['Clic der.', 'Inventario'],
      ['F1 – F6', 'Mirar, coger, abrir, cerrar, hablar, mover'],
      ['F8', 'Quitar el verbo elegido'],
      ['F9', 'Volumen'],
      ['F10', 'Guardar y cargar partida'],
      ['Espacio', 'Pausar las voces'],
      ['V / T', 'Activar / desactivar subtítulos'],
      ['Esc', 'Saltar una escena o salir'],
    ],
    description: [
      'John Hacker, un agente inmobiliario inglés, viaja a Transilvania para venderle unos terrenos al conde Drascula. Se enamora de Billie Jean, el conde la rapta y empieza una parodia de las películas de vampiros. Es una aventura hecha en España, con voces en castellano.',
      'Alcachofa Soft la liberó como freeware en 2008. Es el juego más pesado del catálogo: la primera vez descarga unos 54 MB, y la música se baja a medida que suena.',
    ],
    facts: [
      ['Idioma', 'Español, con voces'],
      ['Motor', 'ScummVM 2026.4.0 (GPL-3.0)'],
      ['Datos', 'Freeware de Alcachofa Soft (readme.txt)'],
      ['Tecnología', 'C++ → WebAssembly con Emscripten'],
      ['Guardado', 'En tu navegador (IndexedDB)'],
    ],
  },
  {
    slug: 'dreamweb',
    title: 'DreamWeb',
    short: 'Aventura ciberpunk de 1994, vista desde arriba, oscura y para adultos. En inglés.',
    platform: 'dos',
    genre: 'Aventura gráfica',
    year: 1994,
    developer: 'Creative Reality',
    publisher: 'Empire Interactive',
    engine: 'scummvm',
    cover: 'games/scummvm/covers/dreamweb.png',
    source: {
      type: 'hosted',
      gameId: 'dreamweb',
      downloadMB: 13,
    },
    hint: [
      [['Clic izq.'], 'caminar, examinar, usar'],
      [['Ctrl+F5'], 'guardar y cargar'],
    ],
    keyList: [
      ['Clic izq.', 'Caminar, examinar o usar'],
      ['Ctrl+F5', 'Menú de ScummVM (guardar, cargar, salir)'],
    ],
    description: [
      'Ryan trabaja en un bar y tiene sueños que le ordenan matar a siete personas para salvar la DreamWeb, la red que sostiene a la humanidad. Una aventura ciberpunk vista desde arriba, con lluvia, neón y una historia que nunca aclara si Ryan es un elegido o un asesino. Tiene violencia y una escena de sexo: en su época se vendió como juego para adultos.',
      'Sus autores, Neil Dodwell y David Dew (Creative Reality), lo liberaron como freeware en 2012. Esta es la versión de disquete, en inglés.',
    ],
    facts: [
      ['Idioma', 'Inglés'],
      ['Contenido', 'Para adultos: violencia y sexo'],
      ['Motor', 'ScummVM 2026.4.0 (GPL-3.0)'],
      ['Datos', 'Freeware de Creative Reality (license.txt)'],
      ['Tecnología', 'C++ → WebAssembly con Emscripten'],
      ['Guardado', 'En tu navegador (IndexedDB)'],
    ],
  },
  {
    slug: 'tomb-raider',
    title: 'Tomb Raider',
    short: 'La primera aventura de Lara Croft (1996), en 3D. Necesitás tu disco de PlayStation.',
    platform: 'ps1',
    genre: 'Acción y aventura',
    year: 1996,
    developer: 'Core Design',
    publisher: 'Eidos Interactive',
    engine: 'openlara',
    cover: 'games/openlara/tomb-raider-cover.svg',
    source: {
      type: 'byo',
      storageKey: 'tomb-raider-psx',
      accept: '.bin,.img,.iso,.zip',
      dropTitle: 'Arrastrá acá la imagen de tu disco de Tomb Raider',
      dropNote: 'Un archivo .bin, .img o .iso del disco de PlayStation. Puede pesar más de 500 MB: se leen solo los niveles, que son una parte chica.',
      steps: [
        'Hacé una copia de tu disco de Tomb Raider de PlayStation como imagen (.bin, .img o .iso). Si la copia tiene varios archivos .bin, usá el primero, que es el más grande.',
        'Arrastrala al reproductor o tocá "Elegir archivo". Tarda unos segundos en leer el disco.',
        'Listo: los niveles quedan guardados en tu navegador y la próxima vez entrás directo. No se suben a ningún servidor.',
      ],
      why: 'Tomb Raider es un juego comercial: sus niveles, gráficos y sonidos son de sus dueños y no se pueden repartir. Lo que corre acá es OpenLara, un motor libre que reconstruye el del juego y lee los niveles de tu propio disco. Por ahora no usa la música ni los videos del disco.',
    },
    hint: [
      [['←', '↑', '↓', '→'], 'moverse'],
      [['Alt'], 'saltar'],
      [['Ctrl'], 'acción'],
      [['Espacio'], 'armas'],
    ],
    keyList: [
      ['Flechas', 'Correr y girar'],
      ['Alt', 'Saltar'],
      ['Ctrl', 'Acción: agarrarse, disparar, usar'],
      ['Espacio', 'Sacar o guardar las armas'],
      ['Shift', 'Caminar (no se cae de los bordes)'],
      ['A', 'Voltereta'],
      ['C', 'Mirar alrededor'],
      ['Z / X', 'Agacharse / correr rápido'],
      ['Esc', 'Inventario y menú'],
      ['Enter', 'Confirmar'],
    ],
    description: [
      'Lara Croft busca las piezas de un artefacto antiguo, el Scion, por tumbas de Perú, Grecia, Egipto y la Atlántida. Fue uno de los primeros juegos de acción y exploración en 3D, con saltos medidos al milímetro y mucho silencio.',
      'Corre sobre OpenLara, una reconstrucción libre del motor del juego, compilada a WebAssembly. No es un emulador de PlayStation: lee los niveles de tu disco y los dibuja con el navegador.',
    ],
    facts: [
      ['Motor', 'OpenLara (BSD-2-Clause)'],
      ['Datos', 'Los aportás vos (no se suben)'],
      ['Acepta', 'Imagen del disco de PlayStation, o un .zip con su carpeta PSXDATA'],
      ['Tecnología', 'C++ → WebAssembly con Emscripten y WebGL'],
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
