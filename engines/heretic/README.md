# Heretic para navegador (Chocolate Heretic)

[Chocolate Doom](https://github.com/chocolate-doom/chocolate-doom) (versión
en `UPSTREAM_TAG`) incluye Chocolate Heretic: el código fuente de Heretic que
Raven Software liberó, adaptado a SDL2 y fiel al original. Acá se compila a
WebAssembly con Emscripten.

Licencia del motor: **GPL-2.0** (ver `LICENSE-chocolate-doom.md`).

No se reutiliza el motor de Doom del catálogo (doomgeneric): Heretic comparte
la base, pero tiene su propio código de juego (inventario, volar, mirar
arriba y abajo).

## Compilar

Hace falta Emscripten (`emcc` en el PATH; probado con 7.0.0) y git.

```bash
npm run build:heretic
```

Deja `heretic.js` y `heretic.wasm` (2 MB) en `public/games/heretic/`. El
código no se copia al repo: `build.sh` clona la versión fijada y aplica
`patches/`.

No se usa el CMake del proyecto: `build.sh` llama a `emcc` con la lista de
archivos. `config.h`, que CMake generaría, está escrito a mano acá.

## Cambios al código original

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `patches/0001-sin-deteccion-opl.patch` (`opl/opl.c`) | En el navegador, `OPL_Detect` responde "hay chip OPL3" sin probarlo | La prueba programa un temporizador y se queda esperando a que el hilo de audio lo dispare. En el navegador hay un solo hilo: el audio no puede correr mientras el juego espera, y la página se colgaba al arrancar |
| `config.h` (nuevo) | Nombre y versión del programa | Lo generaría CMake |

Ese cuelgue es un "deadlock" clásico: dos partes del programa esperándose
entre sí. En una PC cada una corre en su hilo; en el navegador comparten uno.

Se compila con `-DDISABLE_SDL2NET=1`: sin juego en red.

## Cómo se conecta con la página

Corre en un iframe (`src/runtimes/iframe.js`), igual que Wolfenstein 3D.
`public/games/heretic/play.js`:

1. Baja `heretic1.wadgz`, lo descomprime y lo copia al sistema de archivos en
   memoria.
2. Monta `/save-heretic` sobre IndexedDB y le pasa esa carpeta al motor para
   la configuración y las partidas (`-savedir`, `-config`, `-extraconfig`).
   Se guarda cada 5 segundos y al salir.
3. Llama a `main()` con `-window` (sin eso el motor pide pantalla completa).

El juego es un bucle que espera, así que se compila con Asyncify. La música
es la original: el motor trae un emulador del chip OPL3 de las placas de
sonido de la época.

Al salir, el juego muestra la pantalla de despedida original del shareware y
espera una tecla; recién ahí termina.

`play.html?captura` conserva la imagen del canvas para sacar la portada.

## Datos del juego

**Heretic shareware 1.2** (Raven Software, publicado por id Software): el
primer episodio, "City of the Damned". Sale de `htic_v12.zip`, el paquete
original (SHA-256
`5ffbb47e4a5750fef144c312973ee5782266b4a63474b77478103b6c1aaed39d`), que
también se hospeda entero en `public/games/heretic/`.

`HERETIC1.WAD` (SHA-256
`3ab2f21828877e49e5eb3220785aaf8798050b7c4132003b5db7b8f3678bede4`) se sirve
sin modificar, comprimido con gzip como `heretic1.wadgz` (2,3 MB).

### Licencia de los datos

`LICENSE.DOC` del paquete (copiado como `LICENSE-heretic-shareware.txt`),
punto 3: se permite distribuir el software "por medios electrónicos" y sin
pagar regalías, siempre que vaya **comprimido**. Prohíbe venderlo,
modificarlo y cualquier uso comercial. Por eso el archivo se sirve
comprimido. Si algún día el sitio cobrara o tuviera publicidad, habría que
revisar esta licencia antes.

Los episodios 2 y 3 eran de pago y no se pueden sumar.

## Pendiente

- Escuchar el sonido y la música con parlantes: se probó que arranca sin
  errores, no cómo suena.
- Controles táctiles para celular.
