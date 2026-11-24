#!/usr/bin/env bash
# Compila Jump 'n Bump (GPL-2.0+) a WebAssembly, con sus datos adentro.
#
# Uso:   ./build.sh
# Salida: ../../public/games/jumpnbump/jumpnbump.js, .wasm y .data, más las
#         licencias del juego.
#
# Requisitos: emcc en el PATH (probado con Emscripten 7.0.0), node y git.
#
# El código no se copia al repo: se clona la versión de UPSTREAM_TAG (del
# repositorio oficial, LibreGames en GitLab), se verifica su commit y se le
# aplica patches/. No se usa su Makefile: se llama a emcc directo.
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/jumpnbump"
TAG="$(cat UPSTREAM_TAG)"
COMMIT="$(cat UPSTREAM_COMMIT)"
WORK="${JUMPNBUMP_WORK:-$HOME/.cache/allgamesports/jumpnbump}"
SRC="$WORK/src"
TOOLS="$WORK/tools"

# core.autocrlf=false: Git para Windows bajaría los .txt con fin de línea CRLF,
# y esos .txt (como levelmap.txt) van adentro de jumpbump.dat: el archivo
# saldría distinto según la máquina.
if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK"
  git clone -c core.autocrlf=false --depth 1 --branch "$TAG" https://gitlab.com/LibreGames/jumpnbump.git "$SRC"
fi
git -C "$SRC" config core.autocrlf false
git -C "$SRC" checkout -q -f "$TAG"
if [ "$(git -C "$SRC" rev-parse HEAD)" != "$COMMIT" ]; then
  echo "ERROR: el tag $TAG no apunta al commit esperado ($COMMIT)"; exit 1
fi
for patch in "$HERE"/patches/*.patch; do
  [ -e "$patch" ] || continue
  echo "[patch] $(basename "$patch")"
  git -C "$SRC" apply --ignore-whitespace "$patch"
done

# Datos: el juego lee todo de un solo archivo, jumpbump.dat. Se arma con dos
# herramientas del propio repo (gobpack junta los cuadros de cada dibujo;
# jnbpack empaqueta todo). Son programas de C para la terminal: se compilan
# con el mismo emcc, para Node (NODERAWFS: ven los archivos reales), así no
# hace falta otro compilador.
echo "[datos] jumpbump.dat"
mkdir -p "$TOOLS"
for tool in gobpack jnbpack; do
  emcc "$SRC/modify/$tool.c" -I"$SRC" -O2 -Wno-everything \
    -sNODERAWFS=1 -sENVIRONMENT=node -o "$TOOLS/$tool.js"
done
cd "$SRC/data"
for gob in font rabbit numbers objects; do
  node "$TOOLS/gobpack.js" "$gob"
done
node "$TOOLS/jnbpack.js" -o jumpbump.dat \
  bump.mod calib.dat death.smp fly.smp jump.mod jump.smp levelmap.txt \
  level.pcx mask.pcx menu.pcx menumask.pcx font.gob numbers.gob \
  objects.gob rabbit.gob scores.mod splash.smp spring.smp
mkdir -p "$WORK/pack"
cp jumpbump.dat "$WORK/pack/"

cd "$SRC"
mkdir -p "$OUT_DIR"

# Las mismas definiciones que su Makefile, sin juego en red (USE_NET pide
# SDL2_net, que usa sockets TCP: el navegador no los tiene) ni zlib/bzip2
# (solo sirven para niveles extra comprimidos).
# SDL2_MIXER_FORMATS mod: la música son tres módulos .mod (libmodplug).
# DEFAULT_TO_CXX: libmodplug está escrita en C++; el juego es C, y sin esto
#   emcc enlaza sin la biblioteca de C++ (faltan new y delete).
# ASYNCIFY: el juego es una cadena de bucles; cada vuelta pasa por
#   intr_sysupdate(), que llama a SDL_Delay. Con Asyncify esa espera le cede
#   el control al navegador.
# --preload-file: jumpbump.dat viaja en jumpnbump.data y aparece en /data.
#   La ruta es relativa a propósito: con una absoluta, la de esta máquina
#   quedaba escrita en jumpnbump.js.
# -ffile-prefix-map: que no quede la ruta de la carpeta de trabajo en el .wasm.
# INVOKE_RUN=0: play.js llama a main() con las opciones.
echo "[build] jumpnbump.js + jumpnbump.wasm + jumpnbump.data"
cp "$WORK/pack/jumpbump.dat" ./jumpbump.dat
emcc main.c menu.c filter.c network.c sdl/gfx.c sdl/interrpt.c sdl/sound.c sdl/input.c \
  -I. -O2 -Wno-everything \
  -Dstricmp=strcasecmp -Dstrnicmp=strncasecmp -DNDEBUG -DUSE_SDL \
  -ffile-prefix-map="$SRC"=. \
  -sUSE_SDL=2 -sUSE_SDL_MIXER=2 -sSDL2_MIXER_FORMATS='["mod"]' \
  -sDEFAULT_TO_CXX \
  -sASYNCIFY \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINVOKE_RUN=0 \
  -sEXIT_RUNTIME=1 \
  -sENVIRONMENT=web \
  -sEXPORTED_FUNCTIONS='["_main"]' \
  -sEXPORTED_RUNTIME_METHODS='["callMain"]' \
  --preload-file jumpbump.dat@/data/jumpbump.dat \
  -o jumpnbump.js

cp jumpnbump.js jumpnbump.wasm jumpnbump.data "$OUT_DIR/"
# Licencias: el código y los datos son GPL-2.0+; el readme original de 1998
# y el aviso de la liberación del código van al lado, como en el paquete.
cp COPYING "$OUT_DIR/LICENSE-jumpnbump.txt"
cp AUTHORS "$OUT_DIR/AUTHORS-jumpnbump.txt"
cp docs/original_readme.txt "$OUT_DIR/original_readme.txt"
cp docs/source_release.txt "$OUT_DIR/source_release.txt"
if grep -a -q -e "$HOME" -e "Users/$(basename "$HOME")" "$OUT_DIR/jumpnbump.js" "$OUT_DIR/jumpnbump.wasm"; then
  echo "ERROR: quedó una ruta de esta máquina en el motor"; exit 1
fi
ls -lh "$OUT_DIR"
