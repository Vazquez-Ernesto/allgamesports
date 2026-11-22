// Registro de motores: lo que el reproductor necesita saber de cada uno.
//
// Para sumar un motor nuevo, agregá una entrada con:
//   defaultSettings  ajustes del panel "Ajustes" (solo se muestran los que existan)
//   hint             atajos que se ven antes de jugar: [[teclas...], 'qué hacen']
//   defaultBindings  (opcional) teclas reasignables; si no hay, se muestra keyList
//   keyList          (opcional) controles fijos: [['tecla', 'qué hace']]
//   identifyFile     valida el archivo que aporta el jugador -> { fileName, title }
//   start(options)   arranca el motor -> { pause, resume, destroy, applySettings?, setBindings? }
//   surface          (opcional) 'iframe' si el motor corre en su propia página
//                    en vez de dibujar en el canvas del reproductor
//
// Un juego del catálogo puede traer su propio hint y keyList (ScummVM: cada
// juego usa teclas distintas).

import { startDoom } from './doom/index.js'
import { defaultBindings as doomBindings } from './doom/keys.js'
import { startGameBoy } from './gameboy/index.js'
import { startCrispyHeretic } from './crispy-heretic/index.js'
import { startEduke32 } from './eduke32/index.js'
import { startHeretic } from './heretic/index.js'
import { startNes } from './nes/index.js'
import { startOpenjazz } from './openjazz/index.js'
import { startOpenttd } from './openttd/index.js'
import { startQuake } from './quake/index.js'
import { startRigel } from './rigel/index.js'
import { startRott } from './rott/index.js'
import { startSupertux } from './supertux/index.js'
import { startPingus } from './pingus/index.js'
import { startScummvm } from './scummvm/index.js'
import { identifyTyrianZip, startTyrian } from './tyrian/index.js'
import { startWolf3d } from './wolf3d/index.js'

const doom = {
  defaultSettings: {
    volume: 0.8,
    mouseLook: true,
    mouseSensitivity: 1,
    sharpPixels: true,
    aspect: '4 / 3', // así se veía en un monitor de la época
  },
  hint: [
    [['W', 'A', 'S', 'D'], 'mover'],
    [['Mouse'], 'girar'],
    [['Espacio'], 'o clic disparar'],
    [['E'], 'usar'],
  ],
  defaultBindings: doomBindings,
  async start({ data, fileName, ...options }) {
    const running = await startDoom({ ...options, wad: data, wadName: fileName })
    return {
      ...running,
      applySettings(settings) {
        running.setVolume(settings.volume)
        running.input.setMouseSensitivity(settings.mouseSensitivity)
        running.input.setMouseLook(settings.mouseLook)
      },
      setBindings: (bindings) => running.input.setBindings(bindings),
    }
  },
}

const tyrian = {
  defaultSettings: {
    sharpPixels: true,
    aspect: '4 / 3',
  },
  hint: [
    [['←', '↑', '↓', '→'], 'mover'],
    [['Espacio'], 'disparar'],
    [['Esc'], 'menú'],
  ],
  keyList: [
    ['Flechas', 'Mover la nave'],
    ['Espacio', 'Disparar'],
    ['Enter', 'Cambiar el modo del arma trasera'],
    ['Ctrl izq.', 'Sidekick izquierdo'],
    ['Alt izq.', 'Sidekick derecho'],
    ['P', 'Pausa'],
    ['Esc', 'Menú (opciones, guardar, salir)'],
    ['F1', 'Ayuda'],
  ],
  keyNote: 'Las teclas se cambian dentro del juego, en el menú entre misiones: Options.',
  identifyFile: (bytes) => identifyTyrianZip(bytes),
  start: ({ canvas, data, saveKey, onQuit, onError }) => startTyrian({ canvas, data, saveKey, onQuit, onError }),
}

// Las teclas de cada juego están en su entrada de src/data/games.js.
const scummvm = {
  surface: 'iframe',
  defaultSettings: {}, // ScummVM escala y suaviza por su cuenta
  keyNote: 'ScummVM tiene además su menú general con Ctrl+F5.',
  start: ({ frame, game, onQuit, onError }) =>
    startScummvm({ frame, gameId: game.source.gameId, args: game.source.args, onQuit, onError }),
}

// Game Boy y Game Boy Color, sobre el emulador binjgb.
const gameboy = {
  defaultSettings: {
    volume: 0.8,
    sharpPixels: true,
  },
  hint: [
    [['←', '↑', '↓', '→'], 'cruz'],
    [['X'], 'botón A'],
    [['Z'], 'botón B'],
    [['Enter'], 'Start'],
  ],
  keyList: [
    ['Flechas', 'Cruz de la consola'],
    ['X', 'Botón A'],
    ['Z', 'Botón B'],
    ['Enter', 'Start'],
    ['Shift', 'Select'],
  ],
  keyNote: 'También funciona con un mando conectado. Qué hace cada botón depende del juego: está en su ficha.',
  start: ({ canvas, data, saveKey, settings }) => startGameBoy({ canvas, data, saveKey, settings }),
}

// Wolfenstein 3D sobre Wolf4SDL: corre en su propia página, como ScummVM.
const wolf3d = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['←', '↑', '↓', '→'], 'mover y girar'],
    [['Ctrl'], 'disparar'],
    [['Espacio'], 'abrir puertas'],
    [['Esc'], 'menú'],
  ],
  keyList: [
    ['Flechas', 'Avanzar, retroceder y girar'],
    ['Ctrl', 'Disparar'],
    ['Espacio', 'Abrir puertas y buscar pasajes secretos'],
    ['Shift', 'Correr'],
    ['Alt + flechas', 'Moverse de costado'],
    ['1 a 4', 'Elegir arma'],
    ['Esc', 'Menú (guardar, cargar, opciones, salir)'],
    ['Enter', 'Aceptar en los menús'],
  ],
  keyNote: 'Las teclas se cambian dentro del juego: Esc, Control, Customize controls.',
  start: ({ frame, onQuit, onError }) => startWolf3d({ frame, onQuit, onError }),
}

// OpenTTD: se juega casi todo con el mouse; corre en su propia página.
const openttd = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['Mouse'], 'todo se maneja con clics'],
    [['Clic derecho'], 'arrastrar el mapa'],
    [['Rueda'], 'acercar y alejar'],
  ],
  keyList: [
    ['Clic izquierdo', 'Elegir, construir y abrir ventanas'],
    ['Clic derecho (mantener)', 'Arrastrar el mapa; sobre un botón, muestra para qué sirve'],
    ['Rueda del mouse', 'Acercar y alejar'],
    ['Flechas', 'Mover el mapa'],
    ['Pausa o F1', 'Pausar el juego'],
    ['Supr', 'Cerrar todas las ventanas'],
  ],
  keyNote: 'Para salir: el botón del disquete, arriba a la izquierda, y después "Salir".',
  start: ({ frame, onQuit, onError }) => startOpenttd({ frame, onQuit, onError }),
}

// Heretic sobre Chocolate Heretic: corre en su propia página.
const heretic = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['←', '↑', '↓', '→'], 'mover y girar'],
    [['Ctrl'], 'atacar'],
    [['Espacio'], 'abrir puertas'],
    [['Enter'], 'usar objeto'],
  ],
  keyList: [
    ['Flechas', 'Avanzar, retroceder y girar'],
    ['Mouse', 'Girar (hacé clic en el juego para activarlo; Esc lo suelta)'],
    ['Ctrl o clic', 'Atacar'],
    ['Espacio', 'Abrir puertas y accionar interruptores'],
    ['Shift', 'Correr'],
    ['Alt + flechas', 'Moverse de costado'],
    ['[ y ]', 'Elegir un objeto del inventario'],
    ['Enter', 'Usar el objeto elegido'],
    ['1 a 7', 'Elegir arma'],
    ['Tab', 'Mapa'],
    ['Esc', 'Menú (guardar, cargar, opciones, salir)'],
  ],
  start: ({ frame, onQuit, onError }) => startHeretic({ frame, onQuit, onError }),
}

// Duke Nukem 3D sobre EDuke32. Teclas: las originales del juego, que EDuke32
// trae como "clásicas" y play.js deja configuradas (con las modernas, avanzar
// con W y disparar con Ctrl es Ctrl+W: el navegador cierra la pestaña).
const eduke32 = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['←', '↑', '↓', '→'], 'mover y girar'],
    [['Ctrl'], 'disparar'],
    [['Espacio'], 'abrir, usar'],
    [['A'], 'saltar'],
  ],
  keyList: [
    ['Flechas', 'Avanzar, retroceder y girar'],
    ['Mouse', 'Apuntar (hacé clic en el juego para activarlo; Esc lo suelta)'],
    ['Ctrl o clic', 'Disparar'],
    ['Espacio', 'Abrir puertas, usar interruptores'],
    ['A / Z', 'Saltar / agacharse'],
    ['Shift', 'Correr (Bloq Mayús: correr siempre)'],
    [', y . (o Alt + flechas)', 'Moverse de costado'],
    ['RePág / AvPág', 'Mirar hacia arriba / hacia abajo'],
    ['1 a 0', 'Elegir arma'],
    ['[ y ] / Enter', 'Elegir y usar un objeto del inventario'],
    ['M / N / J', 'Botiquín / visión nocturna / jetpack'],
    ['Tab', 'Mapa'],
    ['F2 / F3', 'Guardar / cargar partida'],
    ['Esc', 'Menú'],
  ],
  start: ({ frame, onQuit, onError }) => startEduke32({ frame, onQuit, onError }),
}

// Blasphemer sobre Crispy Heretic: las teclas de Heretic más las que Crispy
// suma por defecto (WASD y Bloq Mayús; ver m_controls.c de Crispy Doom).
const crispyHeretic = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['←', '↑', '↓', '→'], 'mover y girar'],
    [['Ctrl'], 'atacar'],
    [['Espacio'], 'abrir puertas'],
    [['Enter'], 'usar objeto'],
  ],
  keyList: [
    ['Flechas', 'Avanzar, retroceder y girar'],
    ['W A S D', 'Avanzar, retroceder y moverse de costado (con estas, atacá con el clic: Ctrl+W cierra la pestaña)'],
    ['Mouse', 'Girar (hacé clic en el juego para activarlo; Esc lo suelta)'],
    ['Ctrl o clic', 'Atacar'],
    ['Espacio', 'Abrir puertas y accionar interruptores'],
    ['Shift', 'Correr (Bloq Mayús: correr siempre)'],
    ['RePág / Supr', 'Mirar hacia arriba / hacia abajo (Fin: al frente)'],
    ['[ y ]', 'Elegir un objeto del inventario'],
    ['Enter', 'Usar el objeto elegido'],
    ['1 a 7', 'Elegir arma'],
    ['Tab', 'Mapa'],
    ['Esc', 'Menú (guardar, cargar, opciones, salir)'],
  ],
  start: ({ frame, onQuit, onError }) => startCrispyHeretic({ frame, onQuit, onError }),
}

// Jazz Jackrabbit sobre OpenJazz: corre en su propia página.
const openjazz = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['←', '→'], 'correr'],
    [['Espacio'], 'saltar'],
    [['Alt'], 'disparar'],
    [['Esc'], 'menú'],
  ],
  keyList: [
    ['Flechas izquierda y derecha', 'Correr'],
    ['Flechas arriba y abajo', 'Mirar hacia arriba y agacharse'],
    ['Espacio', 'Saltar'],
    ['Alt izquierdo', 'Disparar'],
    ['Ctrl derecho', 'Cambiar de arma'],
    ['1 a 5', 'Elegir arma'],
    ['P', 'Pausa'],
    ['Esc', 'Menú (opciones, salir)'],
    ['Enter', 'Aceptar en los menús'],
  ],
  keyNote: 'Las teclas se cambian dentro del juego: Esc, Setup options. El juego no guarda partidas.',
  start: ({ frame, game, onQuit, onError }) =>
    startOpenjazz({ frame, gameId: game.source.gameId, onQuit, onError }),
}

// NES, sobre el emulador binjnes (mismo autor y mismos controles que Game Boy).
const nes = {
  defaultSettings: {
    volume: 0.8,
    sharpPixels: true,
  },
  hint: [
    [['←', '↑', '↓', '→'], 'cruz'],
    [['X'], 'botón A'],
    [['Z'], 'botón B'],
    [['Enter'], 'Start'],
  ],
  keyList: [
    ['Flechas', 'Cruz del control'],
    ['X', 'Botón A'],
    ['Z', 'Botón B'],
    ['Enter', 'Start'],
    ['Shift', 'Select'],
  ],
  keyNote: 'También funciona con mandos: el segundo es el jugador 2. Qué hace cada botón depende del juego: está en su ficha.',
  start: ({ canvas, data, saveKey, settings }) => startNes({ canvas, data, saveKey, settings }),
}

// Duke Nukem II sobre RigelEngine: corre en su propia página.
const rigel = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['←', '→'], 'caminar'],
    [['Ctrl'], 'saltar'],
    [['Alt'], 'disparar'],
    [['Esc'], 'menú'],
  ],
  keyList: [
    ['Flechas izquierda y derecha', 'Caminar'],
    ['Flecha arriba', 'Apuntar hacia arriba, subir escaleras y usar puertas o palancas'],
    ['Flecha abajo', 'Agacharse y apuntar hacia abajo en el aire'],
    ['Ctrl izquierdo', 'Saltar'],
    ['Alt izquierdo', 'Disparar'],
    ['Esc', 'Menú (guardar, cargar, opciones, salir)'],
    ['Enter', 'Aceptar en los menús'],
  ],
  keyNote: 'Las teclas se cambian dentro del juego: Esc, Options, Keyboard controls.',
  start: ({ frame, onQuit, onError }) => startRigel({ frame, onQuit, onError }),
}

// Rise of the Triad sobre taradino: corre en su propia página.
const rott = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['←', '↑', '↓', '→'], 'mover y girar'],
    [['Ctrl'], 'disparar'],
    [['Espacio'], 'abrir puertas'],
    [['Esc'], 'menú'],
  ],
  keyList: [
    ['Flechas', 'Avanzar, retroceder y girar'],
    ['Ctrl', 'Disparar'],
    ['Espacio', 'Abrir puertas y accionar interruptores'],
    ['Shift', 'Correr'],
    ['Alt + flechas, o coma y punto', 'Moverse de costado'],
    ['Re Pág y Av Pág', 'Mirar hacia arriba y hacia abajo'],
    ['1 a 4', 'Elegir arma'],
    ['Enter', 'Cambiar de arma'],
    ['Esc', 'Menú (guardar, cargar, opciones, salir)'],
  ],
  keyNote: 'Las teclas se cambian dentro del juego: Esc, Options, Customize Controls.',
  start: ({ frame, onQuit, onError }) => startRott({ frame, onQuit, onError }),
}

// LibreQuake sobre FTEQW: corre en su propia página.
const quake = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['W', 'A', 'S', 'D'], 'mover'],
    [['Mouse'], 'apuntar'],
    [['Clic'], 'disparar'],
    [['Espacio'], 'saltar'],
  ],
  keyList: [
    ['W, A, S, D', 'Moverse (también con las flechas)'],
    ['Mouse', 'Apuntar (hacé clic en el juego para que tome el mouse; Esc lo suelta)'],
    ['Clic izquierdo o Ctrl', 'Disparar'],
    ['Espacio', 'Saltar y nadar hacia arriba'],
    ['Shift', 'Correr'],
    ['1 a 8, o la rueda', 'Elegir arma'],
    ['Esc', 'Menú (guardar, cargar, opciones, salir)'],
  ],
  keyNote: 'Las teclas se cambian dentro del juego: Esc, Options.',
  start: ({ frame, onQuit, onError }) => startQuake({ frame, onQuit, onError }),
}

// SuperTux: corre en su propia página.
const supertux = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['←', '→'], 'caminar'],
    [['Espacio'], 'saltar'],
    [['Ctrl'], 'acción'],
    [['Esc'], 'menú'],
  ],
  keyList: [
    ['← →', 'Caminar (con Ctrl apretado, correr)'],
    ['↑ ↓', 'Mirar arriba y abajo; ↓ también agacharse'],
    ['Espacio', 'Saltar (más alto si lo mantenés)'],
    ['Ctrl', 'Correr, disparar y agarrar cosas'],
    ['Esc', 'Menú (opciones, salir del nivel)'],
    ['En el mapa: flechas y Enter', 'Elegir nivel y entrar'],
  ],
  keyNote: 'Las teclas y el mando se configuran dentro del juego: Opciones, Controles.',
  start: ({ frame, onQuit, onError }) => startSupertux({ frame, onQuit, onError }),
}

// Pingus: corre en su propia página.
const pingus = {
  surface: 'iframe',
  defaultSettings: {},
  hint: [
    [['Clic'], 'dar una tarea'],
    [['1', '…', '0'], 'elegir tarea'],
    [['Espacio'], 'acelerar'],
    [['Esc'], 'menú'],
  ],
  keyList: [
    ['Clic izquierdo', 'Elegir una tarea abajo y dársela a un pingüino'],
    ['1 a 0, Tab o la rueda', 'Cambiar de tarea'],
    ['Flechas', 'Mover la vista por el nivel'],
    ['Espacio o F', 'Acelerar mientras lo mantenés'],
    ['P', 'Pausa'],
    ['S', 'Avanzar un paso (en pausa)'],
    ['A', 'Armagedón: hace explotar a todos (para reintentar)'],
    ['Esc', 'Menú (salir del nivel)'],
  ],
  start: ({ frame, onQuit, onError }) => startPingus({ frame, onQuit, onError }),
}

const RUNTIMES = {
  doom, tyrian, scummvm, gameboy, nes, wolf3d, openttd, heretic, openjazz, rigel, rott, quake, supertux, pingus,
  'crispy-heretic': crispyHeretic,
  eduke32,
}

export function runtimeFor(engine) {
  const runtime = RUNTIMES[engine]
  if (!runtime) throw new Error(`No hay un runtime para el motor "${engine}".`)
  return runtime
}
