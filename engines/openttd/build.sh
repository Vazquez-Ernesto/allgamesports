#!/usr/bin/env bash
# Compila OpenTTD a WebAssembly, con los gráficos libres OpenGFX adentro.
#
# Corre en Linux. En Windows, desde la raíz del repo:
#   wsl bash engines/openttd/build.sh
# Requisitos: git, cmake, make, g++, python3, unzip y curl.
#
# El código de OpenTTD no se copia al repo: se clona la versión de
# UPSTREAM_TAG en una carpeta de trabajo. Se compila dos veces:
#   1. "host": unas herramientas chicas que corren en esta máquina y generan
#      archivos que el juego necesita (tablas, textos traducidos).
#   2. "web": el juego en sí, con Emscripten.
#
# Salida: ../../public/games/openttd/openttd.js, .wasm y .data
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/openttd"
TAG="$(cat UPSTREAM_TAG)"
EMSDK_VERSION=6.0.1   # la que usa OpenTTD en su Dockerfile oficial
OPENGFX_VERSION=8.0
WORK="${OPENTTD_WORK:-$HOME/.cache/allgamesports/openttd}"
SRC="$WORK/src"
EMSDK="$WORK/emsdk"
JOBS="${JOBS:-3}"     # cada compilador de C++ usa cerca de 1 GB de memoria

if [ ! -d "$EMSDK" ]; then
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK"
  "$EMSDK/emsdk" install "$EMSDK_VERSION"
  "$EMSDK/emsdk" activate "$EMSDK_VERSION"
fi
# shellcheck disable=SC1091
source "$EMSDK/emsdk_env.sh"

if [ ! -d "$SRC" ]; then
  git clone --depth 1 --branch "$TAG" https://github.com/OpenTTD/OpenTTD.git "$SRC"
fi
git -C "$SRC" checkout -q -- .
for patch in "$HERE"/patches/*.patch; do
  [ -e "$patch" ] || continue
  echo "[patch] $(basename "$patch")"
  git -C "$SRC" apply "$patch"
done
cp "$HERE/pre.js" "$SRC/os/emscripten/pre.js"

# OpenTTD lee partidas comprimidas con LZMA; Emscripten no trae esa
# biblioteca y OpenTTD aporta la receta para bajarla y compilarla.
cp "$SRC/os/emscripten/ports/liblzma.py" "$EMSDK/upstream/emscripten/tools/ports/contrib/liblzma.py"

echo "[build] herramientas de host"
mkdir -p "$SRC/build-host"
cd "$SRC/build-host"
cmake .. -DOPTION_TOOLS_ONLY=ON
make -j"$JOBS" tools

echo "[build] juego"
mkdir -p "$SRC/build/baseset"
cd "$SRC/build"
if [ ! -f baseset/opengfx/ogfx1_base.grf ]; then
  curl -sSL -o "$WORK/opengfx.zip" \
    "https://cdn.openttd.org/opengfx-releases/$OPENGFX_VERSION/opengfx-$OPENGFX_VERSION-all.zip"
  unzip -q -o "$WORK/opengfx.zip" -d "$WORK"
  mkdir -p baseset/opengfx
  tar -xf "$WORK/opengfx-$OPENGFX_VERSION.tar" -C baseset/opengfx --strip-components=1
fi
# Que no quede la ruta de esta máquina en el .wasm:
# -ffile-prefix-map: NOT_REACHED y otros avisos guardan la ruta de su fuente.
# GLOBAL_DIR: la carpeta de datos "global" se graba en el programa; por
#   defecto sale del sysroot de Emscripten, que está dentro de $HOME. En el
#   navegador no existe: se usa la ruta estándar de Linux.
MAP="-ffile-prefix-map=$SRC/="
emcmake cmake .. -DHOST_BINARY_DIR=../build-host -DCMAKE_BUILD_TYPE=Release -DOPTION_USE_ASSERTS=OFF \
  -DCMAKE_C_FLAGS="$MAP" -DCMAKE_CXX_FLAGS="$MAP" -DGLOBAL_DIR=/usr/share/games/openttd
# make no sabe que pre.js y baseset/ forman parte del resultado: se borra la
# salida para que siempre vuelva a hacer el enlace final.
rm -f openttd.html openttd.js openttd.wasm openttd.data
emmake make -j"$JOBS"

mkdir -p "$OUT_DIR"
cp openttd.js openttd.wasm openttd.data "$OUT_DIR/"
if grep -q "$HOME" "$OUT_DIR/openttd.wasm" "$OUT_DIR/openttd.js"; then
  echo "ERROR: quedó una ruta de esta máquina en el motor"; exit 1
fi
ls -lh "$OUT_DIR"/openttd.*
