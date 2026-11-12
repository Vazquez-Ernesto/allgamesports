# Motor de Tomb Raider para navegador (OpenLara)

[OpenLara](https://github.com/XProger/OpenLara) (commit en `UPSTREAM_COMMIT`)
compilado a WebAssembly con Emscripten. Es una reconstrucción libre del motor
de Tomb Raider: no es un emulador de PlayStation. Lee los niveles del disco
original y los dibuja con WebGL.

Licencia: **BSD-2-Clause** (ver `LICENSE-openlara`).

Los datos del juego **no** están en el repositorio ni se hospedan: Tomb
Raider es un juego comercial. El jugador carga la imagen de su disco de
PlayStation.

## Compilar

Hace falta Emscripten (`emcc` en el PATH; probado con 7.0.0) y git.

```bash
npm run build:openlara
```

Deja `openlara.js` y `openlara.wasm` en `public/games/openlara/`. Como con
ScummVM, el código no se copia al repo: `build.sh` clona el commit fijado en
una carpeta de trabajo. No lleva parches.

## Cómo está hecho el port

OpenLara ya trae un port web (`src/platform/web`). Lo que se agrega acá:

| Archivo | Qué hace |
|---|---|
| `public/games/openlara/play.html`, `play.js` | Página del motor dentro del iframe: recibe los archivos del jugador, los escribe y llama a `main()`; conecta el sonido con Web Audio |
| `src/runtimes/openlara/index.js` | Lee el disco del jugador, guarda solo lo que hace falta y arranca el iframe |
| `src/lib/iso9660.js` | Lector de imágenes de CD: saca archivos de un `.bin`/`.img`/`.iso` sin cargarlo entero en memoria |

Cómo llegan los datos:

1. El jugador elige la imagen de su disco (puede pesar más de 500 MB).
2. `iso9660.js` lee la lista de archivos y saca solo `PSXDATA/*.PSX`
   (niveles) y `DELDATA/*.RAW` (pantallas de carga).
3. Se guardan juntos en un `.zip` sin comprimir, en el navegador (OPFS).
4. Al jugar, se escriben en el sistema de archivos del motor con las mismas
   carpetas del disco. OpenLara busca `PSXDATA/GYM.PSX` y, si está, se
   configura solo como Tomb Raider de PlayStation.

## Flags de compilación que importan

- `-sDISABLE_DEPRECATED_FIND_EVENT_TARGET_BEHAVIOR=0`: el port web registra
  teclado y canvas con el destino `0`, una forma vieja que el Emscripten
  actual desactiva por defecto. Sin este flag no hay teclado.
- `-sINVOKE_RUN=0`: `main()` se llama después de escribir los archivos.
- `--profiling-funcs`: nombres de funciones en el `.wasm`, para leer errores.

## Qué se probó y qué no

Probado: la compilación, el lector de discos (con una imagen de prueba en
formato `.iso` y en `.bin` crudo de PlayStation, comparando cada archivo), y
el camino completo hasta que el motor arranca y recibe los archivos.

**No probado con un disco real de Tomb Raider.** Falta ver el juego andando.

## Pendiente

- Música: en el disco de PlayStation son pistas de audio de CD. OpenLara las
  espera como `track_NN.ogg`; habría que leerlas de la imagen y convertirlas.
- Videos (`FMV/*.FMV`): usan otro tipo de sector del disco, que el lector
  todavía no lee.
- Tomb Raider II y III: OpenLara los soporta en parte.
