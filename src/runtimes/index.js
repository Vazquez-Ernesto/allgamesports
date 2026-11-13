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
import { startOpenttd } from './openttd/index.js'
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

const RUNTIMES = { doom, tyrian, scummvm, gameboy, wolf3d, openttd }

export function runtimeFor(engine) {
  const runtime = RUNTIMES[engine]
  if (!runtime) throw new Error(`No hay un runtime para el motor "${engine}".`)
  return runtime
}
