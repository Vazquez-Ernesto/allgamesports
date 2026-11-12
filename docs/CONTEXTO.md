# Contexto del proyecto: qué se hizo, cómo y por qué

Este documento cuenta la historia de la primera sesión de trabajo: las
decisiones, los problemas que aparecieron y cómo se resolvieron, qué se probó
y qué no. `CLAUDE.md` tiene las reglas y la estructura; acá está el porqué.

## 1. De dónde salió la idea

El objetivo original era un sitio tipo catálogo de juegos de consola
porteados que corren en el navegador, sin emuladores ni ROMs, usando
ingeniería inversa con la herramienta REA (`morluto/rea`).

Lo que se investigó antes de escribir código:

- **REA no portea juegos.** Es un CLI y servidor MCP que conecta agentes de
  IA con Ghidra, IDA, JADX y otras herramientas de análisis. Su caso de
  muestra con juegos (DX-Ball) reconstruyó 270 funciones en C idénticas al
  original, pero el resultado es un ejecutable nativo de Windows, no web.
- **Hay cuatro caminos para llevar un juego al navegador**, de menor a mayor
  esfuerzo por juego:
  1. Emulador compilado a WASM con el juego precargado (lo que usan casi
     todos los catálogos grandes).
  2. Motor de código abierto compilado a WASM (lo que hicimos con Doom).
  3. Recompilación estática: el código máquina de la consola se traduce a
     C y luego a WASM, más un runtime que imita la consola (N64Recomp,
     ps2-web-recomp).
  4. Decompilación: reconstruir el código fuente a mano (años de trabajo).
- **Límite legal.** Los proyectos serios no incluyen datos del juego: cada
  jugador aporta su copia. De ahí sale la regla del catálogo: se hospeda solo
  lo que tiene licencia libre; lo comercial se juega con el archivo propio.

Consecuencia práctica: un catálogo grande y rápido sale de motores libres
(camino 2). REA queda como vía de aprendizaje de ingeniería inversa, no como
requisito para sumar juegos.

## 2. Por qué Doom y por qué Freedoom

Doom fue el primer port porque id Software liberó el código en 1997 y existe
`doomgeneric`, una versión que reduce todo lo que el juego le pide al sistema
a seis funciones. Portarlo es escribir esas seis funciones.

El motor es libre (GPL-2.0), pero los niveles originales no. Por eso:

- Lo hospedado es **Freedoom 0.13** (BSD-3): Phase 1 y Phase 2.
- El Doom original se juega con la entrada "DOOM: tu propio WAD", que acepta
  el archivo del jugador y lo guarda en su navegador (OPFS).

## 3. Cómo se construyó el motor

Entorno de la sesión: Ubuntu 24.04, Emscripten 3.1.6 instalado con `apt`,
Node 22. El código de doomgeneric se copió del commit que figura en
`engines/doom/UPSTREAM_COMMIT`, y se borraron las capas de otras plataformas
(SDL, Windows, X11, Allegro).

### Decisiones

| Decisión | Motivo |
|---|---|
| No usar SDL; capa propia en `doomgeneric_web.c` | El port de SDL para Emscripten se descarga al compilar y la red de la sesión no lo permitía. Además la capa propia es más chica y más fácil de entender |
| El bucle del juego lo maneja JS con `requestAnimationFrame` | Da control para pausar, detectar errores y cortar al salir. C solo expone `doomgeneric_Tick()` |
| Dibujar a 320x200 y escalar con CSS | Es la resolución nativa de Doom; `image-rendering: pixelated` hace el resto sin gastar CPU |
| JS traduce las teclas físicas a teclas de Doom | Permite reasignar controles y sumar mando sin tocar C |
| Disparo en Espacio y clic, no en Ctrl | Ctrl+W cierra la pestaña y W es avanzar; el navegador no deja bloquear ese atajo |
| El mouse se acumula y se publica una vez por tic | Doom pisa el movimiento si recibe varios eventos de mouse en el mismo tic (35 por segundo) y los frames son 60 o más |
| Junto con cada tecla viaja el carácter tipeado | Así los trucos (`iddqd`) y los nombres de partida funcionan aunque D esté asignada a moverse |
| Sonido: C entrega PCM de 8 bits y JS lo reproduce con Web Audio | Evita compilar un mezclador; cada efecto se convierte una sola vez a `AudioBuffer` |
| Música: módulo vacío | Los temas están en formato MUS y necesitan un sintetizador. Quedó pendiente |
| Límites del renderer ampliados y `-mb 64` | Freedoom exige un motor "limit-removing"; con los límites de 1993 algunos mapas fallarían |
| Partidas en IndexedDB (IDBFS en `/save/<juego>`) | Persisten entre visitas; se sincronizan cada 4 segundos y al ocultar la pestaña |

### Problemas que aparecieron

- **`main` no se podía exportar.** Con Emscripten 3.1.6 el enlazador
  rechazaba `_main`. Solución: `main()` vacío y un punto de entrada propio,
  `dg_start(cmdline)`, que recibe la línea de comandos como texto.
- **El "derretido" entre pantallas congelaba la página.** El original lo
  anima con un bucle bloqueante y el navegador solo pinta cuando el código
  devuelve el control. Se cambió para que avance un paso por frame
  (`d_main.c`).
- **`I_Quit` no cerraba nada.** En doomgeneric esa función vuelve sin salir.
  Se agregó un aviso a JS para mostrar la pantalla "Saliste del juego".
- **La barra de descarga pasaba del 100%.** El servidor de desarrollo de Vite
  sirve los `.gz` con `Content-Encoding: gzip`, el navegador los descomprime
  solo y el tamaño anunciado deja de coincidir. Solución: extensión `.wadgz`
  y detección de gzip por los dos primeros bytes (`1f 8b`).

Todos los cambios al código original están listados en
`engines/doom/README.md`.

### De dónde salieron los archivos binarios

- `doom.js` y `doom.wasm`: salida de `engines/doom/build.sh`.
- `freedoom1.wadgz` y `freedoom2.wadgz`: los WAD del paquete `freedoom`
  0.13.0 de Ubuntu, comprimidos con `gzip -9` (28 MB cada uno sin comprimir,
  unos 10 MB comprimidos).
- Las portadas: captura del canvas del juego (`canvas.toDataURL`) en la
  pantalla de título, a 320x200.

## 4. Cómo se construyó la web

Stack: React 19, Vite 8, React Router 7, JavaScript sin TypeScript, CSS plano.

- **Catálogo (`Home.jsx`)**: buscador que ignora acentos, filtros generados a
  partir de los datos, atajo `/` para enfocar la búsqueda.
- **Reproductor (`Player.jsx`)**: es una máquina de estados con cinco fases:
  `idle`, `loading`, `running`, `ended`, `error`. Cada arranque lleva un
  número (`runRef`) para descartar arranques viejos si el usuario sale o
  reinicia mientras descarga.
- **Paneles**: con uno abierto el juego se pausa. El modal se monta dentro
  del elemento en pantalla completa cuando lo hay; si no, quedaría tapado.
- **Controles**: el teclado se reasigna (hasta dos teclas por acción, una
  tecla no puede estar en dos acciones). El mando tiene mapeo fijo.
- **Pantalla completa**: se pide el bloqueo de teclado para que Esc abra el
  menú de Doom en vez de salir (solo Chrome y Edge lo soportan).
- **Rutas en GitHub Pages**: el sitio vive en una subcarpeta, así que Vite
  recibe `BASE_PATH` del workflow y React Router usa ese prefijo. Un plugin
  en `vite.config.js` copia `index.html` a `404.html` para que entrar directo
  a `/juego/...` no dé 404.

Decisiones de diseño: tema oscuro con acento verde lima, tipografía de
píxeles para títulos, tarjetas apaisadas con captura del juego en lugar de
tapas (las tapas oficiales tienen copyright). La primera tipografía de
títulos (Pixelify Sans) se descartó porque la C se leía como O.

## 5. Qué se probó

Con un navegador automatizado (Chromium y Playwright), contra el servidor de
desarrollo y contra el build de producción servido en una subruta:

- El catálogo carga y no hay errores en consola.
- Los dos Freedoom arrancan, se puede entrar a una partida, caminar y
  disparar.
- Los 68 mapas (36 de Phase 1, 32 de Phase 2) cargan sin errores del motor.
  Cada prueba duró unos 5 segundos: un giro completo y caminar disparando.
- Guardar partida, recargar la página y verla en el menú de carga.
- Escribir el nombre de la partida con teclas reasignadas, y el truco `iddqd`.
- En ancho de celular no hay desborde horizontal.

Los scripts de esas pruebas no quedaron en el repo.

## 6. Qué no se probó

- El sonido no se escuchó: solo se verificó que corre sin errores.
- El mouse y un mando real.
- La carga de un WAD original.
- Firefox y Safari.
- Partidas largas: los mapas se probaron solo unos segundos cada uno.

El dueño del proyecto confirmó después que el sitio publicado funciona y que
Doom anda en su navegador.

## 7. Publicación

El primer push falló en el workflow porque GitHub Pages no estaba activado.
Se resolvió eligiendo "GitHub Actions" en Settings → Pages → Source. Desde
entonces cada push a `main` publica.

## 8. Trabajar en Windows

- Para la web alcanza con Node: `npm install` y `npm run dev`.
- Recompilar el motor necesita Emscripten (se instala con `emsdk`) y bash
  (Git Bash o WSL). Con una versión nueva de Emscripten puede cambiar algún
  flag de `build.sh`; el script se probó solo con la 3.1.6.
- Si se actualiza Freedoom, hay que volver a comprimir los WAD con gzip y
  renombrarlos a `.wadgz`.

## 9. Próximos pasos, con pistas

- **Música.** La vía más fiel es llevar `i_oplmusic.c` y el emulador OPL de
  Chocolate Doom (GPL, compatible), generar el audio en C y sacarlo por un
  `AudioWorklet`. El WAD ya trae el lump `GENMIDI` con los instrumentos.
- **Controles táctiles.** Botones en pantalla que llamen a `dg_key`, igual
  que el teclado.
- **Segundo motor.** Es el momento de sacar de `Player.jsx` lo específico de
  Doom y definir una interfaz común de runtime (arrancar, pausar, destruir).
- **Online y chat.** Necesitan backend; el candidato es Java con Spring Boot.
- **Ingeniería inversa.** Primer ejercicio: analizar `doom.wasm` con REA y
  comparar contra el código fuente. La instalación de REA y Ghidra en Windows
  todavía no se probó.

## 10. Segunda sesión: REA y el segundo motor (Tyrian)

### REA y Ghidra en Windows

Se instalaron REA 6.7.0 (npm), Ghidra 12.1.4 y WABT 1.0.42 en `C:\tools`.
Lo que se aprendió:

- **Ghidra no lee WebAssembly**: no trae ese procesador. REA rechaza el
  `.wasm` por la vía nativa y lo manda a `inspect-wasm-artifact`, que usa
  WABT. Ghidra sí sirve para lo retro nativo: 6502, Z80, 68000, MIPS, ARM,
  SuperH y ejecutables de DOS.
- **`doom.wasm` contra el fuente**: 471 funciones en el binario contra unas
  890 en el C. La diferencia es el `-O2`: borra lo que no se usa y copia las
  funciones chicas adentro de quien las llama. `dg_start` pesa 17 KB porque
  tiene adentro todo `D_DoomMain`. Los nombres se recuperan por los mensajes
  de error (`R_InitTextures: ...`) que quedan en los datos.

### Por qué Tyrian y por qué "archivo propio"

Se eligió por género (shoot 'em up) y porque OpenTyrian es chico y usa SDL2.
Los datos de Tyrian 2.1 son gratis desde 2004, pero el permiso del autor es
informal ("jugalo y compartilo con amigos") y el zip todavía trae la licencia
comercial de 1995. Fedora tiene abierta una revisión legal sin resolver. Por
la regla de este proyecto, se juega con el archivo propio: la ficha enlaza el
zip oficial y el jugador lo carga.

### Asyncify en vez de reescribir los bucles

Doom deja que JS llame un tic por frame. OpenTyrian no: cada menú es un bucle
que nunca devuelve el control. Asyncify permite pausar una función C en medio
del bucle y retomarla después, así el navegador puede pintar. Costo: el
`.wasm` pesa 1,5 MB contra los 385 KB de Doom.

### Problemas que aparecieron

- **emsdk no instalaba nada**: busca `python3`, que en Windows es el acceso
  directo de la Microsoft Store. Se resuelve con `EMSDK_PYTHON`.
- **Imagen recortada**: el port de SDL2 busca el canvas con `#canvas`, y las
  versiones nuevas de Emscripten ya no traducen ese nombre al canvas del
  módulo. Se le puso `id="canvas"` al canvas del reproductor.
- **Variables de entorno ignoradas**: la libc las copia al inicializarse. Se
  pasan en `preRun`; antes se ponían después y SDL usaba WebGL en vez de 2D, y
  las partidas iban a una carpeta que no persistía.
- **Pantalla negra al entrar a un nivel**: era un crash. Emscripten 7 reserva
  64 KB de pila y `JE_loadMap` declara un arreglo local de 64.000 bytes. Se
  encontró compilando con nombres de funciones (`--profiling-funcs`) y
  traduciendo el stack con `wasm-objdump`. Se subió la pila a 5 MB.
- **Errores mudos**: un crash dentro de Asyncify no pasa por `onAbort`. El
  runtime escucha `unhandledrejection` y el reproductor muestra el error.

### Qué se probó

En el servidor de desarrollo, con navegador automatizado: cargar el zip,
jugar el primer nivel, pausar con un panel abierto, salir desde el menú del
juego y volver a jugar, reiniciar, y que las partidas de Tyrian y de Freedoom
convivan en IndexedDB. Doom se volvió a probar después de generalizar el
reproductor.

No se probó: escuchar el sonido, mando, Firefox y Safari, ni partidas largas.

### Próximos pasos

- El encabezado desborda en ancho de celular (440 px en 375). Venía de
  antes de esta sesión.
- Agrupar el catálogo por plataforma ("por consola"): el campo `platform` ya
  existe.
- Más ports con licencias verificadas: ScummVM con sus aventuras freeware, o
  reimplementaciones de consola con archivo propio (zelda3 para SNES).
## 11. Tercer motor: ScummVM y dos aventuras gráficas

### Por qué estos juegos

Beneath a Steel Sky (Revolution, 1994) y Flight of the Amazon Queen (1995)
suman un género nuevo. A diferencia de Tyrian, su licencia es formal: el
`readme.txt` de cada uno permite distribuirlos gratis en cualquier medio, con
el readme intacto y sin cobrar por el juego. Debian los tiene en `main`. Por
eso se hospedan y se juegan con el botón Jugar. Se usan las versiones de
disquete (7 MB cada una); las de CD con voces pesan de 60 a 107 MB.

### Cómo se armó

- **El código no se copia al repo**: ScummVM pesa cientos de MB. `build.sh`
  clona la versión fijada y aplica dos parches. Se compila con el script
  oficial de ScummVM, que corre en Linux: en Windows, dentro de WSL.
- **Corre en un iframe** porque usa un `Module` global y no se puede
  reiniciar en la misma página. El reproductor ganó soporte para motores que
  no dibujan en su canvas (`surface: 'iframe'` en el registro de motores).
- **Datos bajo demanda**: ScummVM monta `/data` por HTTP y baja cada archivo
  cuando lo necesita. Se guardan con gzip y un interceptor de `fetch` en
  `play.js` los descomprime y corrige las rutas absolutas.

### Problemas que aparecieron

- **WSL sin internet** en la red corporativa. Se activó la red espejo
  (`networkingMode=mirrored` en `.wslconfig`, con backup).
- **Faltaban `pkg-config` y `zip`** en el Ubuntu de WSL.
- **Configuración rota**: ScummVM pide `scummvm.ini` y el servidor de Vite
  devolvía el `index.html` del sitio. Se agregó un `scummvm.ini` real.
- **Falso error al arrancar**: el shell oficial pide acceso a MIDI y el
  rechazo se tomaba como fatal. Ahora solo cuentan los errores del wasm.
- **La pausa no silenciaba**: esta versión usa SDL3, no SDL2.
- **El reproductor no se enteraba de la salida**, por dos causas: con
  Asyncify Emscripten no llama a `onExit`, y la plataforma Emscripten de
  ScummVM declara `kFeatureNoQuit`, así que al terminar un juego volvía a su
  lanzador. Dos parches: `main()` avisa a la página, y la plataforma deja de
  declarar ese flag.
- **Dos trampas al probar**: en FOTAQ, "Give Up" reinicia la partida, no
  sale. Y cambiar solo el `#` de una URL no recarga la página.

### Qué se probó

En el servidor de desarrollo: los dos juegos arrancan desde el reproductor,
el mouse camina en BASS, el guardado rápido de FOTAQ queda en IndexedDB, la
pausa suspende el audio, salir del juego muestra "Saliste del juego",
"Volver a jugar" crea un iframe nuevo, y salir de la ficha no deja ninguno.
Doom se volvió a probar. No se probó: escuchar el sonido, mando, Firefox y
Safari, ni GitHub Pages.

## 12. Front más claro, portadas y tres aventuras más

### El pedido

Que el sitio se entienda sin saber qué es un WAD, que cada juego tenga su
portada, una guía para quien entra por primera vez, y definir bien de qué
plataforma es cada juego, con sus años y datos.

### Qué cambió en el front

- **Guía "¿Primera vez? Empezá acá"** arriba del catálogo: tres pasos y una
  aclaración sobre los juegos que piden un archivo.
- **Catálogo por plataforma**: `src/data/platforms.js` define cada una
  (nombre, fabricante, años, descripción) y el catálogo arma una sección por
  plataforma. Hoy todos son de PC (MS-DOS); sumar una consola es agregar su
  entrada.
- **Fichas con datos del original**: plataforma, año, estudio y quién lo
  publicó, antes de los datos técnicos del port. Los estudios y editores se
  tomaron de las pantallas de título y de los readme de cada juego.
- **Lenguaje llano**: las etiquetas pasan a "Listo para jugar" y "Necesita tu
  copia". "DOOM: tu propio WAD" ahora es "DOOM (con tu copia)". Cada ficha
  tiene un recuadro "Cómo jugar" y, si pide archivo, "¿Por qué me pide un
  archivo?".
- **Portada en todos**: capturas del propio juego. La de "DOOM (con tu
  copia)" es un dibujo propio (SVG), porque no se puede usar arte de DOOM.
- El encabezado ya no desborda en celular.

### Tres juegos más sobre ScummVM

Lure of the Temptress (1992, en español), Drascula (1996, en español con
voces) y DreamWeb (1994, en inglés, para adultos). Las tres licencias son
formales y están en los archivos de cada juego.

Problemas que aparecieron:

- **Drascula avisaba que faltaba la música** en cada arranque. Viene en un
  paquete aparte de pistas MP3: se sumó el paquete y el decodificador
  (`--enable-mad`). Es el juego más pesado: unos 54 MB la primera vez.
- **DreamWeb decía "Game data not found"**: ScummVM lo reconoce por su
  `DREAMWEB.EXE`, que se había dejado afuera por ser un ejecutable de DOS.
- **Las portadas de ScummVM salían negras**: dibuja con WebGL, que borra la
  imagen después de mostrarla. `play.html?captura` la conserva.
- Los datos de ScummVM pasaron de 15 MB a unos 103 MB en el repo.

## 13. Regla nueva: todo se juega desde el navegador

Se intentó sumar la primera consola, PlayStation, con Tomb Raider sobre
OpenLara (un motor reconstruido, no un emulador). Técnicamente funcionó:
compiló con Emscripten 7 y se escribió un lector de imágenes de disco para
sacar los niveles de la copia del jugador. Pero exigía tener el disco
original y una lectora, y eso rompe la idea del sitio: entrar y jugar.

Decisión del dueño del proyecto: **un juego entra solo si se puede jugar sin
tener nada de antemano.** O sus datos se hospedan, o como máximo se enlaza un
archivo gratuito y legal que se descarga y se importa en la misma ficha (el
caso de Tyrian). Los juegos que piden una copia comprada, un disco o una ROM
quedan afuera.

Tomb Raider se retiró del catálogo. El trabajo quedó en el historial de git
(commit `1ee7a33`, revertido), por si algún día sirve: el port de OpenLara, el
lector de discos (`iso9660.js`) y el escritor de zip.

Consecuencia para las consolas: no hay juegos comerciales de PlayStation con
datos libres. Para sumar consolas hay que buscar juegos caseros (homebrew) o
liberados por sus autores, con motor de código abierto.

Por la misma regla se retiró "DOOM (con tu copia)", que pedía el archivo de
datos del juego comprado. Freedoom sigue cubriendo el motor de DOOM con
niveles libres. La etiqueta de los juegos con archivo pasó a decir "Con
descarga gratis" (hoy, solo Tyrian).

## 14. Primera consola de verdad: Game Boy, con juegos caseros

### La decisión

Con la regla de la sección 13 no hay juegos comerciales de consola posibles.
Quedaban los juegos caseros (homebrew): hechos por aficionados y publicados
gratis con licencia libre. Pero un juego de consola está hecho para el
procesador de esa consola, así que hace falta un emulador. El dueño del
proyecto aceptó emuladores **solo** para juegos caseros con licencia libre.
El lema del sitio dejó de decir "sin emuladores".

### Cómo se armó

- **binjgb** (MIT): emulador de Game Boy y Game Boy Color en C. Se compila
  solo su núcleo, sin interfaz: 92 KB. No hizo falta parchearlo.
- El runtime (`src/runtimes/gameboy/`) es propio: hace avanzar la consola
  en cada cuadro, copia la imagen al canvas, manda el audio a Web Audio,
  traduce teclado y mando, y guarda la memoria del cartucho en el navegador.
- Dos plataformas nuevas en el catálogo: Game Boy y Game Boy Color.
- Juegos: Libbet and the Magic Floor (zlib) y µCity (GPL-3.0), bajados de
  los releases de sus autores en GitHub, con su licencia al lado.

### Problemas que aparecieron

- **La pausa no frenaba el juego.** El reproductor llama a "reanudar" apenas
  arranca; el bucle no se protegía de arrancar dos veces y quedaban dos
  bucles, de los que la pausa frenaba uno. Se agregó la guarda.
- **Falsas alarmas al probar**: con el panel del navegador de pruebas
  oculto, `requestAnimationFrame` no se dispara y los juegos parecen
  colgados. Y las teclas automáticas duran menos que un cuadro, así que la
  consola no las ve: hay que mantenerlas unos 150 ms.
- **Tobu Tobu Girl Deluxe** quedó afuera por ahora: licencia perfecta (MIT y
  CC BY 4.0), pero su autor lo distribuye solo por itch.io.

### Qué se probó

En el servidor de desarrollo: los dos juegos arrancan, Libbet responde a las
flechas y a Start, µCity guarda su memoria (128 KB) en el navegador, la
pausa congela y reanuda, y el botón Reiniciar funciona. No se probó el
sonido de oído, un mando real, ni guardar y recuperar una ciudad en µCity.
