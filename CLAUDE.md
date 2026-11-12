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
- `npm run build:openlara`: recompila OpenLara (Tomb Raider) con Emscripten 7.
- `wsl bash engines/scummvm/build.sh`: recompila ScummVM. Corre en Linux (en
  Windows, WSL); baja su propio Emscripten. Después,
  `node engines/scummvm/prepare-data.mjs <carpeta>` arma los datos de los
  juegos. Ver `engines/scummvm/README.md`.

En Windows, Emscripten está en `C:\tools\emsdk`. Antes de compilar, en Git
Bash: `export EMSDK_PYTHON=<ruta a python.exe>` y `source
/c/tools/emsdk/emsdk_env.sh`. Sin `EMSDK_PYTHON`, emsdk usa `python3`, que en
Windows es el acceso directo de la Microsoft Store y no instala nada.

No hay tests automatizados ni linter. Para verificar un cambio: `npm run
build` y probar a mano en el navegador (catálogo, arrancar un juego, guardar
partida, paneles de controles y ajustes).

## Estructura

```
src/
  site.js              nombre del sitio, link al repo, mail de contacto
  data/games.js        el catálogo: una entrada por juego
  data/platforms.js    plataformas originales (nombre, fabricante, años)
  pages/               Home (catálogo), GamePage (ficha + reproductor), NotFound
  components/          Player, Modal, ControlsPanel, KeyList, SettingsPanel, GameCard...
  runtimes/index.js    registro de motores: lo que el reproductor sabe de cada uno
  runtimes/doom/       JS que conecta doom.wasm con canvas, audio y controles
  runtimes/tyrian/     JS que arranca tyrian.wasm (SDL2 resuelve video, audio y teclado)
  runtimes/scummvm/    crea el iframe con ScummVM y traduce sus avisos
  runtimes/openlara/   lee el disco del jugador y arranca OpenLara en un iframe
  lib/                 localStorage, WAD, zip, descargas, partidas (IDBFS), archivos locales (OPFS)
  styles/global.css    todos los estilos y los tokens de diseño
public/games/doom/     motor compilado, datos de Freedoom y portadas
public/games/tyrian/   motor compilado (los datos los aporta el jugador)
public/games/scummvm/  motor compilado, play.html/play.js y data/ con los juegos
engines/doom/          código C del motor y build.sh (ver su README.md)
engines/tyrian/        código C de OpenTyrian y build.sh (ver su README.md)
engines/scummvm/       build.sh, parches y prepare-data.mjs (el código se clona aparte)
engines/openlara/      build.sh de OpenLara (el código se clona aparte, sin parches)
.github/workflows/     deploy.yml publica en GitHub Pages
```

## Regla del catálogo (no negociable)

- Solo se hospedan datos con licencia libre (`source.type: 'hosted'`).
- Los juegos comerciales van como `source.type: 'byo'`: el jugador aporta su
  copia y el archivo queda en su navegador, nunca se sube.
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
- Los cinco juegos (Beneath a Steel Sky, Flight of the Amazon Queen, Lure of
  the Temptress, Drascula, DreamWeb) son freeware con licencia que permite
  redistribuirlos con sus avisos intactos: se hospedan, con su archivo de
  licencia legible al lado.
- Usa SDL3 (`Module.SDL3.audioContext`) y guarda sus partidas en su propia
  base de IndexedDB (`/home/web_user`).

## Cómo funciona el port de Tomb Raider (PlayStation)

- El motor es OpenLara (BSD-2), una reconstrucción del motor de Tomb Raider:
  no es un emulador. Corre en un iframe, como ScummVM (`lib/engineFrame.js`
  es el código que comparten).
- El jugador carga la imagen de su disco. `lib/iso9660.js` saca solo los
  niveles (`PSXDATA`) y las pantallas de carga (`DELDATA`) sin cargar la
  imagen en memoria; se guardan en un zip en el navegador.
- El motor exige `runtime.importFile` en vez de `identifyFile`: es el camino
  para archivos enormes.
- No usa la música ni los videos del disco todavía.
- Para consolas vale la misma regla: nada de emuladores ni ROMs hospedadas.
  Solo motores reconstruidos de código abierto, con los datos del jugador.

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
   la del motor.

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
- Tomb Raider: probar con un disco real; música y videos del disco.
- ScummVM: las versiones de CD con voces de BASS, FOTAQ y DreamWeb.
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
