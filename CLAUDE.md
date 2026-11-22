# allgamesports

Catálogo web de juegos que corren en el navegador. Cada juego es código
fuente real compilado a WebAssembly: sin emuladores, sin ROMs, sin
configuración. Publicado en GitHub Pages.

Responder siempre en español. Quien mantiene el proyecto conoce JavaScript,
React, HTML y CSS; C, WebAssembly e ingeniería inversa son temas que está
aprendiendo, así que explicá esos conceptos en lugar de darlos por sabidos.

La historia del proyecto, las decisiones y lo que se probó están en
`docs/CONTEXTO.md`. Leelo antes de tocar el motor o el reproductor.

## Comandos

- `npm install`: dependencias.
- `npm run dev`: servidor de desarrollo (http://localhost:5173).
- `npm run build`: build de producción en `dist/`.
- `npm run build:doom`: recompila el motor de Doom. Requiere Emscripten
  (`emcc` en el PATH) y bash; no hace falta para trabajar en la web, porque
  `doom.js` y `doom.wasm` ya están en el repo.
- `npm run build:tyrian`: recompila el motor de Tyrian (OpenTyrian). Mismos
  requisitos; probado con Emscripten 7.0.0.
- `npm run build:gameboy`: recompila binjgb, el emulador de Game Boy.
- `npm run build:nes`: recompila binjnes, el emulador de NES.
- `npm run build:wolf3d`: recompila Wolf4SDL, el motor de Wolfenstein 3D.
- `npm run build:heretic`: recompila Chocolate Heretic.
- `npm run build:rott`: recompila taradino (Rise of the Triad) con sus datos.
- `wsl bash engines/scummvm/build.sh`: recompila ScummVM. Corre en Linux (en
  Windows, WSL); baja su propio Emscripten. Después,
  `node engines/scummvm/prepare-data.mjs <carpeta>` arma los datos de los
  juegos. Ver `engines/scummvm/README.md`.

- `wsl bash engines/openjazz/build.sh`: recompila OpenJazz (Jazz Jackrabbit).
  En Linux (WSL), con CMake.
- `wsl bash engines/quake/build.sh`: recompila FTEQW y prepara LibreQuake.
  En Linux (WSL).
- `wsl bash engines/rigel/build.sh`: recompila RigelEngine (Duke Nukem II).
  En Linux (WSL), con CMake; baja los datos del shareware.
- `wsl bash engines/supertux/build.sh`: recompila SuperTux (con vcpkg). En
  Linux (WSL). Después, `wsl bash engines/supertux/prepare-data.sh` arma los
  datos comprimidos (necesita vorbis-tools y optipng).
- `wsl bash engines/pingus/build.sh`: recompila Pingus con sus dependencias.
  En Linux (WSL).
- `wsl bash engines/crispy-heretic/build.sh`: recompila Crispy Heretic y arma
  los datos de Blasphemer. En Linux (WSL).
- `wsl bash engines/openttd/build.sh`: recompila OpenTTD. También en Linux
  (WSL); baja su propio Emscripten y los gráficos. Tarda varios minutos.

En Windows, Emscripten está en `C:\tools\emsdk`. Antes de compilar, en Git
Bash: `export EMSDK_PYTHON=<ruta a python.exe>` y `source
/c/tools/emsdk/emsdk_env.sh`. Sin `EMSDK_PYTHON`, emsdk usa `python3`, que en
Windows es el acceso directo de la Microsoft Store y no instala nada.

Los `.sh`, los `.patch` y los `UPSTREAM_*` van siempre con fin de línea LF
(`.gitattributes`). Git para Windows trae `core.autocrlf=true`: sin esa
regla, un clon o un worktree nuevo los saca con CRLF, bash falla en
`set -euo pipefail` y git no encuentra el commit fijado (termina en `\r`).

No hay tests automatizados ni linter. Para verificar un cambio: `npm run
build` y probar a mano en el navegador (catálogo, arrancar un juego, guardar
partida, paneles de controles y ajustes).

## Estructura

```
src/
  site.js              nombre del sitio, link al repo, mail de contacto
  data/games.js        el catálogo: una entrada por juego
  data/platforms.js    plataformas originales (nombre, fabricante, años)
  pages/               Home (catálogo), GamePage (ficha + reproductor), GamepadTest (/mando), NotFound
  components/          Player, Modal, ControlsPanel, KeyList, SettingsPanel, GameCard...
  runtimes/index.js    registro de motores: lo que el reproductor sabe de cada uno
  runtimes/doom/       JS que conecta doom.wasm con canvas, audio y controles
  runtimes/tyrian/     JS que arranca tyrian.wasm (SDL2 resuelve video, audio y teclado)
  runtimes/iframe.js   motores que corren en su propia página (ScummVM, Wolfenstein 3D, OpenTTD, Heretic, Jazz Jackrabbit, Duke Nukem II, Rise of the Triad, LibreQuake, SuperTux, Pingus, Blasphemer)
  runtimes/scummvm/    arma la dirección del iframe de ScummVM
  runtimes/wolf3d/     arma la dirección del iframe de Wolfenstein 3D
  runtimes/openttd/    arma la dirección del iframe de OpenTTD
  runtimes/heretic/    arma la dirección del iframe de Heretic
  runtimes/openjazz/   arma la dirección del iframe de Jazz Jackrabbit
  runtimes/rigel/      arma la dirección del iframe de Duke Nukem II
  runtimes/rott/       arma la dirección del iframe de Rise of the Triad
  runtimes/quake/      arma la dirección del iframe de LibreQuake
  runtimes/supertux/   arma la dirección del iframe de SuperTux
  runtimes/pingus/     arma la dirección del iframe de Pingus
  runtimes/crispy-heretic/  arma la dirección del iframe de Blasphemer
  runtimes/consoleInput.js  teclado y mando para las consolas (Game Boy y NES)
  runtimes/gameboy/    conecta el emulador binjgb con canvas, audio y guardado
  runtimes/nes/        conecta el emulador binjnes con canvas, audio y guardado
  lib/                 localStorage, WAD, zip, descargas, partidas (IDBFS), archivos locales (OPFS), mandos (gamepads.js)
  styles/global.css    todos los estilos y los tokens de diseño
public/games/doom/     motor compilado, datos de Freedoom y portadas
public/games/tyrian/   motor compilado (los datos los aporta el jugador)
public/games/scummvm/  motor compilado, play.html/play.js y data/ con los juegos
engines/doom/          código C del motor y build.sh (ver su README.md)
engines/tyrian/        código C de OpenTyrian y build.sh (ver su README.md)
engines/scummvm/       build.sh, parches y prepare-data.mjs (el código se clona aparte)
engines/gameboy/       build.sh de binjgb (el código se clona aparte, sin parches)
engines/nes/           build.sh de binjnes (el código se clona aparte, sin parches)
engines/wolf3d/        build.sh, parches y puente C++ de Wolf4SDL (el código se clona aparte)
engines/openttd/       build.sh, parches y pre.js de OpenTTD (el código se clona aparte)
engines/heretic/       build.sh, parche y config.h de Chocolate Heretic (el código se clona aparte)
engines/openjazz/      build.sh y parche de OpenJazz (el código se clona aparte)
engines/rigel/         build.sh y parches de RigelEngine (el código se clona aparte)
engines/rott/          build.sh y parche de taradino (el código se clona aparte)
engines/quake/         build.sh y parche de FTEQW (el código se clona aparte)
engines/supertux/      build.sh, prepare-data.sh y parches de SuperTux (el código se baja aparte)
engines/pingus/        build.sh de Pingus y sus dependencias (el código se clona aparte, sin parches)
engines/crispy-heretic/  build.sh, parche y config.h de Crispy Heretic, para Blasphemer (el código se clona aparte)
.github/workflows/     deploy.yml publica en GitHub Pages
```

## Regla del catálogo (no negociable)

- Solo se hospedan datos con licencia libre (`source.type: 'hosted'`).
- **Todo se juega desde el navegador.** Un juego entra al catálogo solo si
  se puede jugar sin tener nada de antemano: o sus datos se hospedan acá, o
  como máximo la ficha enlaza un archivo gratuito y legal que el jugador
  descarga e importa ahí mismo (`source.type: 'byo'` con `download`, como
  Tyrian).
- **Emuladores: solo para juegos caseros.** Las consolas entran con un
  emulador de código abierto compilado a WebAssembly y juegos caseros
  (homebrew) que su autor publica con licencia que permite repartirlos.
  Nunca juegos comerciales. Cada juego lleva su licencia al lado y la ficha
  aclara que es casero.
- No se suman juegos que exijan una copia comprada, un disco físico o una
  ROM propia. Por eso no hay juegos de consola que dependan del disco del
  jugador: si aparece esa limitación, se descarta el juego.
- Nunca agregar al repo ROMs, ISOs, WADs comerciales ni otros datos con
  copyright, tampoco arte de tapa oficial. Las portadas son capturas del
  juego libre o se generan con CSS.

## Cómo funciona el port de Doom

- El motor es doomgeneric (GPL-2.0), copiado en `engines/doom/src/`. Los
  cambios al código original están marcados con `WEB:` o `__EMSCRIPTEN__` y
  listados en `engines/doom/README.md`. Mantener esa tabla al día.
- Archivos propios: `doomgeneric_web.c` (video, teclas, mouse, arranque) e
  `i_websound.c` (efectos de sonido).
- JS llama a funciones exportadas del motor: `dg_start`, `doomgeneric_Tick`
  (una vez por frame, desde `requestAnimationFrame`), `dg_key`, `dg_mouse`.
  El motor llama a JS a través de `Module.dg.*` (ver `runtimes/doom/index.js`).
- En el navegador no se puede bloquear el hilo principal: nada de bucles de
  espera en C; el ritmo lo marca JS.
- Se usa Emscripten 3.1.6. Con esa versión `main` no se puede exportar, por
  eso el punto de entrada es `dg_start`.
- Los WAD se sirven comprimidos con gzip y extensión `.wadgz`. La extensión
  es a propósito: con `.gz` algunos servidores agregan `Content-Encoding` y
  rompen la barra de progreso.
- Las partidas se guardan en IndexedDB (IDBFS montado en `/save`, una carpeta
  por juego).

## Cómo funciona el port de Tyrian

- El motor es OpenTyrian (GPL-2.0), copiado en `engines/tyrian/src/`. Mismas
  reglas que Doom: cambios marcados con `WEB:` y listados en su README.
- Al revés que Doom, el bucle lo maneja C: el juego es una cadena de bucles
  bloqueantes y se compila con Asyncify, que los deja ceder el control al
  navegador. `web.c` cede cada 16 ms y maneja pausa y salida.
- Video, sonido y teclado van por el port de SDL2 de Emscripten. El canvas
  tiene que tener `id="canvas"`, y la configuración de SDL se pasa por
  variables de entorno en `preRun` (después ya no las lee).
- Los datos de Tyrian 2.1 son freeware sin licencia libre: van como `byo` con
  un enlace al zip oficial, que se descomprime en el navegador (`lib/zip.js`).
- Emscripten 7 reserva 64 KB de pila por defecto; `build.sh` la sube a 5 MB
  porque `JE_loadMap` tiene un arreglo local de 64.000 bytes.

## Cómo funciona el port de ScummVM

- ScummVM (GPL-3.0) no se copia al repo: `build.sh` clona la versión de
  `UPSTREAM_TAG` y aplica `patches/`. Compila solo los motores de los juegos
  del catálogo (`--enable-engine=...` en `build.sh`); para sumar un juego,
  sumar su motor ahí y su descarga en `prepare-data.mjs`.
- Corre en un iframe (`public/games/scummvm/play.html`): usa un `Module`
  global y no se puede reiniciar en la misma página. Arrancar es crear el
  iframe; salir, sacarlo. `play.js` avisa al reproductor con `postMessage`.
- Los datos se bajan bajo demanda: ScummVM pide `/data/.../index.json` y cada
  archivo cuando lo abre. `play.js` vuelve relativas esas rutas absolutas y
  descomprime los `.dgz` (gzip). El `index.json` lleva el tamaño sin comprimir.
- Los seis juegos (Beneath a Steel Sky, Flight of the Amazon Queen, Lure of
  the Temptress, Drascula, DreamWeb, Sołtys) son freeware con licencia que
  permite redistribuirlos con sus avisos intactos: se hospedan, con su
  archivo de licencia legible al lado.
- Usa SDL3 (`Module.SDL3.audioContext`) y guarda sus partidas en su propia
  base de IndexedDB (`/home/web_user`).
- Cada tecla le llega 6 veces (oyentes de teclado de SDL3 duplicados, ver
  su README): no listar en las fichas teclas que alternan algo.

## Cómo funciona Game Boy

- El emulador es binjgb (MIT), compilado sin su interfaz: 92 KB. Expone
  funciones simples (avanzar hasta un instante, leer el cuadro y el audio,
  apretar botones) y `runtimes/gameboy/index.js` las conecta con la página.
- Sirve para Game Boy y Game Boy Color (plataformas `gb` y `gbc`).
- Los juegos están en `public/games/gameboy/roms/` con su licencia; la
  tabla con origen y SHA-256 está en `engines/gameboy/README.md`.
- La partida es la memoria del cartucho: se guarda sola en el navegador.

## Cómo funciona la NES

- El emulador es binjnes (MIT), del mismo autor que binjgb y con la misma
  forma de uso. `runtimes/nes/index.js` lo conecta con la página.
- Los controles de consola (teclado y mando) son compartidos con Game Boy:
  `runtimes/consoleInput.js`.
- Los juegos están en `public/games/nes/roms/` con su licencia; la tabla con
  origen y SHA-256 está en `engines/nes/README.md`.
- Tiene dos controles. Jugador 2: Y G H J (cruz), L (A), K (B), O (Start),
  I (Select), las teclas de la demo oficial de binjnes; o el segundo mando.
- La partida es la memoria con pila del cartucho: se guarda sola.

## Cómo funciona Wolfenstein 3D

- El motor es Wolf4SDL (GPL-2.0, variante `-DUSE_GPL`). No se copia al
  repo: `build.sh` clona el commit fijado, aplica `patches/` y suma
  `opl_bridge.cpp`. Los cambios están en la tabla de su README.
- Corre en un iframe (`public/games/wolf3d/play.html`), con SDL2 y Asyncify.
  `play.js` baja los datos, monta las partidas en IndexedDB
  (`/save-wolf3d`) y llama a `main()`.
- Los datos son el shareware 1.4 (primer episodio), sin modificar, con el
  paquete original y su licencia al lado. El permiso para repartirlo gratis
  es implícito: ver `engines/wolf3d/README.md`.

## Cómo funciona OpenTTD

- OpenTTD (GPL-2.0) trae soporte oficial para navegador. `build.sh` clona
  la versión de `UPSTREAM_TAG`, aplica `patches/`, reemplaza su `pre.js` y
  mete los gráficos libres OpenGFX (GPL-2.0) en `openttd.data`.
- Corre en un iframe (`public/games/openttd/play.html`). El bucle lo maneja
  el navegador, sin Asyncify: la pausa usa `Module.pauseMainLoop()`.
- Arranca en español y con la encuesta automática de OpenTTD desactivada
  (`pre.js` escribe la configuración inicial).
- Guarda partidas y ajustes en IndexedDB (`/home/web_user/.openttd`).
- No tiene sonido ni partidas en red.

## Cómo funciona Heretic

- El motor es Chocolate Heretic (GPL-2.0), parte de Chocolate Doom.
  `build.sh` clona la versión de `UPSTREAM_TAG`, aplica `patches/` y compila
  con `emcc` directo (sin CMake; `config.h` está en `engines/heretic/`).
- Corre en un iframe (`public/games/heretic/play.html`), con SDL2 y Asyncify,
  igual que Wolfenstein 3D. Partidas en IndexedDB (`/save-heretic`).
- En el navegador hay un solo hilo: el parche evita una espera al hilo de
  audio que colgaba la página. Ojo con eso en próximos ports.
- Los datos son el shareware 1.2 (primer episodio), sin modificar y servidos
  comprimidos, como exige su licencia, con el paquete original al lado.

## Cómo funciona Jazz Jackrabbit

- El motor es OpenJazz (GPL-2.0), que ya trae soporte para Emscripten.
  `build.sh` (en WSL, con CMake) clona la versión de `UPSTREAM_TAG` y aplica
  un parche que solo cambia cómo se enlaza.
- Corre en un iframe (`public/games/openjazz/play.html#<juego>`), con SDL2 y
  Asyncify. Un mismo motor sirve tres juegos: `jazz`, `xmas94` y `xmas95`.
- Los datos son los paquetes shareware de Epic MegaGames. Su licencia pide
  repartirlos completos y sin tocar: se hospeda el .zip original y `play.js`
  lo descomprime en el navegador. La ficha tiene que decir que es shareware,
  explicar qué es y nombrar a Epic MegaGames; no decir que es software libre.
- OpenJazz no guarda partidas (no lo tiene implementado); sí sus ajustes.

## Cómo funciona Duke Nukem II

- El motor es RigelEngine (GPL-2.0), que trae build para WebAssembly.
  `build.sh` (en WSL, con CMake) clona el commit de `UPSTREAM_COMMIT` con
  sus submódulos y aplica tres parches chicos (tabla en su README).
- Corre en un iframe (`public/games/rigel/play.html`). El bucle lo maneja el
  navegador, como en OpenTTD: la pausa usa `Module.pauseMainLoop()`.
- Los datos del shareware (primer episodio) viajan dentro de
  `RigelEngine.data`, todos y sin modificar; el paquete original de Apogee
  y su licencia están al lado. La ficha tiene que nombrar a Apogee.
- El perfil (ajustes, partidas, puntajes) se guarda en IndexedDB (`/libsdl`).

## Cómo funciona Rise of the Triad

- El motor es taradino (GPL-2.0+), adaptación del código original de Apogee.
  `build.sh` clona la versión de `UPSTREAM_TAG`, aplica `patches/` y compila
  con `emcc` directo; los datos del shareware viajan en `rott.data`.
- Corre en un iframe (`public/games/rott/play.html`), con SDL2 y Asyncify.
  Partidas en IndexedDB (`/libsdl/taradino`, base propia).
- Dos trampas de C viejo en WebAssembly, documentadas en su README: llamadas
  por puntero con tipos distintos (`-sEMULATE_FUNCTION_POINTER_CASTS`) y
  bucles que esperan una tecla sin ceder el control (parche en
  `IN_PumpEvents`).
- No tiene música todavía (MIDI sin sintetizador); sí efectos.

## Cómo funciona LibreQuake

- El motor es FTEQW (GPL-2.0), derivado de Quake, con objetivo oficial para
  navegador. `build.sh` (en WSL) clona el commit de `UPSTREAM_COMMIT`, aplica
  un parche de una línea y corre `make web-rel`.
- Los datos son LibreQuake "lite" (arte BSD-3, código del juego GPL-2.0):
  `pak0` y `pak1` comprimidos como `.pakgz`; `play.js` los descomprime y se
  los pasa al motor en `Module.files`.
- Corre en un iframe (`public/games/quake/play.html`). FTEQW guarda solo sus
  partidas en `localStorage` (claves `fte/`).
- Para simular teclas en pruebas, dispararlas sobre `document`, no sobre el
  canvas (FTEQW escucha en los dos y las recibiría dobles).
- No tiene música todavía (29 MB de OGG aparte).

## Cómo funciona SuperTux

- SuperTux 0.7.0 (GPL-3.0). `build.sh` (en WSL) baja el paquete de fuentes,
  aplica `patches/` y compila con CMake y vcpkg. `prepare-data.sh` arma los
  datos en cuatro paquetes de `file_packager` (`public/games/supertux/data/`).
- Los datos se modificaron para pesar menos (música recomprimida, PNG
  optimizados, sin fuentes ni traducciones que no se usan): la licencia lo
  permite avisándolo, y la ficha y el README lo avisan.
- Corre en un iframe (`public/games/supertux/play.html`). El bucle lo maneja
  el navegador (`pausesMainLoop`). Guardado en IndexedDB
  (`/home/web_user/.local/share/supertux2`, lo monta `play.js`).
- Tres trampas documentadas en su README: la macro `EMSCRIPTEN`, PhysFS sin
  `argv0` y la carpeta de datos fija.
- Baja 170 MB la primera vez: su runtime le da 5 minutos para arrancar
  (`startTimeoutMs` de `iframe.js`).

## Cómo funciona Pingus

- Pingus (GPL-3.0+), rama de desarrollo 0.8.0, que trae build para
  navegador armado con Nix. `build.sh` (en WSL) hace lo mismo sin Nix:
  compila SDL2, SDL2_image, zlib y libmodplug, y después el juego con sus
  datos en `pingus.data`. Sin parches.
- Corre en un iframe (`public/games/pingus/play.html`). El bucle lo maneja el
  navegador (`pausesMainLoop`; `play.js` conecta `Module.pauseMainLoop`).
  Progreso en IndexedDB (`/pingus-user`, lo monta `play.js`).
- Dibuja en 4:3: la página escala el canvas sin `object-fit`, para que SDL
  ubique bien el mouse.
- `build.sh` compila todo con `-ffile-prefix-map` y falla si queda una ruta
  de la máquina en el `.wasm` (los `assert` de C la guardan).

## Cómo funciona Blasphemer

- Blasphemer 0.1.8 (BSD-3) reemplaza los datos de Heretic, como Freedoom los
  de DOOM. Corre sobre Crispy Heretic (GPL-2.0, de Crispy Doom), no sobre
  Chocolate Heretic: sus mapas superan los límites de 1994 (con Chocolate,
  E1M2 cortaba con "no more visplanes"). El Heretic shareware sigue en
  Chocolate.
- `build.sh` (en WSL) clona el tag de `UPSTREAM_TAG`, verifica su commit,
  aplica el mismo parche de OPL que Heretic y compila con `emcc` directo.
  También baja Blasphemer y sus licencias con SHA-256 verificado.
- Corre en un iframe (`public/games/crispy-heretic/play.html`), con SDL2 y
  Asyncify. Partidas en IndexedDB (`/save-blasphemer`).
- No mover la caché de Emscripten (`EM_CACHE`): los ports (SDL2...) dejan la
  ruta de la máquina en el `.wasm` si la caché está fuera de su carpeta. Ver
  su README.

## Agregar un juego

Todo juego lleva: plataforma (clave de `platforms.js`), año, estudio, quién
lo publicó y una portada de 320x200 (captura del juego; para ScummVM, con
`play.html?captura`). Si la plataforma es nueva, agregarla a `platforms.js`:
el catálogo arma una sección por plataforma.

Los textos para el visitante van en lenguaje llano: nada de "WAD" o "ROM" sin
explicar. Los juegos con archivo propio traen `source.steps` (pasos) y
`source.why` (por qué hace falta el archivo).

1. Entrada nueva en `src/data/games.js`.
2. Si usa el motor de Doom, alcanza con apuntar `source` a otro WAD libre.
3. Motor nuevo: código y script en `engines/<motor>/`, salida compilada en
   `public/games/<motor>/`, el código que lo conecta con la página en
   `src/runtimes/<motor>/` y una entrada en `src/runtimes/index.js` (ajustes,
   controles, cómo validar el archivo del jugador y cómo arrancar).
4. Antes de recomendar un juego, verificar la licencia de los datos, no solo
   la del motor. Criterio acordado: solo permiso explícito para repartirlo
   gratis (ver `docs/CONTEXTO.md`, sección 25). Si es implícito o no hay,
   se descarta.
5. Antes de publicar, buscar rutas de la máquina en todo lo compilado:
   `rg -a -l '/home/<usuario>|Users/<usuario>' public/games`. Tres causas
   conocidas (sección 32 de `docs/CONTEXTO.md`): compilar sin
   `-ffile-prefix-map`, mover la caché de Emscripten (`EM_CACHE`) y pasarle
   rutas absolutas a `--preload-file`/`file_packager`.

## Convenciones

- JavaScript (no TypeScript), React con componentes de función.
- CSS plano en `styles/global.css`, usando los tokens de `:root`. Sin
  frameworks de CSS.
- Textos de la interfaz y comentarios en español rioplatense (voseo).
- Fuentes autohospedadas con `@fontsource`: Jersey 15 (títulos), IBM Plex
  Sans (texto), IBM Plex Mono (etiquetas).
- Rutas a archivos de `public/`: siempre con `import.meta.env.BASE_URL`
  adelante, porque en GitHub Pages el sitio vive en `/allgamesports/`.

## Publicación

Cada push a `main` dispara `deploy.yml` y publica en
https://vazquez-ernesto.github.io/allgamesports/. Antes de subir, correr
`npm run build`.

## Pendientes

- Música de Doom (formato MUS; hace falta un sintetizador OPL o MIDI).
- Controles táctiles para celular.
- Reasignar botones del mando (hoy el mapeo es fijo).
- Chat y juego online: necesitan backend (candidato: Java con Spring Boot).
- Falta probar con hardware real: sonido, mouse, mando y la carga de un WAD
  original.
- Tyrian: falta escuchar el sonido y probar mando, Firefox y Safari.
- El encabezado desborda en ancho de celular (440 px en 375).
- ScummVM: las versiones de CD con voces de BASS, FOTAQ y DreamWeb.
- ScummVM: cada tecla llega 6 veces (nombres de partida con letras
  repetidas; por eso 1 a 8 de Sołtys no están en su ficha). Ver
  `engines/scummvm/README.md`.
- Agrupar el catálogo por plataforma (el campo `platform` ya existe).

## Ingeniería inversa con REA

REA (`npx rea-agents setup`, más Ghidra) es la vía de aprendizaje de
ingeniería inversa; no hace falta para sumar juegos de código abierto.
Orden acordado: primero analizar nuestro propio `public/games/doom/doom.wasm`
(se puede comparar el resultado con el código fuente), después un juego
chico de PC propio. Lo que salga de analizar software comercial sigue la
regla del catálogo: se publica el código propio, nunca los datos del juego.

El primer ejercicio ya está hecho (ver `docs/CONTEXTO.md`, sección 10).
Ghidra no lee WebAssembly: para un `.wasm`, REA usa WABT
(`rea inspect-wasm-artifact`). Ghidra sí sirve para 6502, Z80, 68000, MIPS,
ARM, SuperH y ejecutables de DOS.
