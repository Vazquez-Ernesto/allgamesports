#!/usr/bin/env bash
# Compila OpenJazz (motor libre de Jazz Jackrabbit) a WebAssembly.
#
# Corre en Linux. En Windows, desde la raíz del repo:
#   wsl bash engines/openjazz/build.sh
# Requisitos: git, cmake, make y python3.
#
# El código no se copia al repo: se clona la versión de UPSTREAM_TAG en una
# carpeta de trabajo y se le aplica patches/. OpenJazz ya trae soporte para
# Emscripten en su CMake; el parche solo cambia cómo se enlaza.
#
# Salida: ../../public/games/openjazz/openjazz.js y openjazz.wasm
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/openjazz"
TAG="$(cat UPSTREAM_TAG)"
EMSDK_VERSION=6.0.1
# El mismo Emscripten sirve para OpenTTD: se instala una sola vez.
EMSDK="${EMSDK_DIR:-$HOME/.cache/allgamesports/emsdk-$EMSDK_VERSION}"
WORK="${OPENJAZZ_WORK:-$HOME/.cache/allgamesports/openjazz}"
SRC="$WORK/src"

if [ ! -d "$EMSDK" ]; then
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK"
  "$EMSDK/emsdk" install "$EMSDK_VERSION"
  "$EMSDK/emsdk" activate "$EMSDK_VERSION"
fi
# shellcheck disable=SC1091
source "$EMSDK/emsdk_env.sh"

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone --depth 1 --branch "$TAG" https://github.com/AlisterT/openjazz.git "$SRC"
fi
git -C "$SRC" checkout -q -- .
for patch in "$HERE"/patches/*.patch; do
  echo "[patch] $(basename "$patch")"
  git -C "$SRC" apply --ignore-whitespace "$patch"
done

# NETWORK=OFF: sin juego en red (el navegador no abre esas conexiones).
echo "[build] openjazz.js + openjazz.wasm"
mkdir -p "$SRC/build-web" "$OUT_DIR"
cd "$SRC/build-web"
# -ffile-prefix-map: que no quede la ruta de esta máquina en el .wasm (los
# assert y los mensajes de error guardan la ruta de su archivo fuente).
MAP="-ffile-prefix-map=$SRC/="
emcmake cmake .. -DCMAKE_BUILD_TYPE=Release -DNETWORK=OFF \
  -DCMAKE_C_FLAGS="$MAP" -DCMAKE_CXX_FLAGS="$MAP"
# make no sabe que cambiaron las opciones de enlace: se borra la salida.
rm -f openjazz.js openjazz.wasm
emmake make -j"${JOBS:-4}"

cp openjazz.js openjazz.wasm "$OUT_DIR/"
if grep -q "$HOME" "$OUT_DIR/openjazz.wasm" "$OUT_DIR/openjazz.js"; then
  echo "ERROR: quedó una ruta de esta máquina en el motor"; exit 1
fi
ls -lh "$OUT_DIR"/openjazz.js "$OUT_DIR"/openjazz.wasm
