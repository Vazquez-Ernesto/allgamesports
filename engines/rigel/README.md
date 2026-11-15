# Duke Nukem II para navegador (RigelEngine)

[RigelEngine](https://github.com/lethal-guitar/RigelEngine) (commit en
`UPSTREAM_COMMIT`): un motor libre, escrito desde cero en C++, que lee los
archivos originales de Duke Nukem II (Apogee Software, 1993). Acá se compila
a WebAssembly con Emscripten.

Licencia del motor: **GPL-2.0** (ver `LICENSE-rigelengine.md`).

## Compilar

Corre en Linux; en Windows, con WSL, desde la raíz del repo:

```bash
wsl bash engines/rigel/build.sh
```

Hace falta git, cmake, make, python3, curl y unzip. Usa Emscripten 6.0.1, el
mismo que OpenTTD y OpenJazz (`~/.cache/allgamesports/emsdk-6.0.1`). Baja el
shareware, verifica su SHA-256 y deja en `public/games/rigel/`:
`RigelEngine.js`, `RigelEngine.wasm` (2,6 MB), `RigelEngine.data` (3,6 MB,
los datos del juego) y `4duke.zip` (el paquete original).

Es C++ con varias bibliotecas incluidas: tarda unos minutos.

## Cambios al código original

| Archivo | Qué cambia | Por qué |
|---|---|---|
| `patches/0001-avisar-al-reproductor.patch` (`src/emscripten_main.cpp`) | Al arrancar y al salir llama a `Module.onRigelReady` y `Module.onRigelExit` | El original mostraba y ocultaba carteles de su propia página, que acá no existe |
| `patches/0002-enlace-sin-pagina-propia.patch` (`src/CMakeLists.txt`) | Sale `RigelEngine.js` en vez de una página; suma IndexedDB y exporta `FS`, `IDBFS`, `addRunDependency` y `removeRunDependency` | El reproductor tiene su página y guarda el perfil del jugador |
| `patches/0003-perfil-sin-char-traits.patch` (`src/frontend/user_profile.cpp`) | El perfil guardado se le pasa a la biblioteca de JSON como `char` en vez de `unsigned char` | Esa biblioteca usa `std::char_traits<unsigned char>`, que las versiones nuevas de la biblioteca estándar de C++ eliminaron: no compilaba |

El tercero es, casi seguro, la razón por la que la versión web oficial de
RigelEngine está caída.

## Cómo se conecta con la página

Corre en un iframe (`src/runtimes/iframe.js`).
`public/games/rigel/play.js`:

1. Antes de que arranque el motor (`preRun`), monta `/libsdl` sobre
   IndexedDB: ahí guarda SDL las "preferencias" de cada programa, y ahí
   escribe RigelEngine su perfil (ajustes, partidas guardadas y puntajes).
   Lo hace esperar con una "dependencia" hasta que el perfil esté copiado.
2. Guarda cada 5 segundos y al salir.
3. Traduce los avisos del motor a `postMessage`.

El bucle del juego lo maneja el navegador (`emscripten_set_main_loop`), como
en OpenTTD: no hace falta Asyncify, y la pausa del reproductor usa
`Module.pauseMainLoop()`.

El canvas tiene un tamaño fijo y la página lo escala entero; cambiar el
tamaño de la ventana no rompe el dibujo.

`play.html?captura` conserva la imagen del canvas para sacar la portada.

## Datos del juego

**Duke Nukem II shareware 1.0** (Apogee Software, 1993): el primer episodio.
Sale de `4duke.zip`, el paquete original (SHA-256
`c94479ace93a8923615ddebea96bcd18242a3a31f54cdcbc84e02ca0ab685829`), bajado
de classicdosgames.com. Adentro trae un instalador (`DN2SW10.SHR`) que es, a
su vez, un `.zip` con los diez archivos del juego. Los diez van dentro de
`RigelEngine.data`, sin modificar.

### Licencia de los datos

`VENDOR.DOC`, que viene en el paquete (copiado como
`LICENSE-duke2-shareware.txt`):

- "Todos pueden, y se los alienta, a copiar, subir y pasar este Programa sin
  cobrar por él."
- Distribuirlo por servicio en línea no necesita permiso escrito.
- Hay que incluir todos los archivos tal como se publicaron, sin
  modificarlos, y no quitar avisos de copyright ni de marca.
- Toda descripción del programa tiene que incluir "Apogee".
- Solo vale para la versión marcada "shareware", con el episodio 1.

Cómo se cumple: van los diez archivos originales intactos, más el paquete
`4duke.zip` y la licencia al lado; la ficha nombra a Apogee y dice que es
shareware.

No es software libre. Si el titular de los derechos pidiera retirarlo, se
retira. Los otros tres episodios eran de pago y no se pueden sumar.

## Pendiente

- Escuchar el sonido y la música con parlantes.
- Las transiciones de pantalla (fundidos) no están implementadas en la
  versión web del motor; es una limitación suya.
- Saltar con Ctrl puede chocar con atajos del navegador (Ctrl+W).
- Controles táctiles para celular.
