# Motor de Doom para navegador

Código fuente de Doom (vía [doomgeneric](https://github.com/ozkl/doomgeneric),
commit en `UPSTREAM_COMMIT`) compilado a WebAssembly con Emscripten.

Licencia: **GPL-2.0** (ver `LICENSE-doomgeneric`). Cualquier cambio a este
código tiene que publicarse bajo la misma licencia.

## Compilar

Hace falta Emscripten (`emcc` en el PATH; probado con 3.1.6).

```bash
npm run build:doom
```

Deja `doom.js` y `doom.wasm` en `public/games/doom/`. Esos dos archivos están
en el repositorio para que el sitio se pueda publicar sin instalar Emscripten.

## Cómo está hecho el port

doomgeneric reduce todo lo que Doom le pide al sistema operativo a seis
funciones (`DG_Init`, `DG_DrawFrame`, `DG_SleepMs`, `DG_GetTicksMs`,
`DG_GetKey`, `DG_SetWindowTitle`). Portar Doom a una plataforma nueva es
escribir esas seis funciones.

Archivos nuevos:

| Archivo | Qué hace |
|---|---|
| `src/doomgeneric_web.c` | Las seis funciones para navegador, la cola de teclas, el mouse y `dg_start()` |
| `src/i_websound.c` | Efectos de sonido: le pasa el audio PCM a JavaScript (Web Audio) |

Del lado JavaScript, `src/runtimes/doom/` (en la raíz del proyecto) carga el
`.wasm`, dibuja cada frame en un `<canvas>`, reproduce el sonido y traduce
teclado, mouse y mando.

Cambios al código original (todos marcados con `WEB:` o `__EMSCRIPTEN__`):

| Archivo | Cambio | Por qué |
|---|---|---|
| `d_main.c` | El "derretido" entre pantallas avanza un paso por frame | El original usa un bucle bloqueante y el navegador solo pinta cuando el código devuelve el control |
| `i_input.c` | Usa el carácter tipeado que manda el navegador; publica el mouse una vez por tic | Trucos y nombres de partida funcionan aunque se reasignen teclas |
| `i_system.c` | `I_Quit` avisa a la página | No hay proceso que cerrar |
| `i_sound.c` | No incluye SDL_mixer | El sonido va por Web Audio |
| `m_controls.c` | Clic derecho = usar, `[` `]` = cambiar arma | Controles modernos por defecto |
| `g_game.c` | Sin límite de tamaño de partida guardada | Mapas grandes de Freedoom |
| `r_plane.c`, `r_defs.h`, `r_things.h`, `r_bsp.c`, `p_spec.h`, `p_spec.c` | Límites del renderer y de plataformas/techos ampliados | Freedoom necesita un motor "limit-removing" |

## Pendiente

- Música (los temas están en formato MUS; hace falta un sintetizador OPL o MIDI).
- Controles táctiles para celular.
