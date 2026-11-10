# allgamesports

Catálogo web de juegos que corren en el navegador. Cada juego es código
fuente real compilado a WebAssembly: sin emuladores, sin ROMs, sin
configuración. Publicado en GitHub Pages.

Responder siempre en español. Quien mantiene el proyecto conoce JavaScript,
React, HTML y CSS; C, WebAssembly e ingeniería inversa son temas que está
aprendiendo, así que explicá esos conceptos en lugar de darlos por sabidos.

## Comandos

- `npm install`: dependencias.
- `npm run dev`: servidor de desarrollo (http://localhost:5173).
- `npm run build`: build de producción en `dist/`.
- `npm run build:doom`: recompila el motor de Doom. Requiere Emscripten
  (`emcc` en el PATH) y bash; no hace falta para trabajar en la web, porque
  `doom.js` y `doom.wasm` ya están en el repo.

No hay tests automatizados ni linter. Para verificar un cambio: `npm run
build` y probar a mano en el navegador (catálogo, arrancar un juego, guardar
partida, paneles de controles y ajustes).

## Estructura

```
src/
  site.js              nombre del sitio, link al repo, mail de contacto
  data/games.js        el catálogo: una entrada por juego
  pages/               Home (catálogo), GamePage (ficha + reproductor), NotFound
  components/          Player, Modal, ControlsPanel, SettingsPanel, GameCard...
  runtimes/doom/       JS que conecta el .wasm con canvas, audio y controles
  lib/                 localStorage, lectura de WAD, archivos locales (OPFS)
  styles/global.css    todos los estilos y los tokens de diseño
public/games/doom/     motor compilado, datos de Freedoom y portadas
engines/doom/          código C del motor y build.sh (ver su README.md)
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

## Agregar un juego

1. Entrada nueva en `src/data/games.js`.
2. Si usa el motor de Doom, alcanza con apuntar `source` a otro WAD libre.
3. Motor nuevo: código y script en `engines/<motor>/`, salida compilada en
   `public/games/<motor>/`, y el código que lo conecta con la página en
   `src/runtimes/<motor>/`. Hoy `Player.jsx` solo conoce el runtime de Doom;
   el segundo motor es el momento de generalizarlo.

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

## Ingeniería inversa con REA

REA (`npx rea-agents setup`, más Ghidra) es la vía de aprendizaje de
ingeniería inversa; no hace falta para sumar juegos de código abierto.
Orden acordado: primero analizar nuestro propio `public/games/doom/doom.wasm`
(se puede comparar el resultado con el código fuente), después un juego
chico de PC propio. Lo que salga de analizar software comercial sigue la
regla del catálogo: se publica el código propio, nunca los datos del juego.
