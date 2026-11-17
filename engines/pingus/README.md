# Pingus

Pingus (GPL-3.0 o posterior) compilado a WebAssembly. El código no se copia
al repo: `build.sh` clona el commit de `UPSTREAM_COMMIT` (rama de desarrollo
0.8.0, que ya trae soporte para navegador).

## Cómo se compila

En Linux (en Windows, WSL). Hace falta `git`, `cmake`, `curl` y el Emscripten
6.0.1 compartido (`~/.cache/allgamesports/emsdk-6.0.1`).

```bash
bash engines/pingus/build.sh
```

El proyecto trae su propio build para navegador (`mk/wasm`), pero lo arma con
Nix. `build.sh` hace lo mismo sin Nix:

1. Compila las dependencias con las versiones que fija el proyecto: SDL2
   2.30.3 y SDL2_image 2.8.2 (con los scripts de `mk/wasm/scripts`), zlib
   1.3.1 y libmodplug 0.8.9.0, que decodifica la música (módulos `.it` y
   `.s3m`). De glm usa solo los headers.
2. En lugar de libsigc++, usa el reemplazo de solo headers que el proyecto
   trae para Android (`mk/android/app/jni/sigc++`).
3. Compila el juego con las opciones de enlace de `mk/wasm/scripts/build-app.sh`
   y mete los datos en `pingus.data`, montados en `/data`.

No hay parches al código de Pingus.

## Trampas

- **libmodplug es de 2008** y su `configure` no conoce la plataforma
  `wasm32-unknown-emscripten`. Se le copian los `config.sub` y
  `config.guess` (los scripts que reconocen plataformas) de SDL2, que son
  nuevos.
- **Rutas de la máquina dentro del `.wasm`.** Los `assert` de C guardan la
  ruta de su archivo fuente. `build.sh` compila todo, dependencias
  incluidas, con `-ffile-prefix-map`, y al final falla si queda alguna.

## Cómo corre en la página

`public/games/pingus/play.html` carga `play.js` y el motor. `play.js`:

- monta el progreso en IndexedDB (`/pingus-user`) antes de `main()`; el
  código de Pingus deja esa parte para después;
- avisa al reproductor que está listo cuando `main()` termina de armar el
  bucle (`postRun`);
- conecta `Module.pauseMainLoop` y `resumeMainLoop` con las funciones de
  Emscripten que el build exporta, para la pausa del reproductor;
- junta el `AudioContext` de OpenAL para poder callarlo.

El juego dibuja en 4:3: la página escala el canvas sin deformarlo y sin
`object-fit`, para que SDL ubique bien el mouse.

## Licencias

- Código y datos: GPL-3.0 o posterior (`public/games/pingus/LICENSE-pingus.txt`).
  Lo declara el README del proyecto, y Debian lo distribuye en *main*.
- Música: módulos compuestos para el juego por H. Matthew Smith, Joseph
  Toscano y Yuri Sucupira (ver `AUTHORS-pingus.txt`).
