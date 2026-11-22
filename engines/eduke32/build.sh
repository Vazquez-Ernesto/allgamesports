#!/usr/bin/env bash
# Compila EDuke32 (Duke Nukem 3D) a WebAssembly y prepara el shareware.
#
# Corre en Linux (WSL). Usa el Emscripten 6.0.1 compartido con otros motores
# (~/.cache/allgamesports/emsdk-6.0.1; ver engines/openttd/build.sh).
#
# El código es eduke32-wasm, un fork de EDuke32 con build para navegador. Se
# clona el commit de UPSTREAM_COMMIT y se aplica patches/. Ese commit es el
# último ANTES de que el fork sumara su juego en red: ya tiene los arreglos
# del port web (-fwrapv, pila de Asyncify) y para Emscripten apaga la red
# (NETCODE := 0). Los commits siguientes no compilan sin red. Sin red es lo
# que pide la licencia del shareware: nada de servicio multijugador.
#
# Salida: ../../public/games/eduke32/eduke32.{js,wasm}, el paquete shareware
#         original (3dduke13.zip) y los textos de licencia.
set -euo pipefail

cd "$(dirname "$0")"
HERE="$(pwd)"
OUT_DIR="$HERE/../../public/games/eduke32"
COMMIT="$(cat UPSTREAM_COMMIT)"
EMSDK="${EMSDK_DIR:-$HOME/.cache/allgamesports/emsdk-6.0.1}"
WORK="${EDUKE32_WORK:-$HOME/.cache/allgamesports/eduke32}"
SRC="$WORK/src"

# Paquete shareware 1.3D de 3D Realms. El zip de archive.org es el oficial:
# coincide en tamaño, MD5 y SHA-1 con el 3dduke13.zip que lista Debian
# (game-data-packager, data/duke3d.yaml).
PKG_URL="https://archive.org/download/3dduke13SW/Files/v1.3d%20%281998%20Repack%29/3dduke13SW.zip"
PKG_SHA256="c67efd179022bc6d9bde54f404c707cbcbdc15423c20be72e277bc2bdddf3d0e"

# Caché por defecto de Emscripten, a propósito (ver engines/crispy-heretic).
# shellcheck disable=SC1091
source "$EMSDK/emsdk_env.sh" > /dev/null 2>&1
unset EM_CACHE

clone_engine() {
  [ -d "$SRC" ] || git clone -q https://github.com/DigitalCyberSoft/eduke32-wasm.git "$SRC"
  git -C "$SRC" checkout -q -f "$COMMIT"
  for patch in "$HERE"/patches/*.patch; do
    git -C "$SRC" apply "$patch"
  done
}

# GAME_DATA vacío: los datos no van dentro del motor; play.js baja el paquete
# original y lo descomprime en el navegador. CUSTOMOPT llega a cada
# compilación y al enlace: -ffile-prefix-map saca la ruta de esta máquina.
# JOBS=1 por defecto: el enlace con Asyncify usa mucha memoria.
build_engine() {
  cd "$SRC"
  # make no sabe que cambiaron las opciones de enlace: se borra la salida.
  rm -f eduke32.js eduke32.wasm eduke32.data
  make PLATFORM=EMSCRIPTEN EM_SINGLE_FILE=0 GAME_DATA= \
    CUSTOMOPT="-ffile-prefix-map=$SRC/=" -j"${JOBS:-1}"
  cp eduke32.js eduke32.wasm "$OUT_DIR/"
  cd "$HERE"
}

# El paquete va completo y sin modificar, como pide su LICENSE.TXT. Al lado,
# legibles, esa licencia y las del motor (BUILDLIC.TXT pide ir con el motor,
# junto con el aviso de Ken Silverman).
prepare_data() {
  curl -fsSL -o "$WORK/3dduke13.zip" "$PKG_URL"
  echo "$PKG_SHA256  $WORK/3dduke13.zip" | sha256sum -c --quiet - || { echo "ERROR: el SHA-256 del paquete no coincide"; exit 1; }
  cp "$WORK/3dduke13.zip" "$OUT_DIR/3dduke13.zip"
  unzip -p "$WORK/3dduke13.zip" LICENSE.TXT > "$OUT_DIR/LICENSE-duke3d-shareware.txt"
  cp "$HERE/BUILDLIC.TXT" "$HERE/LICENSE-eduke32.txt" "$OUT_DIR/"
  cat > "$OUT_DIR/BUILD-NOTICE.txt" <<'EOF'
// "Build Engine & Tools" Copyright (c) 1993-1997 Ken Silverman
// Ken Silverman's official web site: "http://www.advsys.net/ken"
// See the included license file "BUILDLIC.TXT" for license info.
EOF
}

check_paths() {
  if grep -q -e "$HOME" -e "$HERE" "$OUT_DIR/eduke32.wasm" "$OUT_DIR/eduke32.js"; then
    echo "ERROR: quedó una ruta de esta máquina en el motor"; exit 1
  fi
}

mkdir -p "$WORK" "$OUT_DIR"
echo "[eduke32] código ($COMMIT)"; clone_engine
echo "[eduke32] datos"; prepare_data
echo "[eduke32] motor"; build_engine
check_paths
ls -lh "$OUT_DIR"
