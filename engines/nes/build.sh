#!/usr/bin/env bash
# Compila binjnes (emulador de NES) a WebAssembly.
#
# Uso:   ./build.sh
# Salida: ../../public/games/nes/binjnes.js y binjnes.wasm
#
# Requisitos: emcc en el PATH (probado con Emscripten 7.0.0) y git.
#
# El código no se copia al repo: se clona el commit de UPSTREAM_COMMIT en una
# carpeta de trabajo. No lleva parches: se compila solo el núcleo del emulador
# (sin su interfaz) y se exportan las funciones de su lista exported.json.
# Es el mismo esquema que engines/gameboy (binjgb, del mismo autor).
set -euo pipefail

cd "$(dirname "$0")"
OUT_DIR="$(pwd)/../../public/games/nes"
COMMIT="$(cat UPSTREAM_COMMIT)"
WORK="${BINJNES_WORK:-$HOME/.cache/allgamesports/binjnes}"
SRC="$WORK/src"

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone https://github.com/binji/binjnes.git "$SRC"
fi
git -C "$SRC" checkout -q "$COMMIT"

mkdir -p "$OUT_DIR"
cd "$SRC"

# FILESYSTEM=0: el juego y la partida se pasan por memoria, no por archivos.
# MODULARIZE: binjnes.js define la función global Binjnes(), que crea el módulo.
# HEAPF32: el audio sale como números con coma (float), no como bytes.
# BINJNES_CLANG: el CMake del proyecto avisa así qué compilador se usa
#   (emcc es clang); acá no se usa su CMake, así que se pasa a mano.
echo "[build] binjnes.js + binjnes.wasm"
emcc src/memory.c src/cartdb.c src/emulator.c src/joypad.c src/rewind.c src/emscripten/wrapper.c \
  -Isrc -O2 -Wno-everything -DBINJNES_CLANG \
  -sEXPORTED_FUNCTIONS=@src/emscripten/exported.json \
  -sEXPORTED_RUNTIME_METHODS='["HEAPU8","HEAPF32"]' \
  -sMALLOC=emmalloc \
  -sENVIRONMENT=web \
  -sFILESYSTEM=0 \
  -sEXIT_RUNTIME=0 \
  -sALLOW_MEMORY_GROWTH=1 \
  -sMODULARIZE=1 \
  -sEXPORT_NAME=Binjnes \
  --profiling-funcs \
  -o "$OUT_DIR/binjnes.js"

ls -lh "$OUT_DIR"/binjnes.js "$OUT_DIR"/binjnes.wasm
