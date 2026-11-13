# Wolfenstein 3D para navegador (Wolf4SDL)

[Wolf4SDL](https://github.com/KS-Presto/Wolf4SDL) (commit en
`UPSTREAM_COMMIT`): una adaptación del código fuente original de Wolfenstein
3D, que id Software liberó en 1995, a la biblioteca SDL2. Acá se compila a
WebAssembly con Emscripten.

Licencia del motor: **GPL-2.0** (ver `LICENSE-wolf4sdl`). Wolf4SDL se puede
compilar bajo dos licencias; se usa la variante GPL (`-DUSE_GPL`), porque la
otra depende de un sintetizador de música que no es libre.

## Compilar

Hace falta Emscripten (`emcc` en el PATH; probado con 7.0.0) y git.

```bash
npm run build:wolf3d
```

Deja `wolf3d.js` y `wolf3d.wasm` (1,5 MB) en `public/games/wolf3d/`. El
código no se copia al repo: `build.sh` clona el commit fijado, aplica
`patches/` y suma `opl_bridge.cpp`.

## Cambios al código original

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `patches/0001-puente-opl.patch` (`id_sd.c`) | Las llamadas al sintetizador de música pasan por tres funciones `OplBridge_*` | El sintetizador de DOSBox es C++ y este port de Wolf4SDL es C: con `-DUSE_GPL` no compilaba |
| `opl_bridge.cpp` (nuevo) | Define esas tres funciones | Es el puente: código C++ que se puede llamar desde C (`extern "C"`) |
| `patches/0002-itoa-sin-medir-buffer.patch` (`wl_def.h`) | `itoa` y `ltoa` escriben sin medir antes el destino | Medían con `strlen()` un texto sin inicializar. En una PC suele haber basura en esa memoria y funciona por casualidad; en WebAssembly hay ceros y los números de la barra de estado no se dibujaban |

## Cómo se conecta con la página

Corre en un iframe, como ScummVM (`src/runtimes/iframe.js` es el código
compartido). `public/games/wolf3d/play.js`:

1. Baja los ocho archivos del juego (`data/*.wl1`) y los copia al sistema de
   archivos en memoria. El motor los busca por nombre, en minúsculas, en su
   carpeta de trabajo.
2. Monta `/save-wolf3d` sobre IndexedDB y le pasa esa carpeta al motor
   (`--configdir`): ahí van la configuración y las partidas. Se guarda cada 5
   segundos y al salir.
3. Llama a `main()` con `--windowed` (sin eso el motor pide pantalla
   completa por su cuenta).

El juego es una cadena de bucles que esperan, así que se compila con
Asyncify, igual que Tyrian. Al elegir "Quit", el motor llama a `exit()` y
Emscripten avisa por `Module.onExit`.

`play.html?captura` conserva la imagen del canvas para sacar la portada.

## Datos del juego

Son los de **Wolfenstein 3D shareware 1.4** (Apogee, 1992): el primer
episodio completo. Salen de `1wolf14.zip`, el paquete original
(SHA-256 `c3d355ed9f887a94239140070b15d4042ec68a4a456171c2853edc04727b1171`),
que también se hospeda entero en `public/games/wolf3d/`. No se modifican;
solo se renombran a minúsculas.

| Archivo | SHA-256 |
|---|---|
| `audiohed.wl1` | `39351624ae6f8eef4b873e060c1a6f3e5ee7e81c4939c485275a89b145336338` |
| `audiot.wl1` | `1e2c9ae30398a14c61a4ddd39aabaa0dbcc984cc4924a3e51df75574c259cfb9` |
| `gamemaps.wl1` | `a6a6654b342f2c027bcb22bfce0a41f9fc0063b775e9e4da0c771970e53e11aa` |
| `maphead.wl1` | `3458f661c9b875bca99ea22a7267771fad8f2a33c699ea732cf7c3322909bf8c` |
| `vgadict.wl1` | `59878fec65f033b00dbb1240317d1793f5858213dc8013b4d68f9ac8b45b0c80` |
| `vgagraph.wl1` | `d5176f843c53415132db199c19f38591eaf3cedd35a4f7eb2698c1865d83030d` |
| `vgahead.wl1` | `f4cc800dc8444373092d4eaa5d6ab59d63d23a510a9d38b73ca9b3dbb700d18b` |
| `vswap.wl1` | `698f217257e2cbb951a4d110ba09140291f38d0121b3784d1d6be59c03a6b47b` |

### Licencia de los datos

El paquete trae `VENDOR.DOC` (copiado como `LICENSE-wolf3d-shareware.txt`).
Ese texto pone condiciones a quien lo distribuye **cobrando**, y define como
"no comercial" la distribución gratuita, que deja fuera de esas condiciones.
Así se repartió siempre el shareware: gratis y de mano en mano.

Conviene saberlo: el permiso para repartirlo gratis es **implícito**, no una
frase expresa como la de DOOM. Los datos no son software libre: no se pueden
modificar ni vender. Si el titular de los derechos pidiera retirarlos, se
retiran y el juego pasa a ser de "archivo propio con descarga" como Tyrian.

Los episodios 2 a 6 eran de pago y no se pueden sumar.

## Pendiente

- Girar con el mouse (el motor lo soporta con `--windowed-mouse`).
- Controles táctiles para celular.
- Escuchar el sonido con parlantes: se probó que arranca sin errores, no
  cómo suena.
