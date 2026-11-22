# Blasphemer para navegador (Crispy Heretic)

[Crispy Doom](https://github.com/fabiangreffrath/crispy-doom) (versión en
`UPSTREAM_TAG`) es una variante de Chocolate Doom que incluye Crispy Heretic:
el mismo código de Heretic, sin los límites del motor de 1994. Acá se
compila a WebAssembly con Emscripten para jugar
[Blasphemer](https://github.com/Blasphemer/blasphemer), el reemplazo libre
de los datos de Heretic.

Licencias: motor **GPL-2.0** (ver `LICENSE-crispy-doom.md`); Blasphemer
**BSD-3** (`COPYING-blasphemer.md` y `CREDITS-blasphemer.md`, al lado de los
datos en `public/games/crispy-heretic/`).

## Por qué no Chocolate Heretic

El catálogo ya tiene Chocolate Heretic (`engines/heretic`), fiel al original.
Con Blasphemer, en E1M2, a los pocos pasos cortó con
`R_FindPlane: no more visplanes`.

Un "visplane" es cada superficie de piso o techo distinta que se ve en
pantalla. El motor de 1994 les reserva lugar para 128 en un arreglo de
tamaño fijo, como un estacionamiento con 128 lugares: si un mapa pide uno
más, el juego aborta. Los mapas de Blasphemer están hechos para motores sin
ese techo ("limit-removing", dice su README). Crispy Heretic, cuando un
arreglo se llena, lo agranda al doble en vez de abortar (visplanes,
drawsegs), y sube los sprites visibles de 128 a 4096.

El Heretic shareware sigue en Chocolate Heretic: no se tocó lo que ya
andaba.

## Compilar

Corre en Linux (WSL), con el Emscripten 6.0.1 compartido.

```bash
wsl bash engines/crispy-heretic/build.sh
```

Deja `crispy-heretic.js` y `crispy-heretic.wasm` en
`public/games/crispy-heretic/`, y además arma los datos: baja Blasphemer
0.1.8, verifica el SHA-256 del zip y de sus textos de licencia, y guarda el
WAD sin modificar, comprimido con gzip (`blasphem.wadgz`).

Como en Heretic, no se usa el CMake del proyecto: `build.sh` llama a `emcc`
con la lista de archivos, y `config.h` está escrito a mano acá. El script
verifica que el tag siga apuntando al mismo commit y falla si queda una ruta
de la máquina dentro del `.wasm`.

**Trampa: no mover la caché de Emscripten (`EM_CACHE`).** SDL2, SDL2_mixer
y zlib son "ports": Emscripten los compila por su cuenta dentro de su caché,
sin los flags del proyecto (borra hasta `EMCC_CFLAGS`). Solo reemplaza por
`/emsdk/emscripten` las rutas que quedan debajo de su propia carpeta. Con la
caché afuera, los `assert` de SDL2 dejaban
`/home/<usuario>/.cache/.../ports/sdl2/...` dentro del `.wasm`. Con la caché
por defecto quedan como `/emsdk/emscripten/cache/ports/...`.

## Cambios al código original

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `patches/0001-sin-deteccion-opl.patch` (`opl/opl.c`) | En el navegador, `OPL_Detect` responde "hay chip OPL3" sin probarlo | El mismo cuelgue que en Chocolate Heretic: la prueba espera a un hilo de audio que en el navegador no existe aparte (ver `engines/heretic/README.md`) |
| `config.h` (nuevo) | Nombre y versión del programa, y zlib | Lo generaría CMake. zlib (port de Emscripten) sirve para mapas con nodos comprimidos |

Se compila con `-DDISABLE_SDL2NET=1` (sin juego en red), sin FluidSynth,
libsamplerate ni PNG, y sin el modo "truecolor" de Crispy.

## Detalles

- **El WAD se carga con `-iwad blasphem.wad`.** El motor lo reconoce como
  Heretic completo (con los episodios extra) porque Blasphemer trae el
  marcador `EXTENDED`.
- **Los nombres de episodios y mapas son los de Heretic** ("City of the
  Damned"...): el motor los tiene fijos en su código, y Blasphemer guarda los
  suyos en un lump `LANGUAGE` que solo leen motores más nuevos.
- **Partidas** en IndexedDB, en su propia base (`/save-blasphemer`).
- **Teclas:** las de Heretic, más las que Crispy suma por defecto: WASD y
  Bloq Mayús para correr siempre (`src/m_controls.c`).
- **Los trucos (`engage<e><m>` para saltar de mapa) leen el carácter
  tipeado**, que SDL arma con el evento `keypress`. En pruebas automáticas
  con eventos sintéticos no entran; con tipeo real, sí.

## Qué se probó

Los 25 mapas de los tres episodios jugables (salto con `engage`, avanzar y
girar), con la consola de Crispy a la vista. Sus avisos muestran lo que
Chocolate no podía: visplanes hasta 512 (el original, 128), drawsegs hasta
2048 (256) y sprites visibles hasta 512 (128). Ningún error. También:
guardar (F2), recargar la página y cargar (F3) en E3M8, pausa (el audio pasa
a `suspended`) y salir con F10.
