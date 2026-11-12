# Emulador de Game Boy para navegador (binjgb)

[binjgb](https://github.com/binji/binjgb) (commit en `UPSTREAM_COMMIT`),
un emulador de Game Boy y Game Boy Color escrito en C, compilado a
WebAssembly con Emscripten.

Licencia: **MIT** (ver `LICENSE-binjgb`).

## Por qué hay un emulador en este proyecto

El resto del catálogo son juegos cuyo código se compila directo a
WebAssembly. Un juego de consola está hecho para el procesador de esa
consola: para que corra en el navegador, algo tiene que imitarla. Acá lo que
se compila es la consola, y el juego es el archivo original (la "ROM").

Se usa solo con **juegos caseros** (homebrew): hechos por aficionados y
publicados gratis por sus autores, con una licencia que permite repartirlos.
Nunca con juegos comerciales.

## Compilar

Hace falta Emscripten (`emcc` en el PATH; probado con 7.0.0) y git.

```bash
npm run build:gameboy
```

Deja `binjgb.js` y `binjgb.wasm` (92 KB) en `public/games/gameboy/`. El
código no se copia al repo: `build.sh` clona el commit fijado. No lleva
parches. Se compila solo el núcleo del emulador, sin su interfaz.

## Cómo se conecta con la página

El emulador no sabe de pantallas ni de teclados. `src/runtimes/gameboy/`:

| Archivo | Qué hace |
|---|---|
| `index.js` | Carga el juego en la memoria del emulador, lo hace avanzar en cada cuadro, copia la imagen (160x144) al canvas, manda el audio a Web Audio y guarda la partida |
| `input.js` | Teclado y mando → botones de la consola |

La partida guardada es la memoria del cartucho. Se revisa una vez por
segundo si cambió y se guarda en el navegador (OPFS), un archivo por juego.

## Juegos

Están en `public/games/gameboy/roms/`, con su licencia al lado:

| Juego | Versión | Origen | Licencia | SHA-256 |
|---|---|---|---|---|
| Libbet and the Magic Floor | 0.08 | github.com/pinobatch/libbet (release) | zlib | `3607412031c8287cf878299ce96e581e85b852dde703806343b95576fa3ff1a9` |
| µCity | 1.3 | github.com/AntonioND/ucity (release) | GPL-3.0 o posterior | `9422ee2ca7b7ea1d46b58b2a429fff3f354dfd3e732dee1e7ae6220f148ce6e0` |

Para sumar un juego: verificar que su licencia permita repartirlo, bajar el
archivo que publica su autor, copiar su licencia, agregar la entrada en
`src/data/games.js` (motor `gameboy`) y capturar su portada.

## Pendiente

- Tobu Tobu Girl Deluxe (código MIT, arte CC BY 4.0): su autor lo distribuye
  solo por itch.io, sin descarga directa. Hay que bajarlo a mano o compilarlo.
- Controles táctiles para celular.
