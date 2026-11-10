# webports

Catálogo de juegos que corren en el navegador. Cada juego es código fuente
real compilado a WebAssembly: no hay emuladores, ROMs ni configuración.

Primer port: **Doom** (motor original de id Software) con los datos libres de
**Freedoom**, más la opción de jugar el Doom original aportando tu propio WAD.

## Correr en tu máquina

Necesitás Node.js 20 o superior.

```bash
npm install
```

```bash
npm run dev
```

Abrí la dirección que muestra la terminal (normalmente http://localhost:5173).

## Estructura

```
src/
  site.js              nombre del sitio, enlaces, mail de contacto
  data/games.js        el catálogo: una entrada por juego
  pages/               Home (catálogo) y GamePage (ficha + reproductor)
  components/          Player, paneles de controles y ajustes, tarjetas
  runtimes/doom/       JavaScript que conecta el .wasm con canvas, audio y controles
  lib/                 utilidades (localStorage, lectura de WAD, archivos locales)
public/games/doom/     doom.js + doom.wasm (motor compilado) y los datos de Freedoom
engines/doom/          código C del motor y script de compilación
```

## Agregar un juego

1. Sumá una entrada en `src/data/games.js`.
2. Si usa el motor de Doom, alcanza con apuntar `source` a otro WAD.
3. Si es un motor nuevo: el código y su script van en `engines/<motor>/`, el
   resultado compilado en `public/games/<motor>/` y el código que lo conecta
   con la página en `src/runtimes/<motor>/`.

Regla del catálogo: solo se hospedan datos con licencia libre (`source.type:
'hosted'`). Para juegos comerciales se usa `source.type: 'byo'`: el jugador
aporta su copia y el archivo no sale de su navegador.

## Publicar

El workflow `.github/workflows/deploy.yml` publica en GitHub Pages con cada
push a `main`. Solo hay que activarlo una vez: **Settings → Pages → Source →
GitHub Actions**.

## Licencias

- `engines/doom/` y los binarios `public/games/doom/doom.{js,wasm}`: GPL-2.0.
- Datos de Freedoom (`*.wadgz`, portadas): BSD-3, ver `public/games/doom/LICENSE-freedoom.txt`.
- DOOM es una marca de id Software. Este proyecto no está afiliado.
