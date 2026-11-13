#!/usr/bin/env bash
# Compila Chocolate Heretic (parte de Chocolate Doom) a WebAssembly.
#
# Uso:   ./build.sh
# Salida: ../../public/games/heretic/heretic.js y heretic.wasm
#
# Requisitos: emcc en el PATH (probado con Emscripten 7.0.0) y git.
#
# El código no se copia al repo: se clona la versión de UPSTREAM_TAG en una
# carpeta de trabajo y se le aplica patches/. No se usa su CMake: se llama a
# emcc directo con la lista de archivos, y config.h se aporta desde acá.
set -euo pipefail

cd "$(dirname "$0")"
ENGINE_DIR="$(pwd)"
OUT_DIR="$ENGINE_DIR/../../public/games/heretic"
TAG="$(cat UPSTREAM_TAG)"
WORK="${HERETIC_WORK:-$HOME/.cache/allgamesports/chocolate-doom}"
SRC="$WORK/src"

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone --depth 1 --branch "$TAG" https://github.com/chocolate-doom/chocolate-doom.git "$SRC"
fi
git -C "$SRC" checkout -q -f "$TAG"
for patch in "$ENGINE_DIR"/patches/*.patch; do
  [ -e "$patch" ] || continue
  git -C "$SRC" apply --ignore-whitespace "$patch"
done
mkdir -p "$SRC/web" "$OUT_DIR"
cp "$ENGINE_DIR/config.h" "$SRC/web/config.h"
cd "$SRC"

# Fuentes: lo común a los cuatro juegos de Chocolate Doom, Heretic y las tres
# bibliotecas internas (opl: música, pcsound: parlante de PC, textscreen:
# pantallas de texto). Se dejan afuera el servidor dedicado y z_native.c, una
# variante del manejo de memoria que choca con z_zone.c.
SOURCES="$(ls src/*.c | grep -v -e d_dedicated.c -e z_native.c) src/heretic/*.c opl/*.c pcsound/*.c textscreen/*.c"

# DISABLE_SDL2NET: sin juego en red (el navegador no abre esas conexiones).
# ASYNCIFY: el juego es un bucle que espera; así puede cederle el control al
#   navegador en cada espera.
# STACK_SIZE: Emscripten reserva 64 KB de pila por defecto; se sube a 5 MB.
# INVOKE_RUN=0: play.js copia los datos del juego y recién ahí llama a main().
echo "[build] heretic.js + heretic.wasm"
# shellcheck disable=SC2086
emcc $SOURCES \
  -Iweb -Isrc -Isrc/heretic -Iopl -Ipcsound -Itextscreen \
  -O2 -Wno-everything \
  -DDISABLE_SDL2NET=1 \
  -sUSE_SDL=2 -sUSE_SDL_MIXER=2 -sSDL2_MIXER_FORMATS='[]' \
  -sASYNCIFY -sASYNCIFY_STACK_SIZE=131072 \
  -sSTACK_SIZE=5242880 \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINVOKE_RUN=0 \
  -sEXIT_RUNTIME=1 \
  -sENVIRONMENT=web \
  -sFORCE_FILESYSTEM -lidbfs.js \
  -sEXPORTED_FUNCTIONS='["_main"]' \
  -sEXPORTED_RUNTIME_METHODS='["FS","IDBFS","callMain"]' \
  --profiling-funcs \
  -o "$OUT_DIR/heretic.js"

ls -lh "$OUT_DIR"/heretic.js "$OUT_DIR"/heretic.wasm
