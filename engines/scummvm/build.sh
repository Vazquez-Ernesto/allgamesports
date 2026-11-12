#!/usr/bin/env bash
# Compila ScummVM a WebAssembly, solo con los motores de los juegos del
# catálogo (sky: Beneath a Steel Sky, queen: Flight of the Amazon Queen).
#
# Corre en Linux. En Windows, desde la raíz del repo:
#   wsl bash engines/scummvm/build.sh
# Requisitos: git, make, wget, python3, pkg-config y zip. El script oficial de
# ScummVM descarga su propia versión de Emscripten (4.0.10) la primera vez.
#
# A diferencia de Doom y Tyrian, el código de ScummVM no se copia al repo: es
# enorme. Se clona la versión de UPSTREAM_TAG en una carpeta de trabajo y se le
# aplican los parches de patches/.
#
# Salida: ../../public/games/scummvm/scummvm.js y scummvm.wasm.
# Los datos de los juegos se preparan aparte con prepare-data.mjs.
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/scummvm"
TAG="$(cat UPSTREAM_TAG)"
WORK="${SCUMMVM_WORK:-$HOME/.cache/allgamesports/scummvm}"
SRC="$WORK/src"

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone --depth 1 --branch "$TAG" https://github.com/scummvm/scummvm.git "$SRC"
fi

# Volver al código original y aplicar los parches (idempotente).
git -C "$SRC" checkout -q -- .
for patch in "$HERE"/patches/*.patch; do
  echo "[patch] $(basename "$patch")"
  git -C "$SRC" apply "$patch"
done

cd "$SRC"
./dists/emscripten/build.sh setup libs configure make dist \
  --disable-all-engines --enable-engine=sky,queen

mkdir -p "$OUT_DIR"
cp build-emscripten/scummvm.js build-emscripten/scummvm.wasm "$OUT_DIR/"
ls -lh "$OUT_DIR"/scummvm.js "$OUT_DIR"/scummvm.wasm
echo "Archivos de soporte para prepare-data.mjs: $SRC/build-emscripten/data"
