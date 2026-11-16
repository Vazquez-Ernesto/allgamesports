# Rise of the Triad para navegador (taradino)

[taradino](https://github.com/fabiangreffrath/taradino) (versión en
`UPSTREAM_TAG`): una adaptación a SDL2 del código fuente original de Rise of
the Triad, que Apogee liberó en 2002. Acá se compila a WebAssembly con
Emscripten.

Licencia del motor: **GPL-2.0 o posterior** (ver `LICENSE-taradino`).

## Compilar

Hace falta Emscripten (`emcc` en el PATH; probado con 7.0.0), git, curl y
unzip.

```bash
npm run build:rott
```

Baja el shareware, verifica su SHA-256 y deja en `public/games/rott/`:
`rott.js`, `rott.wasm` (2,1 MB), `rott.data` (7,8 MB, los datos del juego)
y `1rott13.zip` (el paquete original).

No se usa el CMake del proyecto: `build.sh` llama a `emcc` con todos los
archivos de `rott/` y arma a mano `version.h`, que CMake generaría.

## Cambios al código original

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `patches/0001-ceder-al-leer-teclado.patch` (`rott/rt_in.c`) | Al leer el teclado (`IN_PumpEvents`), cede el control al navegador cada 8 ms como máximo | Muchos bucles del juego esperan una tecla leyendo el teclado sin parar. En DOS la tecla llegaba por una interrupción del hardware; en el navegador solo llega cuando el programa le devuelve el control. Sin esto, el cartel de "¿Seguro?" congelaba la página entera |

Y una opción de compilación, sin tocar el código:

- `-sEMULATE_FUNCTION_POINTER_CASTS`: el menú guarda funciones de distintos
  tipos en una "unión" y las llama todas como si recibieran un `int`. En DOS
  funcionaba de casualidad; WebAssembly verifica el tipo en cada llamada por
  puntero y cortaba el juego al elegir "New Game" ("function signature
  mismatch"). Esta opción hace que Emscripten tolere esas llamadas.

## Cómo se conecta con la página

Corre en un iframe (`src/runtimes/iframe.js`), con SDL2 y Asyncify, igual
que Wolfenstein 3D y Heretic. `public/games/rott/play.js`:

1. Monta `/libsdl/taradino` sobre IndexedDB: ahí guarda taradino su
   configuración y sus partidas (lo que SDL llama "carpeta de
   preferencias"). Se monta esa subcarpeta y no `/libsdl` entero, que
   también usa Duke Nukem II: la ruta de montaje le da nombre a la base.
2. Arranca `main()` con `/data` (los datos del juego) como carpeta actual y
   la opción `WINDOW`.

Al salir, el shareware muestra una pantalla final y espera una tecla.

`play.html?captura` conserva la imagen del canvas para sacar la portada.

## Datos del juego

**Rise of the Triad: The HUNT Begins**, shareware 1.3 (Apogee Software,
1995): el primer episodio. Sale de `1rott13.zip`, el paquete original
(SHA-256 `eea67a85845d52fa0ee7272e3ae24b79769ed1e8bdff7b1360904078bc51ad1e`),
bajado de classicdosgames.com. Adentro trae un instalador (`ROTTSW13.SHR`)
que es, a su vez, un `.zip` con los archivos del juego. Todos van dentro de
`rott.data`, sin modificar.

### Licencia de los datos

`VENDOR.DOC`, que viene en el paquete (copiado como
`LICENSE-rott-shareware.txt`). Es del mismo tipo que la de Duke Nukem II:

- "Todos pueden, y se los alienta, a copiar, subir y pasar este Programa sin
  cobrar por él."
- Distribuirlo por servicio en línea no necesita permiso escrito.
- Hay que incluir todos los archivos tal como se publicaron, sin
  modificarlos, y nombrar a Apogee.
- Solo vale para la versión shareware, con el episodio 1.

No es software libre. Si el titular de los derechos pidiera retirarlo, se
retira.

## Pendiente

- **Música.** El juego la trae en formato MIDI y el SDL_mixer de Emscripten
  no tiene con qué tocarla ("No Soundfont found"). taradino puede usar
  libADLMIDI, que imita el chip de sonido de la época; habría que compilarla
  también.
- Escuchar los efectos de sonido con parlantes.
- Disparar con Ctrl puede chocar con atajos del navegador (Ctrl+W).
- Controles táctiles para celular.
