#!/usr/bin/env bash
# Compila ScummVM a WebAssembly, solo con los motores de los juegos del
# catálogo (sky: Beneath a Steel Sky, queen: Flight of the Amazon Queen,
# lure: Lure of the Temptress, drascula, dreamweb, cge: Sołtys,
# cge2: Sfinx y parallaction: Nippon Safes).
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

# SDL3 viene como port de Emscripten, en la caché del Emscripten que instala
# ScummVM. Se le aplica patches-sdl3/ y se recompila solo ese port: su baja de
# los oyentes de teclado nunca funcionaba, y cada vez que ScummVM recrea su
# ventana se sumaba otro juego de oyentes (cada tecla llegaba 6 veces).
patch_sdl3() {
  local emsdk port
  emsdk="$(ls -d "$SRC"/dists/emscripten/emsdk-*/ | head -1)"
  # shellcheck disable=SC1091
  source "$emsdk/emsdk_env.sh" > /dev/null 2>&1
  embuilder build sdl3 > /dev/null
  port="$(ls -d "$emsdk"/upstream/emscripten/cache/ports/sdl3/SDL-release-*/ | head -1)"
  if ! grep -q allgamesports "$port/src/video/emscripten/SDL_emscriptenevents.c"; then
    for patch in "$HERE"/patches-sdl3/*.patch; do
      echo "[patch sdl3] $(basename "$patch")"
      patch -d "$port" -p1 < "$patch"
    done
    embuilder build sdl3 --force
  fi
}

cd "$SRC"
./dists/emscripten/build.sh setup
(patch_sdl3)
# make no sabe que cambió la biblioteca SDL3 de la caché: se borra la salida
# para que siempre vuelva a enlazar.
rm -f scummvm.html scummvm.js scummvm.wasm build-emscripten/scummvm.js build-emscripten/scummvm.wasm
./dists/emscripten/build.sh libs configure make dist \
  --disable-all-engines --enable-engine=sky,queen,lure,drascula,dreamweb,cge,cge2,parallaction --enable-mad

mkdir -p "$OUT_DIR"
cp build-emscripten/scummvm.js build-emscripten/scummvm.wasm "$OUT_DIR/"
ls -lh "$OUT_DIR"/scummvm.js "$OUT_DIR"/scummvm.wasm
echo "Archivos de soporte para prepare-data.mjs: $SRC/build-emscripten/data"
