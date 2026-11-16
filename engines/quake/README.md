# LibreQuake para navegador (FTEQW)

[FTEQW](https://github.com/fte-team/fteqw) (commit en `UPSTREAM_COMMIT`), un
motor libre derivado del código de Quake que id Software liberó en 1999. Trae
su propio objetivo para navegador (`make web-rel`). Con él se juega
[LibreQuake](https://github.com/lavenderdotpet/LibreQuake), un juego hecho
desde cero con datos libres, que se juega como Quake.

Licencia del motor: **GPL-2.0** (ver `LICENSE-fteqw`).

## Compilar

Corre en Linux; en Windows, con WSL, desde la raíz del repo:

```bash
wsl bash engines/quake/build.sh
```

Hace falta git, make, python3, curl, unzip y gzip. Usa Emscripten 6.0.1, el
mismo que OpenTTD, OpenJazz y RigelEngine
(`~/.cache/allgamesports/emsdk-6.0.1`). Deja en `public/games/quake/`:

- `ftewebgl.js` y `ftewebgl.wasm` (5,6 MB): el motor.
- `data/pak0.pakgz` y `data/pak1.pakgz` (25 MB en total): los dos paquetes de
  datos de LibreQuake, comprimidos con gzip. La extensión es `.pakgz` y no
  `.gz` por lo mismo que los `.wadgz` de Doom: con `.gz` algunos servidores
  agregan `Content-Encoding` y el navegador los descomprime solo.

## Cambios al código original

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `patches/0001-exportar-run-dependency.patch` (`engine/Makefile`) | Exporta `addRunDependency` y `removeRunDependency` | El arranque de FTEQW para navegador (`web/prejs.js`) las usa. Las versiones viejas de Emscripten las incluían siempre; la 6 solo si se piden. Sin esto, la página daba "addRunDependency is not defined" |

`build.sh` borra la salida antes de compilar: `make` no sabe que el parche
cambia las opciones de enlace y, si no, deja el archivo viejo.

## Cómo se conecta con la página

FTEQW trae su propia página (`fteshell.html`); acá se reemplaza por
`public/games/quake/play.html` y `play.js`, en un iframe
(`src/runtimes/iframe.js`).

- **Datos:** FTEQW recibe en `Module.files` un mapa de "ruta dentro del
  juego → contenido". `play.js` le pasa `id1/pak0.pak` e `id1/pak1.pak`
  como promesas que bajan el `.pakgz` y lo descomprimen
  (`DecompressionStream`).
- **Argumentos:** se pasa `Module.arguments = []` a propósito: si no,
  FTEQW toma argumentos de la dirección de la página (`?captura` se
  interpretaría como uno).
- **Salir:** al elegir "Quit", FTEQW llama a `Module.close()`; `play.js`
  avisa al reproductor.
- **Pausa:** FTEQW crea sus `AudioContext` por su cuenta y no los deja a
  mano. `play.js` envuelve el constructor para anotarlos y expone
  `window.quakeAudio` con `suspend` y `resume`. El bucle del juego no se
  frena (FTEQW lo maneja con su propio temporizador).
- **Partidas:** FTEQW las guarda solo, en `localStorage`, con claves que
  empiezan con `fte/` (una partida rápida pesa unos 43 KB). El límite de
  `localStorage` es de unos 5 MB por sitio.

`play.html?captura` conserva la imagen del canvas para sacar la portada.

### Para probar con teclas simuladas

FTEQW escucha el teclado en el documento **y** en el canvas. Una tecla real
llega una sola vez, pero un `KeyboardEvent` creado a mano y disparado sobre
el canvas pasa por los dos y el juego lo recibe doble (Esc abre el menú y lo
cierra enseguida). Para simular teclas, dispararlas sobre `document`.

El menú de FTEQW también responde al mouse: si el puntero queda encima de
una opción, Enter elige esa y no la del cursor del teclado.

## Datos del juego

**LibreQuake 0.09-beta**, versión "lite" (el primer episodio). Sale de
`lite.zip` de sus versiones publicadas en GitHub (SHA-256
`428e736b2f01d953e09a08c60bee975bdc4a0ac2219e97fa095c8af41754da83`). Se usan
`pak0.pak` y `pak1.pak`, sin modificar; solo se comprimen para la descarga.

### Licencia de los datos

Software libre de verdad, no shareware (ver `LICENSE-librequake.txt`):

- Modelos, texturas y sonidos: **BSD-3-Clause**.
- Código del juego (QuakeC, `progs.dat`) y `pop.lmp`: **GPL-2.0**.

Se puede redistribuir y modificar, conservando el aviso de copyright.

## Pendiente

- **Música.** Son 29 MB de archivos OGG aparte de los paquetes. Habría que
  bajarlos solo cuando se piden, en vez de todos al empezar.
- Los niveles del juego completo (la versión "full" pesa 116 MB).
- Escuchar los efectos de sonido con parlantes.
- Controles táctiles para celular.
