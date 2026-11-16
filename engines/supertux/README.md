# SuperTux 0.7.0

SuperTux (GPL-3.0) compilado a WebAssembly. El código no se copia al repo:
`build.sh` baja el paquete de fuentes de la versión de `UPSTREAM_VERSION`,
comprueba su SHA-256 y aplica `patches/`.

## Cómo se compila

En Linux (en Windows, WSL). Hace falta `git`, `cmake`, `python3` y el
Emscripten 6.0.1 compartido (`~/.cache/allgamesports/emsdk-6.0.1`).

```bash
bash engines/supertux/build.sh        # motor: supertux2.js + supertux2.wasm
JOBS=2 bash engines/supertux/prepare-data.sh   # datos (vorbis-tools y optipng)
```

`build.sh` clona vcpkg y compila con él las bibliotecas (PhysFS, FreeType,
libpng, Vorbis...) para `wasm32-emscripten`. La primera vez tarda bastante;
después quedan en caché.

## Parches

| Parche | Qué cambia y por qué |
|---|---|
| `0001-enlace-sin-datos` | Saca `--preload-file` del enlace: los datos van aparte, en varios paquetes de menos de 100 MB (GitHub no acepta archivos más grandes). Exporta `addRunDependency` y `removeRunDependency`, que `play.js` usa para esperar el guardado. |
| `0002-physfs-argv0` | SuperTux arranca PhysFS sin nombre de programa. En Linux, PhysFS lo saca de `/proc/self/exe`, que en el navegador no existe, y falla sin decir por qué ("no error"). |
| `0003-datos-en-data` | En el navegador, SuperTux busca los datos en la carpeta donde se compiló. El parche la fija en `/data`, donde los dejan los paquetes. |

Además, `build.sh` pasa tres opciones a CMake:

- `-DEMSCRIPTEN`: el código pregunta por `EMSCRIPTEN` en unos lugares y por
  `__EMSCRIPTEN__` en otros. Emscripten moderno solo define la segunda, y sin
  la primera los bloques para navegador quedan apagados en silencio.
- `-ffile-prefix-map`: los mensajes de log llevan la ruta del archivo fuente;
  así no queda grabada la ruta de la máquina donde se compiló.
- `USE_STATIC_SIMPLESQUIRREL=ON`: si SimpleSquirrel se arma como `.so`, el
  enlazador pasa a modo dinámico y pide código `-fPIC`.

## Datos

`prepare-data.sh` arma cuatro paquetes con `file_packager` de Emscripten
(`public/games/supertux/data/`): `imagenes-1`, `imagenes-2`, `musica` y
`resto`. Unos 162 MB en total; el motor suma 7,5 MB.

Cambios respecto de los datos originales (la licencia exige avisarlos):

- La música (OGG Vorbis) se recomprimió a calidad 0 (unos 64 kbit/s).
- Los PNG se optimizaron con `optipng`, sin pérdida de calidad.
- Se sacaron las fuentes para chino, japonés y coreano y las traducciones
  que no son al español.

Los niveles, scripts y sonidos no se tocaron.

## Licencias

- Motor: GPL-3.0 (`public/games/supertux/LICENSE-supertux.txt`).
- Niveles y mapas: cada archivo declara la suya. Los 110 niveles y 6 mapas
  incluidos son CC-BY-SA 4.0 o GPL 2+ / CC-BY-SA 3.0.
- Gráficos, música y sonidos: detallados por archivo en
  `public/games/supertux/AUTHORS-supertux.txt`. La mayoría es GPL 2+ y
  CC-BY-SA; algunos son CC-BY o CC0. Las imágenes de la cinta
  transportadora (`images/objects/conveyor_belt`) y el sonido `kill.wav` son
  CC BY-NC 4.0: se pueden repartir sin fines comerciales, como este sitio.

## Cómo corre en la página

`public/games/supertux/play.html` carga `play.js`, los cuatro paquetes y el
motor, en ese orden. `play.js`:

- monta el guardado en IndexedDB (`/home/web_user/.local/share/supertux2`)
  antes de `main()`. El motor intenta montarlo solo, pero ese código está
  roto;
- define las funciones `window.supertux_*` que el motor llama (aviso de
  listo, guardar, ajustar al tamaño de la ventana);
- junta los `AudioContext` del juego para que la pausa del reproductor los
  pueda callar.

El bucle lo maneja el navegador (`emscripten_set_main_loop`): el runtime usa
`pausesMainLoop: true`. En la web no hay botón de salir.
