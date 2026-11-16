#!/usr/bin/env bash
# Compila FTEQW (motor libre de Quake) para navegador y prepara los datos
# libres de LibreQuake.
#
# Corre en Linux. En Windows, desde la raíz del repo:
#   wsl bash engines/quake/build.sh
# Requisitos: git, make, python3, curl, unzip y gzip.
#
# El código no se copia al repo: se clona el commit de UPSTREAM_COMMIT en una
# carpeta de trabajo y se le aplica patches/. FTEQW trae su propio objetivo
# para navegador (`make web-rel`).
#
# Salida en ../../public/games/quake/:
#   ftewebgl.js y ftewebgl.wasm   el motor
#   data/pak0.pakgz, pak1.pakgz   los datos de LibreQuake, comprimidos con gzip
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/quake"
COMMIT="$(cat UPSTREAM_COMMIT)"
EMSDK_VERSION=6.0.1
# El mismo Emscripten sirve para OpenTTD, OpenJazz y RigelEngine.
EMSDK="${EMSDK_DIR:-$HOME/.cache/allgamesports/emsdk-$EMSDK_VERSION}"
WORK="${QUAKE_WORK:-$HOME/.cache/allgamesports/fteqw}"
SRC="$WORK/src"
LQ_VERSION=v0.09-beta
LQ_URL="https://github.com/lavenderdotpet/LibreQuake/releases/download/$LQ_VERSION/lite.zip"
LQ_SHA256=428e736b2f01d953e09a08c60bee975bdc4a0ac2219e97fa095c8af41754da83

if [ ! -d "$EMSDK" ]; then
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK"
  "$EMSDK/emsdk" install "$EMSDK_VERSION"
  "$EMSDK/emsdk" activate "$EMSDK_VERSION"
fi
# shellcheck disable=SC1091
source "$EMSDK/emsdk_env.sh"

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone https://github.com/fte-team/fteqw.git "$SRC"
fi
git -C "$SRC" checkout -q -f "$COMMIT"
for patch in "$HERE"/patches/*.patch; do
  [ -e "$patch" ] || continue
  echo "[patch] $(basename "$patch")"
  git -C "$SRC" apply --ignore-whitespace "$patch"
done

echo "[build] ftewebgl.js + ftewebgl.wasm"
# make no sabe que los parches cambian las opciones de enlace: se borra la
# salida para que siempre vuelva a hacer el paso final.
rm -f "$SRC/engine/release/ftewebgl."*
make -C "$SRC/engine" web-rel -j"${JOBS:-3}"
mkdir -p "$OUT_DIR/data"
cp "$SRC/engine/release/ftewebgl.js" "$SRC/engine/release/ftewebgl.wasm" "$OUT_DIR/"

# Datos: LibreQuake "lite", la versión que trae el primer episodio. Se usan
# los dos paquetes del juego (pak0 y pak1); la música va aparte.
if [ ! -f "$WORK/lite.zip" ]; then
  curl -sSL -o "$WORK/lite.zip" "$LQ_URL"
fi
echo "$LQ_SHA256  $WORK/lite.zip" | sha256sum -c -
rm -rf "$WORK/lq" && unzip -q -o "$WORK/lite.zip" -d "$WORK/lq"
for pak in pak0 pak1; do
  gzip -9 -n -c "$WORK/lq/lite/id1/$pak.pak" > "$OUT_DIR/data/$pak.pakgz"
done
ls -lh "$OUT_DIR" "$OUT_DIR/data"
