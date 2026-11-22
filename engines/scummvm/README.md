# Motor ScummVM para navegador

[ScummVM](https://github.com/scummvm/scummvm) (versión en `UPSTREAM_TAG`)
compilado a WebAssembly con su propio target de Emscripten, solo con los
motores de los juegos del catálogo: `sky` (Beneath a Steel Sky), `queen`
(Flight of the Amazon Queen), `lure` (Lure of the Temptress), `drascula`
(Drascula), `dreamweb` (DreamWeb), `cge` (Sołtys), `cge2` (Sfinx) y
`parallaction` (Nippon Safes). Lleva además el decodificador de MP3
(`--enable-mad`) para la música de Drascula.

Licencia: **GPL-3.0** (ver `LICENSE-scummvm`). Cualquier cambio a este código
tiene que publicarse bajo la misma licencia.

## Por qué es distinto de Doom y Tyrian

- **El código no está en el repo.** ScummVM pesa cientos de MB. `build.sh`
  clona la versión fijada en una carpeta de trabajo y le aplica los parches
  de `patches/`. Lo que este repo agrega al original está todo ahí.
- **Corre en un iframe.** ScummVM usa un `Module` global y no se puede
  reiniciar dentro de la misma página. El reproductor carga
  `public/games/scummvm/play.html` en un iframe: arrancar es crearlo, salir
  es sacarlo.
- **Los datos se bajan bajo demanda.** ScummVM monta `/data` como un sistema
  de archivos HTTP: pide un `index.json` por carpeta y baja cada archivo
  recién cuando el juego lo abre.

## Compilar

Corre en Linux; en Windows, dentro de WSL. Requiere git, make, wget, python3,
pkg-config y zip. El script oficial de ScummVM descarga Emscripten 4.0.10.

```bash
wsl bash engines/scummvm/build.sh
node engines/scummvm/prepare-data.mjs <carpeta data/ que imprime build.sh>
```

`build.sh` deja `scummvm.js` y `scummvm.wasm` en `public/games/scummvm/`.
`prepare-data.mjs` baja los juegos de downloads.scummvm.org (verifica su
SHA-256) y arma `public/games/scummvm/data/`.

## Archivos propios

| Archivo | Qué hace |
|---|---|
| `public/games/scummvm/play.html` | Página mínima que carga ScummVM en el iframe |
| `public/games/scummvm/play.js` | Avisa al reproductor (listo, error, salida) e intercepta `fetch` para los datos |
| `public/games/scummvm/scummvm.ini` | Configuración inicial (tema y subtítulos) |
| `prepare-data.mjs` | Baja los juegos, los comprime y genera los `index.json` |
| `src/runtimes/scummvm/index.js` | Crea el iframe y traduce sus avisos para el reproductor |

## Parches al original

| Parche | Cambio | Por qué |
|---|---|---|
| `0001-avisar-salida.patch` | `main()` llama a `Module.onScummvmExit` antes de devolver | Con Asyncify el runtime queda vivo y Emscripten no llama a `Module.onExit`: sin esto, el reproductor no se entera de que el jugador salió |
| `0002-salir-al-terminar.patch` | La plataforma Emscripten deja de declarar `kFeatureNoQuit` | Con ese flag, al terminar un juego ScummVM vuelve a su lanzador y `main()` nunca termina. Todos sus usos son del lanzador, que acá no se muestra |
| `patches-sdl3/0001-baja-de-oyentes-de-teclado.patch` (SDL 3.2.4, `SDL_emscriptenevents.c`) | La baja de los oyentes de teclado usa el mismo criterio que el registro | Ver abajo: sin esto cada tecla llegaba 6 veces |

### El parche de SDL3

SDL3 no viene de ScummVM: es un port de Emscripten, que se baja y se compila
en la caché del Emscripten que instala el script de ScummVM. `build.sh` corre
solo el paso `setup`, aplica `patches-sdl3/` sobre el código del port en esa
caché (si todavía no está aplicado) y lo recompila con
`embuilder build sdl3 --force`.

El bug: para escuchar el teclado, SDL usa como destino
`EMSCRIPTEN_EVENT_TARGET_WINDOW`, que no es un texto sino el número 2
disfrazado de puntero (`(const char*)2`). Al dar de baja hacía `if
(*target)`, o sea, leía el byte en la dirección 2 de la memoria. En
WebAssembly esa zona está en cero, así que nunca daba de baja nada. Cada vez
que ScummVM recrea su ventana (del lanzador al juego, al cambiar el modo de
video) se sumaba otro juego de oyentes: al jugar había 6 y cada tecla llegaba
6 veces (nombres de partida con letras repetidas, teclas que alternan algo
que volvían al estado inicial). Con el parche queda uno solo
(`JSEvents.eventHandlers` en el iframe).

## Detalles que importan

- **Rutas absolutas.** ScummVM pide sus datos como `/data/...`, pensando en un
  sitio en la raíz del dominio. En GitHub Pages el sitio vive en
  `/allgamesports/`, así que `play.js` las convierte en rutas relativas a
  `play.html`.
- **Datos comprimidos.** GitHub Pages no comprime archivos binarios. Los datos
  se guardan con gzip y extensión `.dgz` (no `.gz`: algunos servidores le
  agregan `Content-Encoding` y el navegador los descomprimiría dos veces), y
  `play.js` los descomprime. El `index.json` lleva el tamaño sin comprimir,
  porque ScummVM lo compara con lo que recibe. `queen.1` baja de 22,7 MB a
  7,2 MB.
- **Qué archivos de cada zip se usan.** Se dejan afuera manuales y
  ejecutables de DOS, con una excepción: ScummVM reconoce la versión de
  DreamWeb por su `DREAMWEB.EXE`; sin él dice "Game data not found".
- **Música de Drascula.** Viene en un paquete aparte (pistas MP3). Sin ellas
  ScummVM muestra un aviso en cada arranque. Se bajan de a una, cuando suenan.
- **Idioma.** Drascula trae varios idiomas en la misma carpeta; la ficha
  pasa `--language=es` (`source.args` en `games.js`). Sołtys no lo necesita:
  el zip español trae un solo idioma y ScummVM lo reconoce por el tamaño y
  el MD5 de `vol.dat` (entrada `ES_ESP` de `engines/cge/detection.cpp`).
- **Sołtys no deja guardar en cualquier momento.** F5 solo abre el diálogo
  si no hay ninguna acción en curso: con un globo de diálogo en pantalla
  (se cierra con un clic) no pasa nada. Es el comportamiento original
  (`canSaveGameStateCurrently` en `engines/cge/cge.cpp`).
- **Nippon Safes pide un código al empezar.** Es la forma de elegir personaje
  y venía en el manual: seis fichas de katakana. Los códigos de la versión de
  PC están en `_pcKeys` de `engines/parallaction/gui_ns.cpp` y la ficha los
  muestra. Sus escenarios son más angostos que la pantalla: por eso la
  portada es la elección de idioma.
- **Portadas.** `play.html?captura#...` conserva la imagen del canvas (WebGL
  la borra después de mostrarla) para poder copiarla y sacar una portada.
- **`scummvm.ini`.** Al arrancar, ScummVM pide su configuración. Sin el
  archivo, el servidor de desarrollo de Vite devolvía el `index.html` del
  sitio y ScummVM lo guardaba como configuración rota.
- **SDL3.** Esta versión de ScummVM usa SDL3: el audio está en
  `Module.SDL3.audioContext` (lo usa la pausa del reproductor).
- **Partidas.** ScummVM las guarda solo en IndexedDB, en su propia base
  (`/home/web_user`), separada de la de Doom y Tyrian.

## Pendiente

- Versiones de CD, con voces: pesan entre 60 y 107 MB.
- Más juegos freeware de ScummVM: cada uno suma su motor a
  `--enable-engine` y su entrada en `prepare-data.mjs`, después de verificar
  su licencia.
