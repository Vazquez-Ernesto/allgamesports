#!/usr/bin/env bash
# Compila Doom (doomgeneric) a WebAssembly con Emscripten.
#
# Uso:   ./build.sh
# Salida: ../../public/games/doom/doom.js y doom.wasm
#
# Requisitos: emcc en el PATH (probado con Emscripten 3.1.6).
set -euo pipefail

cd "$(dirname "$0")"

SRC_DIR=src
BUILD_DIR=build
OUT_DIR=../../public/games/doom

SOURCES="dummy am_map doomdef doomstat dstrings d_event d_items d_iwad d_loop
d_main d_mode d_net f_finale f_wipe g_game hu_lib hu_stuff info i_cdmus
i_endoom i_joystick i_scale i_sound i_system i_timer memio m_argv m_bbox
m_cheat m_config m_controls m_fixed m_menu m_misc m_random p_ceilng p_doors
p_enemy p_floor p_inter p_lights p_map p_maputl p_mobj p_plats p_pspr p_saveg
p_setup p_sight p_spec p_switch p_telept p_tick p_user r_bsp r_data r_draw
r_main r_plane r_segs r_sky r_things sha1 sounds statdump st_lib st_stuff
s_sound tables v_video wi_stuff w_checksum w_file w_main w_wad z_zone
w_file_stdc i_input i_video doomgeneric mus2mid
doomgeneric_web i_websound"

# Doom dibuja a 320x200; el escalado lo hace el navegador con CSS.
CFLAGS="-O2 -DFEATURE_SOUND -DDOOMGENERIC_RESX=320 -DDOOMGENERIC_RESY=200 -Wno-everything"

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

echo "[link] doom.js + doom.wasm"
emcc -O2 $OBJS -o "$OUT_DIR/doom.js" \
  -lidbfs.js \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=createDoomModule \
  -s ENVIRONMENT=web \
  -s INVOKE_RUN=0 \
  -s EXIT_RUNTIME=0 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=134217728 \
  -s EXPORTED_FUNCTIONS='["_dg_start","_doomgeneric_Tick","_dg_key","_dg_mouse"]' \
  -s EXPORTED_RUNTIME_METHODS='["FS","IDBFS","ccall","UTF8ToString"]'

ls -lh "$OUT_DIR"/doom.js "$OUT_DIR"/doom.wasm
