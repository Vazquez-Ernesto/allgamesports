# Motor de Tyrian para navegador

Código fuente de [OpenTyrian](https://github.com/opentyrian/opentyrian)
(commit en `UPSTREAM_COMMIT`) compilado a WebAssembly con Emscripten.

Licencia: **GPL-2.0** (ver `LICENSE-opentyrian`). Cualquier cambio a este
código tiene que publicarse bajo la misma licencia.

Los datos del juego (Tyrian 2.1) **no** están en el repositorio: son
freeware, pero su autor solo permite compartirlos de forma personal. El
jugador descarga el `tyrian21.zip` oficial y lo carga en el reproductor.

## Compilar

Hace falta Emscripten (`emcc` en el PATH; probado con 7.0.0). La primera vez
Emscripten descarga su port de SDL2.

```bash
npm run build:tyrian
```

Deja `tyrian.js` y `tyrian.wasm` en `public/games/tyrian/`.

## Cómo está hecho el port

Doom se porteó con doomgeneric, que deja el bucle del juego en manos de
JavaScript. OpenTyrian no tiene esa capa: su código es una cadena de bucles
que nunca devuelven el control (cada menú es un `do { ... } while (!done)`).
Reescribirlos sería reescribir el juego. En su lugar se usa **Asyncify**, una
transformación de Emscripten que permite "pausar" una función C en medio de
un bucle, devolverle el control al navegador y retomarla después.

- `SDL_Delay` ya duerme con `emscripten_sleep` cuando Asyncify está activo.
- Para los bucles que no esperan, `web_yield()` cede el control como mínimo
  cada 16 ms. Se llama desde `handleSdlEvents`, que corre en todos los bucles.

Video, sonido y teclado los resuelve el port de SDL2 de Emscripten. El sitio
le pasa la configuración por variables de entorno (ver
`src/runtimes/tyrian/index.js`).

Archivos nuevos:

| Archivo | Qué hace |
|---|---|
| `src/web.c`, `src/web.h` | Cesión de control, pausa, pedido de salida desde JS y salida avisando a la página |

Cambios al código original (todos marcados con `WEB:` y `__EMSCRIPTEN__`):

| Archivo | Cambio | Por qué |
|---|---|---|
| `keyboard.c` | `handleSdlEvents` llama a `web_yield()` | Ningún bucle del juego congela la página |
| `varz.c` | `JE_tyrianHalt` termina con `web_exit()` en vez de `exit()` | La página se entera de la salida y sincroniza las partidas guardadas |
| `video.c` | La ventana no es redimensionable | Si lo es, SDL agranda el canvas a su tamaño en pantalla y escala por software; así dibuja a tamaño fijo y escala CSS |

## Flags de compilación que importan

- `-sSTACK_SIZE=5242880`: Emscripten reserva 64 KB de pila por defecto y
  `JE_loadMap` declara un arreglo local de 64.000 bytes. Sin este flag el
  juego se cae al entrar a un nivel (`memory access out of bounds`).
- `--profiling-funcs`: deja los nombres de las funciones en el `.wasm`
  (13 KB con gzip), para que los errores digan dónde ocurrieron.
- Sin `WITH_NETWORK`: el juego en red queda desactivado.

## Pendiente

- Mando: SDL2 lo soporta, pero no se probó.
- Controles táctiles para celular.
