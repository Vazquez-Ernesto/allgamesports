#!/usr/bin/env bash
# Compila Tyrian (OpenTyrian) a WebAssembly con Emscripten.
#
# Uso:   ./build.sh
# Salida: ../../public/games/tyrian/tyrian.js y tyrian.wasm
#
# Requisitos: emcc en el PATH (probado con Emscripten 7.0.0). El port de SDL2
# lo descarga Emscripten la primera vez.
#
# Para depurar: EXTRA_LDFLAGS suma flags de enlace, por ejemplo
# EXTRA_LDFLAGS="-sASSERTIONS=2 -sSAFE_HEAP=1" ./build.sh
set -euo pipefail

cd "$(dirname "$0")"

SRC_DIR=src
BUILD_DIR=build
OUT_DIR=../../public/games/tyrian

# network.c se compila sin WITH_NETWORK: el juego en red queda desactivado
# (necesitaria SDL2_net y sockets).
SOURCES="animlib arg_parse backgrnd config config_file demo destruct editship
episodes file font fonthand game_menu helptext joystick jukebox keyboard
lds_play logging loudness lvllib lvlmast mainint memreader memwriter menus
mouse mtrand musmast network nortsong nortvars opentyr opl palette params pcxload
pcxmast picload player shots sndmast sprite starlib tyrian2 varz vga256d
vga_palette video video_scale video_scale_hqNx xmas web"

CFLAGS="-O2 -std=gnu99 -DNDEBUG -DTARGET_UNIX -DOPENTYRIAN_VERSION=\"web\" -sUSE_SDL=2 -Wno-everything"

mkdir -p "$BUILD_DIR" "$OUT_DIR"

OBJS=""
for name in $SOURCES; do
  obj="$BUILD_DIR/$name.o"
  if [ ! -f "$obj" ] || [ "$SRC_DIR/$name.c" -nt "$obj" ]; then
    echo "[cc] $name.c"
    emcc $CFLAGS -c "$SRC_DIR/$name.c" -o "$obj"
  fi
  OBJS="$OBJS $obj"
done

# ASYNCIFY: permite que los bucles bloqueantes del juego cedan el control al
# navegador (ver src/web.c).
# STACK_SIZE: Emscripten reserva 64 KB de pila por defecto y JE_loadMap declara
# un arreglo local de 64.000 bytes (pic_buffer): sin esto, el juego se cae al
# entrar a un nivel con "memory access out of bounds".
# --profiling-funcs: deja los nombres de las funciones (13 KB con gzip) para
# que un error diga "fread" o "main" en vez de "wasm-function[1297]".
echo "[link] tyrian.js + tyrian.wasm"
emcc -O2 $OBJS -o "$OUT_DIR/tyrian.js" \
  -sUSE_SDL=2 \
  -sASYNCIFY \
  -sASYNCIFY_STACK_SIZE=131072 \
  -sSTACK_SIZE=5242880 \
  --profiling-funcs \
  -lidbfs.js \
  -sMODULARIZE=1 \
  -sEXPORT_NAME=createTyrianModule \
  -sENVIRONMENT=web \
  -sINVOKE_RUN=0 \
  -sEXIT_RUNTIME=0 \
  -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS='["_main","_web_set_paused","_web_request_stop"]' \
  -sEXPORTED_RUNTIME_METHODS='["FS","IDBFS","ENV","callMain"]' \
  ${EXTRA_LDFLAGS:-}

ls -lh "$OUT_DIR"/tyrian.js "$OUT_DIR"/tyrian.wasm
