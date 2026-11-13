#!/usr/bin/env bash
# Compila Wolf4SDL (el motor de Wolfenstein 3D) a WebAssembly.
#
# Uso:   ./build.sh
# Salida: ../../public/games/wolf3d/wolf3d.js y wolf3d.wasm
#
# Requisitos: emcc en el PATH (probado con Emscripten 7.0.0) y git.
#
# El código no se copia al repo: se clona el commit de UPSTREAM_COMMIT en una
# carpeta de trabajo, se le aplica patches/ y se le suma opl_bridge.cpp.
set -euo pipefail

cd "$(dirname "$0")"
ENGINE_DIR="$(pwd)"
OUT_DIR="$ENGINE_DIR/../../public/games/wolf3d"
COMMIT="$(cat UPSTREAM_COMMIT)"
WORK="${WOLF3D_WORK:-$HOME/.cache/allgamesports/wolf4sdl}"
SRC="$WORK/src"

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone https://github.com/KS-Presto/Wolf4SDL.git "$SRC"
fi
git -C "$SRC" checkout -q -f "$COMMIT"
for patch in "$ENGINE_DIR"/patches/*.patch; do
  git -C "$SRC" apply --ignore-whitespace "$patch"
done
cp "$ENGINE_DIR/opl_bridge.cpp" "$SRC/"

mkdir -p "$OUT_DIR"
cd "$SRC"

# USE_GPL: sintetizador de música de DOSBox (GPL) en vez del de MAME (no libre).
# UPLOAD + CARMACIZED + VERSIONALREADYCHOSEN: la versión shareware 1.4.
# ASYNCIFY: el juego es una cadena de bucles que esperan; así pueden cederle
#   el control al navegador en cada espera.
# STACK_SIZE: Emscripten reserva 64 KB de pila por defecto; se sube a 5 MB.
# INVOKE_RUN=0: play.js copia los datos del juego y recién ahí llama a main().
echo "[build] wolf3d.js + wolf3d.wasm"
emcc opl_bridge.cpp dosbox/dbopl.cpp id_*.c signon.c wl_*.c \
  -O2 -Wno-everything \
  -DUSE_GPL -DVERSIONALREADYCHOSEN -DCARMACIZED -DUPLOAD \
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
  -o "$OUT_DIR/wolf3d.js"

ls -lh "$OUT_DIR"/wolf3d.js "$OUT_DIR"/wolf3d.wasm
