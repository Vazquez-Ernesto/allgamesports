#!/usr/bin/env bash
# Compila binjgb (emulador de Game Boy y Game Boy Color) a WebAssembly.
#
# Uso:   ./build.sh
# Salida: ../../public/games/gameboy/binjgb.js y binjgb.wasm
#
# Requisitos: emcc en el PATH (probado con Emscripten 7.0.0) y git.
#
# El código no se copia al repo: se clona el commit de UPSTREAM_COMMIT en una
# carpeta de trabajo. No lleva parches: se compila solo el núcleo del emulador
# (sin su interfaz) y se exportan las funciones de su lista exported.json.
set -euo pipefail

cd "$(dirname "$0")"
OUT_DIR="$(pwd)/../../public/games/gameboy"
COMMIT="$(cat UPSTREAM_COMMIT)"
WORK="${BINJGB_WORK:-$HOME/.cache/allgamesports/binjgb}"
SRC="$WORK/src"

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone https://github.com/binji/binjgb.git "$SRC"
fi
git -C "$SRC" checkout -q "$COMMIT"

mkdir -p "$OUT_DIR"
cd "$SRC"

# FILESYSTEM=0: el juego y la partida se pasan por memoria, no por archivos.
# MODULARIZE: binjgb.js define la función global Binjgb(), que crea el módulo.
echo "[build] binjgb.js + binjgb.wasm"
emcc src/memory.c src/common.c src/emulator.c src/joypad.c src/rewind.c src/emscripten/wrapper.c \
  -Isrc -O2 -Wno-everything \
  -sEXPORTED_FUNCTIONS=@src/emscripten/exported.json \
  -sEXPORTED_RUNTIME_METHODS='["HEAP8","HEAPU8"]' \
  -sMALLOC=emmalloc \
  -sENVIRONMENT=web \
  -sFILESYSTEM=0 \
  -sEXIT_RUNTIME=0 \
  -sALLOW_MEMORY_GROWTH=1 \
  -sMODULARIZE=1 \
  -sEXPORT_NAME=Binjgb \
  --profiling-funcs \
  -o "$OUT_DIR/binjgb.js"

ls -lh "$OUT_DIR"/binjgb.js "$OUT_DIR"/binjgb.wasm
