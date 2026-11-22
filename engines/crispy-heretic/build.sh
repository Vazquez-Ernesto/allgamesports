#!/usr/bin/env bash
# Compila Crispy Heretic (parte de Crispy Doom) a WebAssembly y prepara los
# datos de Blasphemer, el reemplazo libre de los datos de Heretic.
#
# Corre en Linux (WSL). Usa el Emscripten 6.0.1 compartido con otros motores
# (~/.cache/allgamesports/emsdk-6.0.1; ver engines/openttd/build.sh).
#
# Igual que Chocolate Heretic (engines/heretic): se clona la versión de
# UPSTREAM_TAG, se aplica patches/ y se llama a emcc directo con config.h.
#
# Salida: ../../public/games/crispy-heretic/crispy-heretic.{js,wasm},
#         blasphem.wadgz y los textos de licencia de Blasphemer.
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/crispy-heretic"
TAG="$(cat UPSTREAM_TAG)"
COMMIT="fdeabe4c23a833534b70aa84a22f1685aae7125d" # el commit del tag, por si lo mueven
EMSDK="${EMSDK_DIR:-$HOME/.cache/allgamesports/emsdk-6.0.1}"
WORK="${CRISPY_WORK:-$HOME/.cache/allgamesports/crispy-doom}"
SRC="$WORK/src"

BLASPHEMER="https://github.com/Blasphemer/blasphemer"
BLASPHEMER_RAW="https://raw.githubusercontent.com/Blasphemer/blasphemer/v0.1.8"
BLASPHEMER_ZIP_SHA="5838d211add81e1696a621485c1e40771035daf6609d08bad7018f52acfa5e54"
COPYING_SHA="1c985de26efb279ed42f5c8771201580674097eb107e43d385c8b09d13a3c2d2"
CREDITS_SHA="a65ac2ce9532097b5a7545e475eccf8f3a6ed2fac5af7db9ecb99f8f77d347b8"

# Se usa la caché por defecto de Emscripten, a propósito: los ports (SDL2,
# SDL2_mixer, zlib) se compilan dentro de ella, y Emscripten solo cambia por
# /emsdk/emscripten las rutas que quedan debajo de su propia carpeta. Con la
# caché afuera (EM_CACHE), los assert de SDL2 guardaban la ruta de la máquina.
# shellcheck disable=SC1091
source "$EMSDK/emsdk_env.sh" > /dev/null 2>&1
unset EM_CACHE

clone_engine() {
  [ -d "$SRC" ] || git clone -q --depth 1 --branch "$TAG" \
    https://github.com/fabiangreffrath/crispy-doom.git "$SRC"
  git -C "$SRC" checkout -q -f "$TAG"
  [ "$(git -C "$SRC" rev-parse HEAD)" = "$COMMIT" ] || { echo "ERROR: el tag $TAG cambió de commit"; exit 1; }
  for patch in "$HERE"/patches/*.patch; do
    git -C "$SRC" apply "$patch"
  done
  mkdir -p "$SRC/web"
  cp "$HERE/config.h" "$SRC/web/config.h"
}

# Lo común a los juegos de Crispy Doom, Heretic y las bibliotecas internas
# (opl: música, pcsound: parlante de PC, textscreen: pantallas de texto). Sin
# el servidor dedicado ni z_native.c, que choca con z_zone.c.
sources() {
  echo "$(ls src/*.c | grep -v -e d_dedicated.c -e z_native.c) src/heretic/*.c opl/*.c pcsound/*.c textscreen/*.c"
}

# Mismas opciones que Chocolate Heretic (ver engines/heretic/build.sh), más
# zlib y -ffile-prefix-map, para que no quede la ruta de esta máquina.
build_engine() {
  cd "$SRC"
  # shellcheck disable=SC2046
  emcc $(sources) \
    -Iweb -Isrc -Isrc/heretic -Iopl -Ipcsound -Itextscreen \
    -O2 -Wno-everything -ffile-prefix-map="$SRC/=" \
    -DDISABLE_SDL2NET=1 \
    -sUSE_SDL=2 -sUSE_SDL_MIXER=2 -sSDL2_MIXER_FORMATS='[]' -sUSE_ZLIB=1 \
    -sASYNCIFY -sASYNCIFY_STACK_SIZE=131072 \
    -sSTACK_SIZE=5242880 -sALLOW_MEMORY_GROWTH=1 \
    -sINVOKE_RUN=0 -sEXIT_RUNTIME=1 -sENVIRONMENT=web \
    -sFORCE_FILESYSTEM -lidbfs.js \
    -sEXPORTED_FUNCTIONS='["_main"]' \
    -sEXPORTED_RUNTIME_METHODS='["FS","IDBFS","callMain"]' \
    --profiling-funcs \
    -o "$OUT_DIR/crispy-heretic.js"
  cd "$HERE"
}

fetch_checked() {  # fetch_checked <url> <archivo> <sha256>
  curl -fsSL -o "$2" "$1"
  echo "$3  $2" | sha256sum -c --quiet - || { echo "ERROR: el SHA-256 de $2 no coincide"; exit 1; }
}

# Blasphemer 0.1.8 (BSD-3): el WAD sin modificar, comprimido con gzip para la
# descarga, y su licencia y créditos al lado.
prepare_data() {
  local tmp="$WORK/blasphemer"
  mkdir -p "$tmp"
  fetch_checked "$BLASPHEMER/releases/download/v0.1.8/blasphem-0.1.8.zip" "$tmp/blasphem.zip" "$BLASPHEMER_ZIP_SHA"
  fetch_checked "$BLASPHEMER_RAW/COPYING.md" "$OUT_DIR/COPYING-blasphemer.md" "$COPYING_SHA"
  fetch_checked "$BLASPHEMER_RAW/CREDITS.md" "$OUT_DIR/CREDITS-blasphemer.md" "$CREDITS_SHA"
  unzip -p "$tmp/blasphem.zip" blasphem.wad | gzip -9 -n > "$OUT_DIR/blasphem.wadgz"
}

check_paths() {
  if grep -q "$HOME" "$OUT_DIR/crispy-heretic.wasm" "$OUT_DIR/crispy-heretic.js"; then
    echo "ERROR: quedó una ruta de esta máquina en el motor"; exit 1
  fi
}

mkdir -p "$WORK" "$OUT_DIR"
echo "[crispy-heretic] código ($TAG)"; clone_engine
echo "[crispy-heretic] motor"; build_engine
echo "[crispy-heretic] datos de Blasphemer"; prepare_data
check_paths
ls -lh "$OUT_DIR"
