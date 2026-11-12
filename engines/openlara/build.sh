#!/usr/bin/env bash
# Compila OpenLara (motor de Tomb Raider) a WebAssembly con Emscripten.
#
# Uso:   ./build.sh
# Salida: ../../public/games/openlara/openlara.js y openlara.wasm
#
# Requisitos: emcc en el PATH (probado con Emscripten 7.0.0) y git.
#
# Como con ScummVM, el código no se copia al repo: se clona el commit de
# UPSTREAM_COMMIT en una carpeta de trabajo. No lleva parches.
set -euo pipefail

cd "$(dirname "$0")"
OUT_DIR="$(pwd)/../../public/games/openlara"
COMMIT="$(cat UPSTREAM_COMMIT)"
WORK="${OPENLARA_WORK:-$HOME/.cache/allgamesports/openlara}"
SRC="$WORK/src"

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone https://github.com/XProger/OpenLara.git "$SRC"
fi
git -C "$SRC" checkout -q "$COMMIT"

mkdir -p "$OUT_DIR"
cd "$SRC/src/platform/web"

# INVOKE_RUN=0: main() se llama después de escribir los archivos del jugador.
# DISABLE_DEPRECATED_FIND_EVENT_TARGET_BEHAVIOR=0: el port web de OpenLara
#   registra teclado y canvas con el destino "0", una forma vieja que el
#   Emscripten actual desactiva por defecto. Sin esto no hay teclado.
# --profiling-funcs: nombres de funciones en el .wasm, para leer errores.
echo "[build] openlara.js + openlara.wasm"
em++ main.cpp ../../libs/stb_vorbis/stb_vorbis.c ../../libs/tinf/tinflate.c \
  -O2 -ffast-math -std=c++11 -Wno-everything -I../../ \
  -sALLOW_MEMORY_GROWTH=1 \
  -sMAX_WEBGL_VERSION=2 \
  -sINVOKE_RUN=0 \
  -sDISABLE_DEPRECATED_FIND_EVENT_TARGET_BEHAVIOR=0 \
  --profiling-funcs \
  -sEXPORTED_FUNCTIONS='["_main","_snd_fill","_set_def_lang","_change_fs_mode","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["ccall","getValue","FS","callMain"]' \
  -o "$OUT_DIR/openlara.js"

ls -lh "$OUT_DIR"/openlara.js "$OUT_DIR"/openlara.wasm
