#!/usr/bin/env bash
# Compila SuperTux 0.7.0 a WebAssembly (solo el motor; los datos se preparan
# con prepare-data.sh).
#
# Corre en Linux. En Windows, desde la raíz del repo:
#   wsl bash engines/supertux/build.sh
# Requisitos: git, cmake, make, python3, curl, zip y pkg-config.
#
# Sigue los mismos pasos que la compilación oficial de SuperTux para
# navegador (.github/workflows/wasm.yml): las bibliotecas que necesita (fmt,
# ogg, vorbis, freetype, physfs, glm, png, zlib) las compila vcpkg, un gestor
# de bibliotecas de C++, para WebAssembly.
#
# Salida: ../../public/games/supertux/supertux2.js y supertux2.wasm
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/supertux"
VERSION="$(cat UPSTREAM_VERSION)"
EMSDK_VERSION=6.0.1
EMSDK="${EMSDK_DIR:-$HOME/.cache/allgamesports/emsdk-$EMSDK_VERSION}"
WORK="${SUPERTUX_WORK:-$HOME/.cache/allgamesports/supertux}"
SRC="$WORK/SuperTux-$VERSION-Source"
VCPKG="$WORK/vcpkg"
SOURCE_URL="https://github.com/SuperTux/supertux/releases/download/$VERSION/SuperTux-$VERSION-Source.tar.gz"
SOURCE_SHA256=32fc5b99b9994ed58e58341d6f21de925764b381256e108591136de53bc31da5

if [ ! -d "$EMSDK" ]; then
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK"
  "$EMSDK/emsdk" install "$EMSDK_VERSION"
  "$EMSDK/emsdk" activate "$EMSDK_VERSION"
fi
# shellcheck disable=SC1091
source "$EMSDK/emsdk_env.sh"

if [ ! -x "$VCPKG/vcpkg" ]; then
  git clone --depth 1 https://github.com/microsoft/vcpkg.git "$VCPKG"
  "$VCPKG/bootstrap-vcpkg.sh" -disableMetrics
fi

# El código: el paquete de la versión publicada (trae sus submódulos).
mkdir -p "$WORK"
if [ ! -f "$WORK/src7.tar.gz" ]; then
  curl -sSL -o "$WORK/src7.tar.gz" "$SOURCE_URL"
fi
echo "$SOURCE_SHA256  $WORK/src7.tar.gz" | sha256sum -c -
rm -rf "$SRC"
tar -xzf "$WORK/src7.tar.gz" -C "$WORK"
for patch in "$HERE"/patches/*.patch; do
  echo "[patch] $(basename "$patch")"
  patch -d "$SRC" -p1 < "$patch"
done

echo "[build] supertux2.js + supertux2.wasm"
mkdir -p "$SRC/build" "$OUT_DIR"
cd "$SRC/build"
# El código mezcla #ifdef EMSCRIPTEN y __EMSCRIPTEN__. Emscripten moderno
# solo define la segunda: sin esto, los bloques para navegador se apagan.
# -ffile-prefix-map saca la ruta de esta máquina de los mensajes de log.
# SimpleSquirrel estática: si es .so, el enlazador pide código -fPIC.
emcmake cmake .. -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_FLAGS="-DEMSCRIPTEN -ffile-prefix-map=$SRC/=" \
  -DCMAKE_CXX_FLAGS="-DEMSCRIPTEN -ffile-prefix-map=$SRC/=" \
  -DUSE_STATIC_SIMPLESQUIRREL=ON \
  -DCMAKE_TOOLCHAIN_FILE="$VCPKG/scripts/buildsystems/vcpkg.cmake" \
  -DVCPKG_CHAINLOAD_TOOLCHAIN_FILE="$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake" \
  -DVCPKG_TARGET_TRIPLET=wasm32-emscripten -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DVCPKG_MANIFEST_FEATURES=core
emmake make -j"${JOBS:-3}"

cp supertux2.js supertux2.wasm "$OUT_DIR/"
ls -lh "$OUT_DIR"/supertux2.js "$OUT_DIR"/supertux2.wasm
