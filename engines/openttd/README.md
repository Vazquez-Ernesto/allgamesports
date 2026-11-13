# OpenTTD para navegador

[OpenTTD](https://github.com/OpenTTD/OpenTTD) (versión en `UPSTREAM_TAG`),
una recreación libre de Transport Tycoon Deluxe escrita en C++, compilada a
WebAssembly con Emscripten.

Licencia: **GPL-2.0** (ver `LICENSE-openttd.md`).

OpenTTD trae soporte oficial para navegador (su carpeta `os/emscripten`).
Acá se usa ese soporte casi sin cambios.

## Compilar

Corre en Linux; en Windows, con WSL, desde la raíz del repo:

```bash
wsl bash engines/openttd/build.sh
```

Hace falta git, cmake, make, g++, python3, unzip y curl. El script baja su
propio Emscripten (6.0.1, la versión que usa OpenTTD) y los gráficos
OpenGFX. Deja `openttd.js`, `openttd.wasm` (10 MB) y `openttd.data` (8 MB) en
`public/games/openttd/`.

Se compila dos veces, y conviene entender por qué:

1. **Herramientas de host.** OpenTTD genera parte de su propio código
   mientras compila (tablas de ajustes, textos de cada idioma). Esas
   herramientas tienen que correr en la máquina que compila, así que se
   compilan con el `g++` normal.
2. **El juego**, con Emscripten, usando lo que generaron esas herramientas.

Tarda varios minutos y usa bastante memoria: `JOBS=3` por defecto (cada
compilador de C++ ocupa cerca de 1 GB).

## Cambios al código original

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `patches/0001-idioma-espanol.patch` (`CMakeLists.txt`) | Suma `spanish_MX.lng` a los archivos que viajan con el juego | El original solo trae inglés |
| `patches/0002-exportar-heapu8.patch` (`CMakeLists.txt`) | Pide a Emscripten que exponga `HEAPU8` | El juego usa `Module.HEAPU8` para pedirle números al azar al navegador. Emscripten 6 ya no lo expone solo: sin esto, "Generar" mapa fallaba con un error de JavaScript |
| `pre.js` (reemplaza `os/emscripten/pre.js`) | La primera vez escribe un `openttd.cfg` con el idioma en español y `participate_survey = no` | Arrancar en español y no mandar la encuesta automática de uso a los servidores de OpenTTD sin que nadie la pida |

`HEAPU8` es la memoria del programa vista desde JavaScript como una lista de
bytes: así se pasan datos entre el código C++ y el navegador.

`build.sh` borra la salida antes del paso final: `make` no sabe que `pre.js`
forma parte del resultado y, si no, deja el archivo viejo.

## Cómo se conecta con la página

Corre en un iframe (`src/runtimes/iframe.js`).
`public/games/openttd/play.js` define el `Module` que OpenTTD espera y
traduce sus avisos (`onExit`, `onAbort`) a `postMessage`.

A diferencia de Tyrian o Wolfenstein, acá el bucle del juego lo maneja el
navegador (`emscripten_set_main_loop`): no hace falta Asyncify. Por eso la
pausa del reproductor usa `Module.pauseMainLoop()` y `resumeMainLoop()`.

Las partidas y la configuración las guarda OpenTTD en IndexedDB (base
`/home/web_user/.openttd`), cada vez que se guarda una partida o cambia un
ajuste.

## Gráficos

[OpenGFX](https://github.com/OpenTTD/OpenGFX) 8.0, **GPL-2.0**, bajado de
`cdn.openttd.org` (zip con SHA-256
`43a0c1dabf39cb865394f3a6cc36d4da5c10ecfaaf55652043104806810903be`). Va
dentro de `openttd.data`; su licencia y su léeme están en
`public/games/openttd/`.

## Lo que no tiene

- **Sonido y música.** El soporte oficial para navegador arranca con los
  controladores de sonido y música anulados (`-snull -mnull`).
- **Partidas en red.** El navegador no puede abrir las conexiones que usa el
  juego.
- El menú "Contenido en línea" sí funciona: OpenTTD ofrece un servidor
  intermedio para eso.

## Pendiente

- Probar si los efectos de sonido andan con el controlador de SDL y el
  paquete libre OpenSFX (CC BY-SA 3.0). Suma unos 10 MB de descarga.
- Comprimir `openttd.data` (8 MB; con gzip quedaría en 4,8 MB).
- Controles táctiles: el juego necesita clic derecho y rueda.
