#!/usr/bin/env bash
# Prepara los datos de SuperTux 0.7.0 para el navegador.
#
# Corre en Linux (WSL), después de build.sh. Requisitos: python3, oggdec y
# oggenc (paquete vorbis-tools) y optipng.
#
# Qué hace, y por qué:
#   1. Copia data/ sin lo que no se usa jugando en español: las fuentes para
#      chino, japonés y coreano y las traducciones a otros idiomas.
#   2. Recomprime la música (OGG Vorbis) a calidad 0 (~64 kbit/s): es lo que
#      más pesa, y en parlantes de computadora casi no se nota.
#   3. Optimiza los PNG sin perder calidad (optipng).
#   4. Lo empaqueta con file_packager, de Emscripten, en varios archivos de
#      menos de 95 MB: GitHub no acepta archivos de más de 100 MB.
#
# La licencia de los datos (GPL 2+ y CC-BY-SA) permite modificarlos si se
# conserva la licencia y se dice que se modificaron: ver README.md.
#
# Salida: ../../public/games/supertux/data/*.data y *.js
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/supertux/data"
VERSION="$(cat UPSTREAM_VERSION)"
EMSDK="${EMSDK_DIR:-$HOME/.cache/allgamesports/emsdk-6.0.1}"
WORK="${SUPERTUX_WORK:-$HOME/.cache/allgamesports/supertux}"
SRC="$WORK/SuperTux-$VERSION-Source/data"
STAGE="$WORK/stage"
MAX_MB=95

# SOLO_EMPAQUETAR=1: reusa lo ya procesado en $STAGE y solo vuelve a armar
# los paquetes (la música recomprimida podría no salir igual byte a byte).
if [ "${SOLO_EMPAQUETAR:-0}" != 1 ]; then
  echo "[datos] copiando"
  rm -rf "$STAGE" && mkdir -p "$STAGE"
  cp -r "$SRC/." "$STAGE/"
  rm -f "$STAGE/fonts/NotoSansCJKjp-Medium.otf" "$STAGE/fonts/MapoBackpacking.ttf"
  find "$STAGE" -name '*.po' ! -name 'es.po' ! -name 'es_AR.po' -delete

  echo "[datos] recomprimiendo la música"
  find "$STAGE/music" -name '*.ogg' -print0 | xargs -0 -P"${JOBS:-4}" -I{} sh -c 'oggdec -Q -o "{}.wav" "{}" && oggenc -Q -q 0 -o "{}" "{}.wav" && rm "{}.wav"'

  echo "[datos] optimizando imágenes"
  find "$STAGE" -name '*.png' -print0 | xargs -0 -P"${JOBS:-4}" -n 20 optipng -quiet -o2 -strip all
fi

du -sh "$STAGE"
du -sh "$STAGE"/* | sort -h | tail -6

echo "[datos] empaquetando"
rm -rf "$OUT_DIR" && mkdir -p "$OUT_DIR"
PACKAGER="$EMSDK/upstream/emscripten/tools/file_packager.py"
# file_packager escribe en el .js el nombre del .data tal como lo recibe (lo
# usa como clave): se llama desde OUT_DIR con nombres relativos, para que no
# quede la ruta de esta máquina.
pack() {  # pack <nombre> <rutas dentro de data...>
  local name="$1"; shift
  local args=()
  for path in "$@"; do args+=(--preload "$STAGE/$path@/data/$path"); done
  (cd "$OUT_DIR" && python3 "$PACKAGER" "$name.data" "${args[@]}" --use-preload-cache --no-node \
    --js-output="$name.js" > /dev/null)
}
pack imagenes-1 images/background images/creatures
others=$(cd "$STAGE/images" && ls | grep -v -x -e background -e creatures | sed 's|^|images/|')
# shellcheck disable=SC2086
pack imagenes-2 $others
pack musica music
rest=$(cd "$STAGE" && ls | grep -v -x -e images -e music)
# shellcheck disable=SC2086
pack resto $rest

ls -lh "$OUT_DIR"
for f in "$OUT_DIR"/*.data; do
  size=$(( $(stat -c %s "$f") / 1048576 ))
  if [ "$size" -ge "$MAX_MB" ]; then echo "ERROR: $f pesa $size MB (máximo $MAX_MB)"; exit 1; fi
done
if grep -q -e "$HOME" -e "$HERE" "$OUT_DIR"/*.js; then
  echo "ERROR: quedó una ruta de esta máquina en los paquetes"; exit 1
fi
echo "[datos] listo"
