#!/usr/bin/env bash
# Compila RigelEngine (motor libre de Duke Nukem II) a WebAssembly, con los
# datos del shareware adentro.
#
# Corre en Linux. En Windows, desde la raíz del repo:
#   wsl bash engines/rigel/build.sh
# Requisitos: git, cmake, make, python3, curl y unzip.
#
# El código no se copia al repo: se clona el commit de UPSTREAM_COMMIT (con
# sus submódulos) en una carpeta de trabajo y se le aplica patches/.
#
# Salida: ../../public/games/rigel/RigelEngine.js, .wasm y .data
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/rigel"
COMMIT="$(cat UPSTREAM_COMMIT)"
EMSDK_VERSION=6.0.1
# El mismo Emscripten sirve para OpenTTD y OpenJazz: se instala una sola vez.
EMSDK="${EMSDK_DIR:-$HOME/.cache/allgamesports/emsdk-$EMSDK_VERSION}"
WORK="${RIGEL_WORK:-$HOME/.cache/allgamesports/rigel}"
SRC="$WORK/src"
DATA="$WORK/duke2"
SHAREWARE_URL=https://www.classicdosgames.com/files/games/apogee/4duke.zip
SHAREWARE_SHA256=c94479ace93a8923615ddebea96bcd18242a3a31f54cdcbc84e02ca0ab685829

if [ ! -d "$EMSDK" ]; then
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK"
  "$EMSDK/emsdk" install "$EMSDK_VERSION"
  "$EMSDK/emsdk" activate "$EMSDK_VERSION"
fi
# shellcheck disable=SC1091
source "$EMSDK/emsdk_env.sh"

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone https://github.com/lethal-guitar/RigelEngine.git "$SRC"
fi
git -C "$SRC" checkout -q -f "$COMMIT"
git -C "$SRC" submodule update --init --recursive
for patch in "$HERE"/patches/*.patch; do
  echo "[patch] $(basename "$patch")"
  git -C "$SRC" apply --ignore-whitespace "$patch"
done

# Datos: el paquete shareware original de Apogee. Adentro trae un instalador
# (DN2SW10.SHR) que es, a su vez, un .zip con los archivos del juego. Van
# todos, sin tocar, como pide su licencia (VENDOR.DOC incluido).
if [ ! -f "$DATA/NUKEM2.CMP" ]; then
  mkdir -p "$DATA"
  curl -sSL -o "$WORK/4duke.zip" "$SHAREWARE_URL"
  echo "$SHAREWARE_SHA256  $WORK/4duke.zip" | sha256sum -c -
  unzip -q -o "$WORK/4duke.zip" -d "$WORK/pkg"
  unzip -q -o "$WORK/pkg/DN2SW10.SHR" -d "$DATA"
fi

echo "[build] RigelEngine.js + .wasm + .data"
mkdir -p "$SRC/build-web" "$OUT_DIR"
cd "$SRC/build-web"
emcmake cmake .. -DCMAKE_BUILD_TYPE=Release -DWEBASSEMBLY_GAME_PATH="$DATA"
# make no sabe que cambiaron los datos ni las opciones de enlace.
rm -f src/RigelEngine.js src/RigelEngine.wasm src/RigelEngine.data
emmake make -j"${JOBS:-3}" RigelEngine

cp src/RigelEngine.js src/RigelEngine.wasm src/RigelEngine.data "$OUT_DIR/"
cp "$WORK/4duke.zip" "$OUT_DIR/4duke.zip"
ls -lh "$OUT_DIR"
