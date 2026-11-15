# Jazz Jackrabbit para navegador (OpenJazz)

[OpenJazz](https://github.com/AlisterT/openjazz) (versión en `UPSTREAM_TAG`):
un motor libre, escrito desde cero en C++, que lee los archivos originales de
Jazz Jackrabbit (Epic MegaGames, 1994). Acá se compila a WebAssembly con
Emscripten.

Licencia del motor: **GPL-2.0** (ver `LICENSE-openjazz`).

## Compilar

Corre en Linux; en Windows, con WSL, desde la raíz del repo:

```bash
wsl bash engines/openjazz/build.sh
```

Hace falta git, cmake, make y python3. Usa Emscripten 6.0.1, el mismo que
OpenTTD: lo busca en `~/.cache/allgamesports/emsdk-6.0.1` y, si no está, lo
instala ahí. Deja `openjazz.js` y `openjazz.wasm` (1,4 MB) en
`public/games/openjazz/`.

## Cambios al código original

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `patches/0001-enlace-para-el-reproductor.patch` (`CMakeLists.txt`) | Opciones de enlace: sale `openjazz.js` en vez de una página propia; `INVOKE_RUN=0`; se exportan `FS`, `IDBFS` y `callMain` | El reproductor tiene su propia página: copia los datos del juego y recién ahí llama a `main()` |

El código del juego no se toca.

## Cómo se conecta con la página

Corre en un iframe (`src/runtimes/iframe.js`). Un mismo motor sirve tres
juegos; la página recibe cuál en el `#`: `play.html#jazz`, `#xmas94` o
`#xmas95`. `public/games/openjazz/play.js`:

1. Baja el paquete shareware original (un `.zip`) y lo descomprime en el
   navegador a `/data`, en memoria. Trae un lector de `.zip` mínimo.
2. Monta `/save-openjazz-<juego>` sobre IndexedDB y la deja como carpeta
   actual: ahí OpenJazz escribe su configuración.
3. Llama a `main()` con `--scale 2` y la carpeta de datos.

`--scale 2` hace que dibuje a 320x240 y lo agrande al doble, como se veía el
original. Sin eso usa 640x480 y los personajes quedan chiquitos.

Al elegir "Exit game" muestra los créditos originales y, con una tecla,
termina.

**No guarda partidas.** El menú "Save game" existe, pero OpenJazz solo sabe
leer las partidas del juego original; escribirlas no está implementado.

`play.html?captura#jazz` conserva la imagen del canvas para sacar la portada.

## Datos de los juegos

Los tres son paquetes shareware de Epic MegaGames, hospedados enteros y sin
modificar en `public/games/openjazz/`:

| Juego | Archivo | SHA-256 |
|---|---|---|
| Jazz Jackrabbit 1.1 (primer episodio) | `jazz.zip` | `ed025415c0bc5ebc3a41e7a070551bdfdfb0b65b5314241152d8bd31f87c22da` |
| Holiday Hare (1994) | `JAZZXMAS.ZIP` | `9035c04b3d49e11beb42fdf83452033772abece5a3395bbcc409d1174acb5881` |
| Holiday Hare 1995 | `JJXMAS95.ZIP` | `0ef00d258aa8036e5dcd28ca2dbb37c58b5a57376bbc0fced43c94e90793cba6` |

Origen: dosgamesarchive.com, el mismo sitio que usa el port web oficial de
OpenJazz (openjazz.github.io). Los dos especiales venían dentro de un zip de
ese sitio con archivos agregados; se hospeda el zip interior, que es el de
Epic.

### Licencia de los datos

Cada paquete trae su `LICENSE.DOC` (copiadas como
`LICENSE-jazz-shareware.txt` y `LICENSE-holiday-hare.txt`).

- **Jazz Jackrabbit 1.1:** Epic "permite y alienta" que los servicios en
  línea lo distribuyan, siempre que no se altere ni se quite ningún archivo.
- **Holiday Hare (las dos):** lo mismo, con más condiciones. Hay que
  repartir el paquete completo, sin modificar ni renombrar archivos;
  acreditar a Epic MegaGames como dueño; decir que es shareware (no "software
  libre" ni "de dominio público") y explicar qué es el shareware. No se puede
  cobrar por el programa.

Cómo se cumple: se hospeda el `.zip` original y se descomprime en el
navegador, sin tocar ni renombrar nada; las fichas dicen que es shareware,
explican el concepto y nombran a Epic MegaGames.

No son software libre. Si el titular de los derechos pidiera retirarlos, se
retiran.

Los otros episodios eran de pago y no se pueden sumar.

## Pendiente

- Escuchar el sonido y la música con parlantes.
- Guardar partidas: habría que implementarlo en el motor.
- Controles táctiles para celular.
