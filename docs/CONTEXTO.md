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

## 15. Cuatro juegos más de Game Boy

Con el emulador andando, sumar un juego es el archivo, su licencia y la
ficha. Se sumaron Shock Lobster (2021), 2048 (2014), Carazu (2016) y Tobu
Tobu Girl Deluxe.

- **De dónde salen**: Homebrew Hub (hh.gbdev.io), el catálogo de la
  comunidad de Game Boy, guarda el archivo de cada juego y su licencia. Tiene
  una API de búsqueda. Ahí estaba Tobu Tobu Girl Deluxe, que su autor
  distribuye solo por itch.io. La licencia se confirmó en el repositorio de
  cada autor, no solo en el catálogo.
- **Portadas**: capturas del canvas. Como el panel de pruebas oculto frena
  `requestAnimationFrame`, para grabar se lo reemplazó por un temporizador.
- Tobu Tobu Girl Deluxe funciona en Game Boy y en Game Boy Color; está en la
  sección Color porque ahí se ve a color.

Se probó que los cuatro arrancan y responden al teclado. No se jugaron a
fondo ni se escuchó el sonido. El año de Tobu Tobu Girl Deluxe (2019) y sus
controles no se verificaron.

## 16. El DOOM original (shareware)

El motor de Doom ya estaba; faltaban datos que se pudieran repartir. El
primer episodio de DOOM ("Knee-Deep in the Dead") se publicó en 1993 como
shareware, pensado para copiarse. Su licencia permite hacer copias para
otras personas, prohíbe cobrar y modificarlo, y John Carmack confirmó en
1999 que "es libremente distribuible". Debian lo reparte bajo esos términos.

Se tomó `doom1.wad` 1.9 del paquete de Debian (SHA-1
`5b2e249b9c5133ec987b3ea77596381dc0d6bc1d`, el original), se sirve comprimido
como `doom1.wadgz` (1,7 MB) con la licencia al lado
(`LICENSE-doom-shareware.txt`). No se modifica: la compresión es solo para
la descarga.

Esto reemplaza con ventaja a "DOOM (con tu copia)", retirado en la sección
13: es el DOOM real y arranca con un clic. Los episodios 2 y 3 eran de pago y
no se pueden sumar.

Se probó que arranca, muestra el título y entra a E1M1.

## 17. Tres juegos más de Game Boy Color

Big2Small (2021), Geometrix (2016) y GB-Wordyl (2022), los tres GPL-3.0 y a
color. Se probó que arrancan y responden.

Lección de esta tanda: la licencia que declara el catálogo (o la que detecta
GitHub) habla del código. Hay que leer el README entero: Tuff tiene código
MIT pero gráficos con todos los derechos reservados, y Renegade Rush usa arte
de terceros. Los dos quedaron afuera.

## 18. Wolfenstein 3D (shareware)

Primer juego con Wolf4SDL (GPL-2.0), una adaptación del código original de
id Software a SDL2. Corre en un iframe como ScummVM; el código común de los
dos quedó en `src/runtimes/iframe.js`.

Dos problemas al compilar, los dos resueltos con parches chicos
(`engines/wolf3d/patches/`):

- La variante GPL usa el sintetizador de música de DOSBox, que es C++, y
  este port es C: no compilaba. Se agregó un puente (`opl_bridge.cpp`): tres
  funciones en C++ marcadas `extern "C"` para poder llamarlas desde C.
- Los números de la barra de estado no aparecían. `itoa` medía con
  `strlen()` un texto sin inicializar: en una PC esa memoria tiene basura y
  funciona por casualidad; en WebAssembly la pila arranca en ceros. Es un
  ejemplo de "comportamiento indefinido" de C: el mismo código da resultados
  distintos según la plataforma.

Los datos son los del shareware 1.4 de Apogee (primer episodio), sin
modificar, con el paquete original y su `VENDOR.DOC` al lado. El permiso para
repartirlo gratis es implícito (el texto solo pone condiciones a quien
cobra), no expreso como el de DOOM: está explicado en
`engines/wolf3d/README.md`.

Se probó: arranca, menú, nivel 1, abrir puertas, disparar, guardar partida
(queda en IndexedDB, base `/save-wolf3d`) y salir con "Quit". Falta escuchar
el sonido.

## 19. OpenTTD

Primer juego de gestión y primero en C++. OpenTTD trae soporte oficial para
navegador, así que el trabajo fue compilarlo y conectarlo, no adaptarlo.

Se compila en WSL con el Emscripten que usa el proyecto (6.0.1), en dos
pasos: primero unas herramientas que corren en la máquina y generan código,
después el juego. Los gráficos libres OpenGFX (GPL-2.0) viajan dentro de
`openttd.data`.

Problemas encontrados:

- Al tocar "Generar" no pasaba nada. En la consola había un error: el juego
  usa `Module.HEAPU8` para pedirle números al azar al navegador y Emscripten
  6 ya no lo expone si no se pide. Parche de una línea.
- Los cambios en `pre.js` no aparecían: `make` no sabe que ese archivo forma
  parte del resultado y no rehacía el paso final. `build.sh` ahora borra la
  salida antes.
- El juego preguntaba si mandar una encuesta automática a OpenTTD. Se deja
  en "no" por defecto, junto con el idioma en español, escribiendo un
  `openttd.cfg` inicial. Un archivo de configuración sin número de versión
  se lee "a la antigua": por eso alcanza con un solo archivo.

El código del iframe compartido ganó una opción (`pausesMainLoop`): en
OpenTTD el bucle lo maneja el navegador y hay que frenarlo al pausar.

Plataforma nueva en el catálogo: "PC (Windows y Linux)".

Se probó: arranca en español, genera un mapa, guarda la partida (queda en
IndexedDB), pausa y reanuda, y sale desde el menú. No tiene sonido ni
partidas en red (así es el soporte oficial para navegador).

## 20. Heretic (shareware)

Chocolate Heretic (parte de Chocolate Doom, GPL-2.0), compilado con `emcc`
directo, sin su CMake. Corre en un iframe, con la misma receta que
Wolfenstein 3D: Asyncify, SDL2 y partidas en IndexedDB.

Compiló a la primera, pero la página se colgaba entera al arrancar: ni el
navegador respondía. La causa fue la detección del chip de música: programa
un temporizador y espera a que el hilo de audio lo dispare. En el navegador
hay un solo hilo, así que el audio no puede correr mientras el juego espera:
un "deadlock". Se resolvió con un parche que saltea esa prueba (el chip es
un emulador incluido, siempre está).

Lección para próximos ports: cuando una página se cuelga del todo (no se
puede ni sacar una captura), buscar esperas entre hilos: `SDL_CondWait`,
`SDL_CreateThread`, mutex.

La licencia de los datos es la más clara de los tres shareware del catálogo:
permite expresamente la distribución electrónica gratuita, con la condición
de que vaya comprimido. Se sirve con gzip, con el paquete original y la
licencia al lado.

Se probó: arranca, menú, partida nueva, moverse y disparar, guardar (y que
la partida siga después de recargar) y salir. Falta escuchar el sonido.

## 21. Jazz Jackrabbit y sus dos especiales navideños

Primer juego de plataformas "de marca" del catálogo. OpenJazz (GPL-2.0) es un
motor libre escrito desde cero que lee los archivos originales, y ya trae
soporte para Emscripten: el único parche cambia las opciones de enlace para
que no genere su propia página y espere a que `play.js` le copie los datos.

Un motor, tres juegos: Jazz Jackrabbit 1.1 (primer episodio), Holiday Hare
(1994) y Holiday Hare 1995. La página recibe cuál cargar en el `#`.

La licencia de Epic MegaGames permite y alienta repartir el shareware en
línea, pero exige que vaya completo y sin alterar (la de los especiales
agrega: sin renombrar archivos, acreditando a Epic, diciendo que es shareware
y explicando qué es). Por eso no se hospedan archivos sueltos: se hospeda el
.zip original y se descomprime en el navegador. `play.js` trae un lector de
.zip mínimo (el formato tiene un índice al final; cada archivo se infla con
`DecompressionStream('deflate-raw')`, que ya viene en el navegador).

Tropiezos:

- Las opciones de enlace en varias líneas cortaban el comando ("no input
  files"). Van en una sola línea.
- A 640x480 el juego muestra más nivel y los personajes quedan chiquitos. Se
  arranca con `--scale 2` (320x240 agrandado), que es como se veía.
- OpenJazz no guarda partidas: el menú existe, pero el motor solo sabe leer
  las del juego original. Las fichas lo aclaran.
- Para probar otro juego en la misma pestaña hay que recargar: cambiar solo
  el `#` no recarga la página.

Se probó en los tres: arranca, menú, nivel, moverse y saltar; y en el
primero, salir desde el menú. Falta escuchar el sonido.

## 22. Supaplex descartado; segunda consola: NES

**Supaplex quedó afuera.** Wikipedia y el README de OpenSupaplex dicen que es
"freeware", pero la fuente original cuenta otra cosa: los autores y Digital
Integration (dueña de los derechos) le dieron permiso a una persona para
regalarlo en su sitio. No hay una licencia para que otros lo repartan, y la
descarga oficial es un instalador de Windows, que no se puede importar en el
navegador. Lección: "freeware" en un README no alcanza; hay que llegar a
quién dio el permiso y a quién.

**NES.** El emulador es binjnes (MIT), del mismo autor que el de Game Boy y
con la misma interfaz, así que el runtime es casi un calco. Diferencias: el
tiempo se pide en segundos, la imagen hay que convertirla a RGBA antes de
copiarla (256x240) y el audio sale en un solo canal, como números con coma.
Los controles se movieron a `runtimes/consoleInput.js` para compartirlos.

Al compilar sin el CMake del proyecto faltaba `-DBINJNES_CLANG`, la marca
con la que su CMake avisa qué compilador se usa.

Primeros juegos, de Homebrew Hub, con la licencia leída en el repositorio de
cada autor: Nova the Squirrel, Thwaite y Concentration Room. Nova tiene
código GPL y arte con Creative Commons no comercial: se puede repartir
gratis, no vender.

Descartado: RHDE: Furniture Fight (licencia libre, pero solo tiene modos de
dos jugadores y hoy se conecta un solo control).

Se probó: los tres arrancan y responden a los controles; en Nova se llegó al
primer nivel, en Thwaite se dispararon los dos silos y en Concentration Room
se dio vuelta una carta. Falta escuchar el sonido.

## 23. Duke Nukem II (shareware)

RigelEngine (GPL-2.0) es un motor libre escrito desde cero que lee los
archivos originales. Trae build para WebAssembly, pero su versión web
oficial está caída, y al compilarlo se vio por qué: no compila con un
Emscripten actual.

Tres parches:

- El motor mostraba y ocultaba carteles de su propia página
  (`document.getElementById(...)`). Ahora llama a `Module.onRigelReady` y
  `Module.onRigelExit`, que define `play.js`.
- Enlace sin su página, con IndexedDB y las funciones que `play.js` usa para
  hacer esperar al motor mientras carga el perfil guardado.
- La biblioteca de JSON que trae usa `std::char_traits<unsigned char>`, una
  pieza de C++ que las versiones nuevas de la biblioteca estándar
  eliminaron. Se esquiva pasándole los mismos bytes como `char`.

La licencia del shareware es de las claras: Apogee dice que todos pueden
copiarlo y repartirlo sin cobrar, y que por servicio en línea no hace falta
permiso. Pide todos los archivos sin modificar y nombrar a Apogee.

Susto durante las pruebas: el menú se dibujaba en un cuarto de la pantalla.
No era el juego: el panel de pruebas tenía una emulación de tamaño colgada.
Se confirmó limpiándola, y además simulando un cambio de tamaño en el
reproductor (la imagen se escala entera).

Se probó: intro, menú, partida nueva, caminar, saltar y disparar, guardar
(el perfil queda en IndexedDB y sobrevive a recargar) y salir desde el menú.
Falta escuchar el sonido.

## 24. Segundo control de NES

`runtimes/consoleInput.js` ahora sabe de jugadores: cada tecla apunta a un
jugador y un botón, y los mandos se reparten en orden (el primero conectado
es el jugador 1). Game Boy lo usa con un solo control; NES, con dos.

Las teclas del jugador 2 (Y G H J, L, K, O, I) son las de la demo oficial de
binjnes: en vez de inventar un esquema, se siguió el del autor.

Con eso volvió RHDE: Furniture Fight, que se había descartado por ser solo
para dos. Se probó que cada jugador elige su personaje con sus teclas, que
la partida arranca (Start del jugador 1) y que Game Boy ignora las teclas
del jugador 2.

## 25. Descartes por licencia y Rise of the Triad

Se siguió la lista de candidatos de más fácil a más difícil. Dos quedaron
afuera por licencia, y con eso el criterio quedó fijado: **solo se suman
datos con permiso explícito para repartirlos gratis**.

- **Spear of Destiny (demo):** el paquete de FormGen (1992) no trae ninguna
  licencia, solo una descripción y dónde comprar el juego completo.
- **Cosmo's Cosmic Adventure:** la licencia que se encontró (Apogee, 1993)
  regula a los revendedores y solo nombra a los BBS de pasada. Además venía
  en un reempaquetado de archive.org; el paquete oficial usa un formato de
  instalador de Apogee que no se pudo abrir.

Herramientas que aparecieron: los autoextraíbles de los 90 suelen ser LHA o
ARJ; en WSL se abren con `lha` (paquete lhasa) y `arj`.

**Rise of the Triad: The HUNT Begins** sí entró: su VENDOR.DOC de 1995 es
igual de explícito que el de Duke Nukem II. El motor es taradino, compilado
con `emcc` directo, y trajo dos problemas típicos de C viejo:

1. **"function signature mismatch"** al elegir "New Game". El menú guarda
   funciones de distintos tipos y las llama todas como si recibieran un
   `int`. En una PC eso funciona de casualidad; WebAssembly verifica el tipo
   en cada llamada por puntero. Se resolvió con la opción de Emscripten
   `-sEMULATE_FUNCTION_POINTER_CASTS`, sin tocar el código.
2. **La página se congelaba** en los carteles de "¿Seguro?": un bucle
   esperaba una tecla sin devolverle nunca el control al navegador, así que
   la tecla nunca llegaba. Un parche en la función que lee el teclado la
   hace ceder cada 8 ms. Es la versión general de lo que en Tyrian hace
   `web.c`.

También apareció que Duke Nukem II y Rise of the Triad compartían la base de
IndexedDB `/libsdl` (los dos guardan donde indica SDL). Rise of the Triad
monta su subcarpeta, y así tiene base propia.

Se probó: intro, menú, partida nueva, moverse, disparar y levantar armas,
guardar (queda en IndexedDB), los carteles de confirmación y salir. Tiene
efectos de sonido, no música.

## 26. LibreQuake

El último de la lista de candidatos, y el más pesado. Quake (1996) tiene el
código libre desde 1999, pero no sus datos. LibreQuake los rehace desde cero
con licencia libre (arte BSD-3, código del juego GPL-2.0): no es shareware ni
permiso implícito, es software libre de verdad.

El motor es FTEQW, el que recomienda LibreQuake, que trae objetivo oficial
para navegador. Compiló con un solo parche: su arranque usa
`addRunDependency`, que Emscripten 6 ya no incluye si no se pide.

Se usa la versión "lite" (el primer episodio): 50 MB de datos que quedan en
25 MB con gzip. La música (29 MB más) quedó afuera por ahora.

Lo que se aprendió probando:

- FTEQW escucha el teclado en el documento y en el canvas. Las teclas reales
  llegan una vez; las simuladas sobre el canvas llegaban dos (Esc abría y
  cerraba el menú). Se confirmó con pulsaciones reales antes de tocar nada:
  era un problema de la prueba, no del juego.
- Su menú sigue al mouse: Enter elige la opción que está debajo del puntero.
- Guarda las partidas solo, en `localStorage`.

Accidente de esta tanda: un script que agregaba la sección 24 de este
documento lo abrió para escribir antes de leerlo y lo vació; se publicó así
en `86043e8` y se restauró en `c0eb4c2`. Para agregar a un archivo: leer
primero, escribir después, y revisar `git diff --stat` antes de commitear.

Se probó: arranque, menú, partida nueva, moverse, guardar (queda en
`localStorage`) y salir desde el menú.

## 27. Dragon Ball Z: Budokai Tenkaichi y el probador de mandos

Se evaluó portar Budokai Tenkaichi 1 y 2 (PS2, Spike/Bandai, 2005 y 2006).
El sitio de referencia (bt4.lauta.site) usa un motor recompilado para ese
juego y sirve los archivos del disco original desde su propio servidor.

Conclusión: **no entra en el catálogo**. Son juegos comerciales: ni sus
datos ni su código se pueden repartir, y pedirle al jugador su propio disco
choca con la regla del catálogo (sección 13).

Caminos técnicos que existen, para uso personal con un disco propio:

- **PCSX2** (emulador libre de PS2 para PC): el más directo, con mando.
- **Recompilación estática** (ps2-web-recomp, PS2Recomp): traduce el
  programa del juego a WebAssembly o a nativo. El resultado contiene el
  código del juego y pertenece a sus dueños; la compatibilidad varía juego
  por juego.

Lo que sí se sumó: **/mando**, una página que muestra lo que el navegador
recibe de cada mando (nombre, si está reconocido, botones y ejes), con un
botón para copiar esos datos. Los adaptadores USB de mandos de PS2 suelen
aparecer como no reconocidos (`mapping` vacío): los botones llegan en el
orden del fabricante. Con los datos de la página se puede armar el mapeo.
Se probó con mandos simulados; falta uno real.

## 28. SuperTux 0.7.0

Plataformas libre (motor GPL-3.0; niveles, gráficos y música GPL 2+ y
CC-BY-SA). Se eligió la 0.7.0 (2025) y no la 0.6.3: la vieja necesita Boost
e hilos (SharedArrayBuffer, que GitHub Pages no permite), y la nueva ya trae
soporte para navegador.

Licencia de los datos: verificada archivo por archivo. Los 110 niveles y 6
mapas incluidos declaran CC-BY-SA 4.0 o GPL 2+ / CC-BY-SA 3.0. Dos piezas
son CC BY-NC 4.0 (cinta transportadora y `kill.wav`): se pueden repartir
sin fines comerciales. Permiso explícito, como pide la sección 25.

Tamaño: los datos pesan unos 325 MB. Se decidió ("los dos mundos,
comprimidos") recomprimir la música a calidad 0, optimizar los PNG sin
pérdida y sacar fuentes y traducciones que no se usan: quedan 162 MB en
cuatro paquetes de `file_packager` (cada uno de menos de 100 MB, el límite
de GitHub). La licencia permite modificar los datos avisándolo: la ficha y
el README lo dicen.

Trampas que aparecieron (detalle en `engines/supertux/README.md`):

- `#ifdef EMSCRIPTEN` sin guiones bajos: Emscripten moderno solo define
  `__EMSCRIPTEN__`, y los bloques web se apagaban en silencio. Se define a
  mano. Revisarlo en próximos ports de código viejo.
- `PHYSFS_init(nullptr)` falla en el navegador sin código de error. Se aisló
  con un `main.c` de diez líneas enlazado contra la biblioteca de vcpkg y
  corrido con Node: con NULL falla, con un nombre de programa anda.
- La ruta de datos quedaba fija en la carpeta de compilación, con el usuario
  de la máquina adentro. `-ffile-prefix-map` también saca esas rutas de los
  mensajes de log, que se publicarían dentro del `.wasm`.
- `iframe.js` ahora acepta `startTimeoutMs`: SuperTux baja 170 MB la primera
  vez y el minuto por defecto no alcanza.

Se probó: menú en español, intro, mapa del mundo, primer nivel, y que al
volver a entrar retoma el progreso (IndexedDB).

## 29. Abuse descartado; Pingus

**Abuse** (Crack dot Com, 1996): el código es de dominio público y los datos
del shareware se pueden usar libremente, salvo los efectos de sonido. Esos
son de Bobby Prince, que en 2004 le dio a Debian un permiso ambiguo por mail
("para sus propósitos"). Como es implícito y no es para nosotros, se
descartó (criterio de la sección 25). Sin sonido el juego pierde mucho.

**Pingus** (clon libre de Lemmings): el README declara todo el proyecto
GPL-3.0+, y Debian lo distribuye en *main*. La música son módulos compuestos
para el juego por colaboradores listados en `AUTHORS`. Se usó la rama de
desarrollo (0.8.0, octubre de 2026), que ya trae build para navegador; la
estable (0.7.6, 2011) usa SDL 1.2 y Boost.

El build del proyecto usa Nix; `engines/pingus/build.sh` reproduce lo mismo
con las versiones que fija el proyecto. Dos detalles:

- libmodplug (2008) no conoce `wasm32-unknown-emscripten`: se le copian los
  `config.sub`/`config.guess` de SDL2.
- SDL2 dejó la ruta de la máquina dentro del `.wasm` (sus `assert`). Ahora
  todo se compila con `-ffile-prefix-map` y el script lo verifica al final.
  Vale como regla para los próximos ports.

Descarga: unos 36 MB. Se probó: menú en español, sonido y música, mapa de
Tutorial Island, niveles del tutorial y que el progreso sobrevive a la
recarga.

## 30. Nueva tanda de candidatos y Sołtys

Se revisaron 17 juegos con el criterio de la sección 25 (permiso explícito,
leído en el archivo original). Quedaron tres, de más fácil a más difícil:
Sołtys (ScummVM), Blasphemer (motor de Heretic) y Duke Nukem 3D shareware
(EDuke32). Los descartes, con la evidencia:

| Juego | Por qué no |
|---|---|
| Quake shareware | El permiso de `SLICNSE.TXT` es para "Providers" y el paquete entero; prohíbe "publicly display" y usar capturas y sonidos (choca con las portadas) |
| Hexen (demo) | Sin licencia; su README dice "Hexen is NOT a shareware product" |
| Strife (demo) | Sin licencia; el propio `STRIFE.EXE` dice "NOT SHAREWARE, do not distribute!" |
| The Griffon Legend | El paquete de ScummVM no trae licencia |
| God of Thunder | Su contrato de uso prohíbe distribuirlo |
| Mystery House | Se dice "public domain", pero no hay texto que lo respalde |
| Juegos SLUDGE (Mandy) | Freeware con una condición extra: informarle las descargas al autor |
| Warzone 2100 | Licencia perfecta (GPL), pero necesita hilos (SharedArrayBuffer), que en GitHub Pages no hay |
| Rocks'n'Diamonds | Datos sin licencia, con niveles de Boulder Dash y Supaplex; Debian los sacó |
| Commander Keen 1 | Licencia buena, pero el único port web (Chocolate Keen) sale del ejecutable original y su licencia no está clara |

Hugo y Mortville Manor tienen motor en ScummVM, pero no están entre sus
descargas freeware.

**Sołtys** (LK Avalon, 1995) es una aventura polaca con versión en español.
Su `licencia.txt` permite "distribuir este juego de forma gratuita en
cualquier medio" con la licencia y los avisos intactos. Sumarlo fue activar
el motor `cge` (169 KB más de `.wasm`) y agregar su zip a
`prepare-data.mjs`. ScummVM reconoce la versión española por el tamaño y el
MD5 de `vol.dat`.

Tres cosas que aparecieron:

- **Finales de línea.** El trabajo se hizo en un worktree de git, y los
  `.sh` salieron con CRLF: Git para Windows trae `core.autocrlf=true` y los
  convierte al sacarlos. bash leyó `pipefail\r` y cortó. Se sumó un
  `.gitattributes` que fija LF para `.sh` y `.patch`.
- **Cada tecla llega 6 veces** a ScummVM: sus oyentes de teclado quedan
  registrados 6 veces al arrancar (se contaron en `JSEvents.eventHandlers`).
  Pasa también en Lure, así que viene de antes. Los nombres de partida salen
  con letras repetidas, y las teclas 1 a 8 de Sołtys no se listan. Queda
  para la revisión general.
- **El buscador no encontraba "soltys".** La ł no es una l con acento: NFD
  no la separa. `Home.jsx` la cambia a mano.

Se probó: arranque, intro en español, saltar escenas con Esc, caminar,
agarrar un objeto, guardar con F5 (quedó en IndexedDB) y cargarlo con F7
después de recargar la página, pausa (el audio pasa a `suspended`) y salir
con Alt+X. F5 no recarga la página: SDL cancela la tecla
(`defaultPrevented`). No se escuchó el sonido.

## 31. Blasphemer y Crispy Heretic

Blasphemer (BSD-3) es a Heretic lo que Freedoom es a DOOM: niveles,
gráficos, sonidos y música libres. La idea era usar el Chocolate Heretic que
ya estaba. Arrancó, pero en E1M2, a los pocos pasos, cortó con
`R_FindPlane: no more visplanes`.

Un "visplane" es cada superficie de piso o techo distinta que se ve a la
vez. El motor de 1994 les reserva 128 lugares en un arreglo de tamaño fijo y
aborta si hacen falta más. Chocolate copia ese límite a propósito (busca ser
fiel al original), y el README de Blasphemer avisa que necesita un motor
"limit-removing". Se pasó a **Crispy Heretic** (de Crispy Doom), el mismo
código sin esos topes: cuando un arreglo se llena, lo agranda al doble. Se
armó como motor aparte (`engines/crispy-heretic`); el Heretic shareware no
se tocó.

Se recorrieron los 25 mapas de los tres episodios jugables. La consola de
Crispy avisa cada vez que agranda algo: visplanes hasta 512, drawsegs hasta
2048 y sprites visibles hasta 512, contra 128, 256 y 128 del original. Con
Chocolate, cualquiera de esos mapas habría cortado.

Tres cosas que aparecieron:

- **La compilación se cortó por falta de memoria** en el último paso, el
  enlace con Asyncify, que es el que más RAM usa. Se relanzó con menos
  programas abiertos.
- **Rutas de la máquina en el `.wasm`.** El control de `build.sh` encontró
  dos, del SDL2 que trae Emscripten como "port". Emscripten compila los
  ports en su caché con sus propios flags (borra `EMCC_CFLAGS`) y solo
  reemplaza las rutas que quedan debajo de su carpeta. La caché estaba
  movida (`EM_CACHE`); con la de por defecto, quedaron limpias. Al revisar
  todo `public/games/` aparecieron rutas parecidas en motores ya publicados
  (ROTT, SuperTux, Duke Nukem II, OpenTTD, Jazz Jackrabbit): quedan para la
  revisión general.
- **Los trucos de Crispy leen el carácter tipeado** (evento `keypress`): en
  pruebas automáticas, `engage<e><m>` solo entra con tipeo real.

Se probó, además de los 25 mapas: guardar con F2, recargar la página y
cargar con F3, pausa (el audio pasa a `suspended`) y salir con F10. SDL2 no
tiene el problema de teclas repetidas de ScummVM (un solo oyente por
evento). No se escuchó el sonido.
