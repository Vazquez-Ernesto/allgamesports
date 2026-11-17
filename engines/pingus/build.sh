#!/usr/bin/env bash
# Compila Pingus a WebAssembly, con sus datos adentro.
#
# Corre en Linux (WSL). Usa el Emscripten 6.0.1 compartido con otros motores
# (~/.cache/allgamesports/emsdk-6.0.1; ver engines/openttd/build.sh).
#
# Pingus ya trae un build para navegador (mk/wasm, armado con Nix). Este
# script hace lo mismo sin Nix: baja y compila las dependencias (SDL2,
# SDL2_image, zlib, libmodplug y los headers de glm) con las versiones que
# fija el proyecto, y después compila el juego con sus mismas opciones.
#
# Salida: ../../public/games/pingus/pingus.{js,wasm,data}
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/pingus"
COMMIT="$(cat UPSTREAM_COMMIT)"
EMSDK="${EMSDK_DIR:-$HOME/.cache/allgamesports/emsdk-6.0.1}"
WORK="${PINGUS_WORK:-$HOME/.cache/allgamesports/pingus}"
SRC="$WORK/pingus"
DEPS="$WORK/deps"
JOBS="${JOBS:-3}"

# shellcheck disable=SC1091
source "$EMSDK/emsdk_env.sh" > /dev/null 2>&1
export EM_CACHE="$WORK/emcache"
mkdir -p "$WORK" "$DEPS" "$EM_CACHE"
# Que no quede la ruta de esta máquina dentro del .wasm (los assert de C
# guardan la ruta de su archivo fuente). Vale para todas las dependencias.
MAP="-ffile-prefix-map=$WORK/="
export CFLAGS="$MAP" CXXFLAGS="$MAP"

fetch() {  # fetch <url> <carpeta>: baja un .tar.* y lo deja descomprimido
  local url="$1" dir="$2"
  [ -d "$dir" ] && return
  mkdir -p "$dir"
  curl -fsSL "$url" | tar -xz -C "$dir" --strip-components=1
}

clone_pingus() {
  if [ ! -d "$SRC/.git" ]; then git clone -q https://github.com/Pingus/pingus "$SRC"; fi
  git -C "$SRC" fetch -q origin "$COMMIT"
  git -C "$SRC" checkout -q --force "$COMMIT"
  git -C "$SRC" clean -q -fdx
}

build_sdl() {
  [ -f "$DEPS/sdl/lib/libSDL2_image.a" ] && return
  fetch https://github.com/libsdl-org/SDL/releases/download/release-2.30.3/SDL2-2.30.3.tar.gz "$WORK/src-sdl2"
  fetch https://github.com/libsdl-org/SDL_image/releases/download/release-2.8.2/SDL2_image-2.8.2.tar.gz "$WORK/src-sdl2-image"
  local scripts="$SRC/mk/wasm/scripts"
  (cd "$WORK" && rm -rf SDL2-src build-sdl2 && SDL_SRC="$WORK/src-sdl2" PREFIX="$DEPS/sdl" bash "$scripts/build-sdl2.sh")
  (cd "$WORK" && rm -rf SDL2_image-src build-sdl2-image &&
    SDL_IMAGE_SRC="$WORK/src-sdl2-image" SDL_PREFIX="$DEPS/sdl" PREFIX="$DEPS/sdl" bash "$scripts/build-sdl2-image.sh")
}

build_zlib() {
  [ -f "$DEPS/zlib/lib/libz.a" ] && return
  fetch https://zlib.net/fossils/zlib-1.3.1.tar.gz "$WORK/src-zlib"
  (cd "$WORK/src-zlib" && emconfigure ./configure --static --prefix="$DEPS/zlib" && emmake make -j"$JOBS" && emmake make install)
}

build_modplug() {  # decodifica la música (módulos .it y .s3m)
  [ -f "$DEPS/modplug/lib/libmodplug.a" ] && return
  fetch https://downloads.sourceforge.net/project/modplug-xmms/libmodplug/0.8.9.0/libmodplug-0.8.9.0.tar.gz "$WORK/src-modplug"
  # Su configure no conoce wasm32-unknown-emscripten: se usan los scripts de
  # plataformas, más nuevos, que trae SDL2.
  cp "$WORK/src-sdl2/build-scripts/config.sub" "$WORK/src-sdl2/build-scripts/config.guess" "$WORK/src-modplug/"
  (cd "$WORK/src-modplug" &&
    CXXFLAGS="-std=gnu++14 -Wno-register -O2 $MAP" CFLAGS="-O2 $MAP" emconfigure ./configure \
      --prefix="$DEPS/modplug" --host=wasm32-unknown-emscripten --enable-static --disable-shared &&
    emmake make -j"$JOBS" && emmake make install)
}

fetch_glm() {  # glm son solo headers
  fetch https://github.com/g-truc/glm/archive/refs/tags/1.0.1.tar.gz "$WORK/src-glm"
}

# Opciones de enlace: las de mk/wasm/scripts/build-app.sh, más lo que usa
# play.js (FS, IDBFS y las dependencias de arranque para esperar el guardado).
link_flags() {
  local flags=(
    -sALLOW_MEMORY_GROWTH=1 -sSTACK_SIZE=1048576 -fexceptions -sDISABLE_EXCEPTION_CATCHING=0
    -sGROWABLE_ARRAYBUFFERS=0 -sFULL_ES2=1 -sMIN_WEBGL_VERSION=1 -sMAX_WEBGL_VERSION=2
    -sFORCE_FILESYSTEM=1 -sEXIT_RUNTIME=0 -lidbfs.js -lopenal
    -sEXPORTED_FUNCTIONS=_main,_emscripten_pause_main_loop,_emscripten_resume_main_loop
    -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,FS,IDBFS,addRunDependency,removeRunDependency
    --preload-file "$SRC/data@/data"
  )
  echo "${flags[*]}"
}

build_pingus() {
  local map="-ffile-prefix-map=$SRC/= $MAP"
  emcmake cmake -S "$SRC" -B "$SRC/build" -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_C_FLAGS="$map" -DCMAKE_CXX_FLAGS="$map" \
    -DBUILD_TESTS=OFF -DBUILD_EXTRA=OFF -DPINGUS_USE_GLES=ON -DPRIO_USE_JSONCPP=OFF \
    -DPINGUS_ENABLE_SOUND=ON -DDATA_PREFIX=/data -DSDL2_ROOT="$DEPS/sdl" \
    -DZLIB_ROOT="$DEPS/zlib" -DPINGUS_GLM_INCLUDE_DIR="$WORK/src-glm" \
    -DPINGUS_SIGC_POLYFILL_DIR="$SRC/mk/android/app/jni" \
    -DMODPLUG_DIR="$DEPS/modplug" -DMODPLUG_INCLUDE_DIRECTORY="$DEPS/modplug/include" \
    -DMODPLUG_LIBRARY="$DEPS/modplug/lib/libmodplug.a" \
    -DCMAKE_FIND_ROOT_PATH_MODE_INCLUDE=BOTH -DCMAKE_FIND_ROOT_PATH_MODE_LIBRARY=BOTH \
    -DEMSCRIPTEN_LINK_FLAGS="$(link_flags)"
  cmake --build "$SRC/build" --parallel "$JOBS"
}

echo "[pingus] código ($COMMIT)"; clone_pingus
echo "[pingus] dependencias"; build_sdl; build_zlib; build_modplug; fetch_glm
echo "[pingus] juego"; build_pingus

mkdir -p "$OUT_DIR"
cp "$SRC/build/pingus.js" "$SRC/build/pingus.wasm" "$SRC/build/pingus.data" "$OUT_DIR/"
cp "$SRC/LICENSE.txt" "$OUT_DIR/LICENSE-pingus.txt"
cp "$SRC/AUTHORS" "$OUT_DIR/AUTHORS-pingus.txt"
if grep -q "$HOME" "$OUT_DIR/pingus.wasm" "$OUT_DIR/pingus.js"; then
  echo "ERROR: quedó una ruta de esta máquina en el motor"; exit 1
fi
ls -lh "$OUT_DIR"/pingus.*
