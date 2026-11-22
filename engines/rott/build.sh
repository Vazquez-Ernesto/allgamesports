#!/usr/bin/env bash
# Compila taradino (motor libre de Rise of the Triad) a WebAssembly, con los
# datos del shareware adentro.
#
# Uso:   ./build.sh
# Salida: ../../public/games/rott/rott.js, rott.wasm y rott.data
#
# Requisitos: emcc en el PATH (probado con Emscripten 7.0.0), git, curl y
# unzip.
#
# El código no se copia al repo: se clona la versión de UPSTREAM_TAG en una
# carpeta de trabajo y se le aplica patches/. No se usa su CMake: se llama a
# emcc directo con la lista de archivos.
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/rott"
TAG="$(cat UPSTREAM_TAG)"
WORK="${ROTT_WORK:-$HOME/.cache/allgamesports/taradino}"
SRC="$WORK/src"
DATA="$WORK/huntbgin"
SHAREWARE_URL=https://www.classicdosgames.com/files/games/apogee/1rott13.zip
SHAREWARE_SHA256=eea67a85845d52fa0ee7272e3ae24b79769ed1e8bdff7b1360904078bc51ad1e

if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone --depth 1 --branch "$TAG" https://github.com/fabiangreffrath/taradino.git "$SRC"
fi
git -C "$SRC" checkout -q -f "$TAG"
for patch in "$HERE"/patches/*.patch; do
  [ -e "$patch" ] || continue
  echo "[patch] $(basename "$patch")"
  git -C "$SRC" apply --ignore-whitespace "$patch"
done

# Datos: el paquete shareware original de Apogee. Adentro trae un instalador
# (ROTTSW13.SHR) que es, a su vez, un .zip con los archivos del juego. Van
# todos, sin tocar, como pide su licencia (VENDOR.DOC incluido).
if [ ! -f "$DATA/HUNTBGIN.WAD" ]; then
  mkdir -p "$DATA"
  curl -sSL -o "$WORK/1rott13.zip" "$SHAREWARE_URL"
  echo "$SHAREWARE_SHA256  $WORK/1rott13.zip" | sha256sum -c -
  unzip -q -o "$WORK/1rott13.zip" -d "$WORK/pkg"
  unzip -q -o "$WORK/pkg/ROTTSW13.SHR" -d "$DATA"
fi

cd "$SRC"
# CMake arma version.h a partir de esta plantilla; acá se hace a mano.
sed "s/@CMAKE_PROJECT_VERSION@/$TAG/" rott/version.h.in > rott/version.h
mkdir -p "$OUT_DIR"

# SHAREWARE=1: la versión shareware ("The HUNT Begins").
# ASYNCIFY: el juego es una cadena de bucles que esperan; así pueden cederle
#   el control al navegador en cada espera.
# STACK_SIZE: Emscripten reserva 64 KB de pila por defecto; se sube a 5 MB.
# EMULATE_FUNCTION_POINTER_CASTS: el menú guarda funciones de distintos tipos
#   y las llama todas como si recibieran un int. En DOS funcionaba; en
#   WebAssembly cada llamada por puntero verifica el tipo y el juego se corta.
#   Esta opción hace que Emscripten tolere esas llamadas.
# --preload-file: los datos viajan en rott.data y aparecen en /data.
# INVOKE_RUN=0: play.js prepara las carpetas y recién ahí llama a main().
# -o rott.js (relativo): Emscripten nombra el paquete de datos con esa misma
#   ruta y la escribe en rott.js; con una ruta absoluta quedaba la de la
#   máquina. Se compila acá y después se copia.
echo "[build] rott.js + rott.wasm + rott.data"
emcc rott/*.c -Irott -O2 -Wno-everything \
  -DSHAREWARE=1 -DHAVE_DIRENT_H \
  -DPACKAGE_STRING="\"Taradino (Shareware) $TAG\"" -DPACKAGE_TARNAME='"taradino"' \
  -sUSE_SDL=2 -sUSE_SDL_MIXER=2 -sSDL2_MIXER_FORMATS='[]' \
  -sASYNCIFY -sASYNCIFY_STACK_SIZE=131072 \
  -sEMULATE_FUNCTION_POINTER_CASTS \
  -sSTACK_SIZE=5242880 \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINVOKE_RUN=0 \
  -sEXIT_RUNTIME=1 \
  -sENVIRONMENT=web \
  -sFORCE_FILESYSTEM -lidbfs.js \
  -sEXPORTED_FUNCTIONS='["_main"]' \
  -sEXPORTED_RUNTIME_METHODS='["FS","IDBFS","callMain"]' \
  --preload-file "$DATA@/data" \
  --profiling-funcs \
  -o rott.js

cp rott.js rott.wasm rott.data "$OUT_DIR/"
cp "$WORK/1rott13.zip" "$OUT_DIR/1rott13.zip"
if grep -q -e "$HOME" -e "Users/$(basename "$HOME")" "$OUT_DIR/rott.js" "$OUT_DIR/rott.wasm"; then
  echo "ERROR: quedó una ruta de esta máquina en el motor"; exit 1
fi
ls -lh "$OUT_DIR"
