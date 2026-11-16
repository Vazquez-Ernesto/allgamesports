# Emulador de NES para navegador (binjnes)

[binjnes](https://github.com/binji/binjnes) (commit en `UPSTREAM_COMMIT`),
un emulador de Nintendo Entertainment System escrito en C, compilado a
WebAssembly con Emscripten. Es del mismo autor que binjgb, el de Game Boy
(`engines/gameboy`), y se usa igual.

Licencia: **MIT** (ver `LICENSE-binjnes`).

Se usa solo con **juegos caseros** (homebrew): hechos por aficionados y
publicados gratis por sus autores, con una licencia que permite repartirlos.
Nunca con juegos comerciales.

## Compilar

Hace falta Emscripten (`emcc` en el PATH; probado con 7.0.0) y git.

```bash
npm run build:nes
```

Deja `binjnes.js` y `binjnes.wasm` (233 KB) en `public/games/nes/`. El código
no se copia al repo: `build.sh` clona el commit fijado. No lleva parches. Se
compila solo el núcleo del emulador, sin su interfaz.

No se usa el CMake del proyecto, así que `build.sh` pasa a mano
`-DBINJNES_CLANG`, la marca con la que ese CMake avisa qué compilador se usa.

## Cómo se conecta con la página

| Archivo | Qué hace |
|---|---|
| `src/runtimes/nes/index.js` | Carga el juego en la memoria del emulador, lo hace avanzar en cada cuadro, copia la imagen (256x240) al canvas, manda el audio a Web Audio y guarda la partida |
| `src/runtimes/consoleInput.js` | Teclado y mando → botones del control (compartido con Game Boy) |

Diferencias con el de Game Boy: el tiempo se le pide en segundos; la imagen
hay que convertirla a colores RGBA antes de copiarla; y el audio sale por un
solo canal (mono), como números con coma.

La partida guardada es la memoria con pila del cartucho. Se revisa una vez
por segundo si cambió y se guarda en el navegador (OPFS), un archivo por
juego. Los cartuchos sin pila no guardan nada.

Hay **dos controles**, como en la consola:

| Botón | Jugador 1 | Jugador 2 |
|---|---|---|
| Cruz | Flechas | Y (arriba), G (izquierda), H (abajo), J (derecha) |
| A | X | L |
| B | Z | K |
| Start | Enter | O |
| Select | Shift | I |

Las teclas del jugador 2 son las que eligió el autor del emulador en su
propia demo. Con mandos, el primero conectado es el jugador 1 y el segundo,
el jugador 2. Game Boy usa el mismo archivo con un solo control.

## Tipos de cartucho

Cada cartucho de NES traía sus propios chips, y el emulador tiene que imitar
los de cada tipo ("mapper"). binjnes soporta unos cincuenta. Antes de sumar
un juego, mirar el suyo: está en el byte 6 y 7 del archivo.

## Juegos

Están en `public/games/nes/roms/`, con su licencia al lado:

| Juego | Origen | Licencia | Cartucho | SHA-256 |
|---|---|---|---|---|
| Nova the Squirrel | Homebrew Hub (github.com/NovaSquirrel/NovaTheSquirrel) | Código GPL-3.0 o posterior; gráficos y niveles CC BY-NC-SA 4.0 | 1 (MMC1), con pila | `e4780e90b9d1587489bfb797d2ca395be21371ea9262fa9f87f99324ec6960ab` |
| Thwaite 0.04a | Homebrew Hub (github.com/pinobatch/thwaite-nes) | GPL-3.0 o posterior | 0 (NROM) | `80e0918ea17577477c2f1b16beefadf457f207931ffbeae7612d8d230f999843` |
| Concentration Room | Homebrew Hub (github.com/pinobatch/croom-nes) | GPL-3.0 o posterior | 0 (NROM) | `9b0b1e9b14b07a2e69db287e04f711e16af42b6cc85523b66bdfa640df80507a` |
| RHDE: Furniture Fight | Homebrew Hub (github.com/pinobatch/rhde-nes) | GNU All-Permissive | 0 (NROM) | `b2c4748a5b3651e393572046daf126213653b58b55472cdfdf4b863834dd0241` |

**Nova the Squirrel** tiene arte con licencia no comercial: se puede repartir
gratis con atribución, no vender. Si algún día el sitio cobrara o tuviera
publicidad, habría que revisarlo. El autor tampoco permite usar al personaje
en otra cosa.

**RHDE** es solo para dos jugadores: entró cuando se sumó el segundo control.

Los archivos se bajan de
`https://hh3.gbdev.io/static/database-nes/entries/<juego>/<archivo>` y la
licencia se confirma siempre en el repositorio del autor.

Para sumar un juego: verificar que su licencia permita repartirlo (código y
arte) y que su tipo de cartucho esté soportado; bajar el archivo que publica su autor, copiar su licencia,
agregar la entrada en `src/data/games.js` (motor `nes`) y capturar su portada.

## Pendiente

- Más juegos: Homebrew Hub lista más de veinte de NES
  (`https://hh3.gbdev.io/api/search?platform=NES`), pero la mayoría no
  declara licencia; hay que revisarlos uno por uno.
- Escuchar el sonido con parlantes.
- Controles táctiles para celular.
