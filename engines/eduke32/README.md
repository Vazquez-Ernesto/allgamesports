# Duke Nukem 3D para navegador (EDuke32)

[EDuke32](https://www.eduke32.com/) es el motor libre de Duke Nukem 3D, que
parte del código que 3D Realms liberó en 2003. Acá se usa
[eduke32-wasm](https://github.com/DigitalCyberSoft/eduke32-wasm), un fork que
le suma un build para navegador con Emscripten.

Licencias:

- **EDuke32: GPL-2.0** (`LICENSE-eduke32.txt`).
- **Motor Build de Ken Silverman: licencia BUILD** (`BUILDLIC.TXT`). Permite
  repartirlo solo por internet, gratis y sin uso comercial, y pide incluir
  `BUILDLIC.TXT` y un aviso con su copyright. Los dos van al lado del motor en
  `public/games/eduke32/` (`BUILD-NOTICE.txt`). No es software libre en
  sentido estricto: se aceptó a propósito (ver `docs/CONTEXTO.md`).
- **Datos: el shareware 1.3D de 3D Realms** (`LICENSE-duke3d-shareware.txt`).
  Permite ofrecerlo gratis en sitios web, con todos sus archivos sin
  modificar, y no como servicio multijugador.

## Compilar

Corre en Linux (WSL), con el Emscripten 6.0.1 compartido.

```bash
wsl bash engines/eduke32/build.sh
```

Deja `eduke32.js` y `eduke32.wasm` en `public/games/eduke32/`, con el paquete
shareware original (`3dduke13.zip`, SHA-256 verificado) y los textos de
licencia. Compila con un solo proceso por defecto (`JOBS=1`): el enlace con
Asyncify usa mucha memoria.

## Por qué ese commit

`UPSTREAM_COMMIT` es `a0dc8ba` (3 de agosto de 2026), el último antes de que
el fork sumara su juego en red. Ya tiene los arreglos del port web
(`-fwrapv`, la pila de Asyncify de 16 MB, sin mimalloc) y, para Emscripten,
apaga la red de EDuke32 (`NETCODE := 0`). Los commits siguientes metieron
código de red sin `#ifdef` en `game.cpp`, `player.cpp`, `premap.cpp`,
`savegame.cpp`, `screens.cpp` y `menus.cpp`: sin `NETDUKE32=1` no compilan.
Se intentó parchearlos; eran unos 30 puntos y algunos sin ninguna condición
alrededor.

Lo que se pierde de commits posteriores: un arreglo del apuntado al cambiar
de ventana y el guardado de la configuración al cerrar el menú.

## De dónde salen los datos

`3dduke13.zip` se baja de archive.org. Es el oficial: coincide en tamaño
(5.924.374 bytes), MD5 y SHA-1 con el que lista Debian (game-data-packager,
`data/duke3d.yaml`). Adentro trae `DN3DSW13.SHR`, que es otro .zip con los 17
archivos del juego. Se hospeda el zip tal cual y `play.js` descomprime los
dos en el navegador (el mismo lector que OpenJazz).

## Cambios al código original

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `patches/0001-enlace-para-el-reproductor.patch` (`Common.mak`) | Suma `-sINVOKE_RUN=0`, `-lidbfs.js` y exporta `IDBFS` | `play.js` descomprime los datos y monta IndexedDB antes de llamar a `main()` |

`-ffile-prefix-map` entra por `CUSTOMOPT`, que el makefile suma a cada
compilación.

## Detalles

- **Carpetas:** los datos en `/duke3d` (`-j/duke3d`); la carpeta de trabajo
  es `/save-duke3d`, montada sobre IndexedDB. EDuke32 escribe ahí la
  configuración, las teclas (`settings.cfg`) y las partidas.
- **Primera configuración:** `play.js` escribe un `eduke32.cfg` en ventana de
  640x480 a 8 bits (sin eso puede arrancar en negro) y un `settings.cfg` con
  las teclas clásicas.
- **Teclas clásicas, a propósito.** Las modernas de EDuke32 avanzan con W y
  disparan con Ctrl: Ctrl+W cierra la pestaña y la página no lo puede
  evitar. Las clásicas (`oldkeydefaults` en `source/duke3d/src/_functio.h`)
  avanzan con las flechas. Se omiten W y T, funciones del multijugador que
  con Ctrl serían Ctrl+W y Ctrl+T. El clic también dispara
  (`mousedefaults`).
- **Teclas en pruebas automáticas:** el motor lee el teclado una vez por
  cuadro; una tecla simulada que baja y sube en el mismo cuadro se pierde.
  Sostenerla unos 150 ms.
- **Los menús siguen al mouse:** si el puntero queda sobre una opción, Enter
  elige esa.
- **Al salir** muestra las pantallas promocionales del shareware y recién
  después termina (el reproductor muestra "Saliste del juego").

## Qué se probó

Arranque, título, partida nueva en "Hollywood Holocaust", avanzar con las
flechas y disparar con Ctrl, guardar con F2 (queda en IndexedDB), recargar la
página y cargar la partida, pausa (el audio pasa a `suspended`) y salir.

No se escuchó el sonido ni se comprobó la música (el build web no trae
Vorbis ni FLAC; la música del shareware es MIDI). Pide 256 MB de memoria al
arrancar (`INITIAL_MEMORY` del fork): en celulares podría fallar.
