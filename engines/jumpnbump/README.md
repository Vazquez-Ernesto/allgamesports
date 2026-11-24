# Jump 'n Bump para navegador

[Jump 'n Bump](https://gitlab.com/LibreGames/jumpnbump) 1.70 (versión en
`UPSTREAM_TAG`, commit en `UPSTREAM_COMMIT`), el juego de conejos de
Brainchild Design (DOS, 1998), compilado a WebAssembly con Emscripten.

Licencia: **GPL-2.0 o posterior**, código y datos. El readme original de 1998
ya permitía repartirlo: "We encourage you to spread this game to all your
friends! You are also allowed to put this game on your homepage, on CD:s and
magazines." En 1999 Brainchild liberó el código ("Do whatever you like with
it") y después quedó bajo GPL. Los cuatro textos van al lado del motor, en
`public/games/jumpnbump/`.

## Compilar

Hace falta Emscripten (`emcc` en el PATH; probado con 7.0.0), Node y git. En
Windows corre en Git Bash, sin WSL.

```bash
npm run build:jumpnbump
```

`build.sh` clona el tag del repositorio oficial (LibreGames, en GitLab),
verifica que apunte al commit esperado y aplica `patches/`. No se usa su
Makefile: se llama a emcc directo.

Deja en `public/games/jumpnbump/`: `jumpnbump.js`, `jumpnbump.wasm` (1,4 MB)
y `jumpnbump.data` (358 KB, el `jumpbump.dat` del juego), más las licencias.

## Los datos

El juego lee todo de un solo archivo, `jumpbump.dat`. Se arma con dos
herramientas de C del mismo repo (`gobpack` junta los cuadros de cada dibujo;
`jnbpack` empaqueta todo). En Windows no hay compilador de C nativo en Git
Bash, así que `build.sh` las compila con el mismo `emcc`, para Node
(`-sNODERAWFS=1`: ven los archivos reales de la máquina), y las corre con
`node`.

El repo se clona con `core.autocrlf=false`: Git para Windows bajaría los
`.txt` (como `levelmap.txt`, que va adentro del `.dat`) con fin de línea CRLF
y el archivo saldría distinto según la máquina.

## Cambios al código

| Archivo | Cambio | Por qué |
|---|---|---|
| `network.h` | `processKillPacket` y `serverSendKillPacket` se declaran fuera del `#ifdef USE_NET` | Se compila sin juego en red, y `main.c` y `network.c` las usan igual. Sin la declaración, clang corta con "conflicting types" |

Opciones de compilación que importan (explicadas en `build.sh`):

- Sin `USE_NET`: el juego en red usa SDL2_net, que abre sockets TCP; el
  navegador no los tiene. Para jugar en red habría que pasarlo a WebSocket o
  WebRTC (pendiente).
- `-sSDL2_MIXER_FORMATS=["mod"]`: la música son tres módulos `.mod`, que lee
  libmodplug. El juego los escribe en `/tmp` y SDL_mixer los abre de ahí.
- `-sDEFAULT_TO_CXX`: libmodplug es C++; sin esto faltan `new` y `delete` al
  enlazar.
- `-sASYNCIFY`: todos los bucles del juego pasan por `intr_sysupdate()`, que
  llama a `SDL_Delay` en cada vuelta. Con Asyncify esa espera le devuelve el
  control al navegador. No hace falta reescribir el bucle.

## Cómo se conecta con la página

| Archivo | Qué hace |
|---|---|
| `public/games/jumpnbump/play.html` | Página mínima con el canvas, que el reproductor abre en un iframe |
| `public/games/jumpnbump/play.js` | Arranca `main()` con `-dat /data/jumpbump.dat` y avisa a la página (`ready`, `error`, `exit`) |
| `src/runtimes/jumpnbump/index.js` | Crea el iframe (ver `src/runtimes/iframe.js`) |

No guarda nada: no tiene partidas ni ajustes, así que no monta IndexedDB y el
panel "Partidas" no aparece.

## Controles

Las teclas son por posición, como en un teclado QWERTY:

| Conejo | Izquierda | Saltar | Derecha |
|---|---|---|---|
| Jiffy | ← | ↑ | → |
| Dott | A | W | D |
| Fizz | J | I | L |
| Mijji | 4 (numérico) | 8 (numérico) | 6 (numérico) |

En la partida, 1 a 4 le pasan ese conejo a la computadora. Esc termina la
ronda; en el menú, cierra el juego. F12 también lo cierra (en el navegador
suele abrir las herramientas de desarrollo antes).

## Pendiente

- Juego en red (WebSocket o WebRTC en lugar de SDL2_net).
- Opción para jugar sin sangre (`-nogore`): el juego la trae; falta un lugar
  en el panel de ajustes para los motores en iframe.
