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
| Shock Lobster | — | Homebrew Hub (github.com/tbsp/shock-lobster) | zlib | `f14efd0340903b1b00d7e8b4b39687d4bc33355ac7742267ccfddfe92f54a611` |
| 2048 | — | Homebrew Hub (github.com/Sanqui/2048-gb) | zlib | `3ea2376b15b34bd26b10e6b31d2753bf8b086098dbdb5ee84d9c0f03d66d3d7f` |
| Carazu | — | Homebrew Hub (github.com/mholtkamp/carazu) | GPL-3.0 | `eef9dea9ecba15be7b21f3495e8c8bad937a0b2245cac09eec8baf61dfc91fb5` |
| Tobu Tobu Girl Deluxe | — | Homebrew Hub (github.com/SimonLarsen/tobutobugirl-dx) | Código MIT, arte CC BY 4.0 | `0a0e8018dbbc8d7f8cd99f05e7cdc7b4cc9e358ecfe9377ebfb2291a84c6e310` |
| Big2Small | 1.0.0 | github.com/mdsteele/big2small (release) | GPL-3.0 o posterior | `59c096333f93c12c8eb25a5fcffa2be15001abcd5d20b9a82c2bc2dae7e625b2` |
| Geometrix | 1.0.0 | Homebrew Hub (github.com/AntonioND/geometrix) | GPL-3.0 o posterior | `f13575af6bf87003c3eef8c2cab67a49ca6b02aa23ff6a31a38beb96d6eb1795` |
| GB-Wordyl | 0.85 (inglés) | Homebrew Hub (github.com/bbbbbr/gb-wordle) | GPL-3.0 | `acc12e3e920e0c432606846da60a5ca9bba21f8012304e8de4a26f88273d14de` |

Descartados al leer la licencia completa: **Tuff** (código MIT, pero gráficos
y mapas con todos los derechos reservados) y **Renegade Rush** (código MIT,
con paquetes de arte de terceros sin licencia clara).

[Homebrew Hub](https://hh.gbdev.io) es el catálogo de la comunidad de Game
Boy: guarda el archivo de cada juego y su licencia declarada. Los archivos se
bajan de `https://hh3.gbdev.io/static/database-gb/entries/<juego>/<archivo>`
y la licencia se confirma siempre en el repositorio del autor.

Para sumar un juego: verificar que su licencia permita repartirlo, bajar el
archivo que publica su autor, copiar su licencia, agregar la entrada en
`src/data/games.js` (motor `gameboy`) y capturar su portada.

## Pendiente

- Más juegos: Homebrew Hub lista decenas con licencia libre
  (`https://hh3.gbdev.io/api/search?tags=Open%20Source&typetag=game`).
- Controles táctiles para celular.
