// Registro de motores: lo que el reproductor necesita saber de cada uno.
//
// Para sumar un motor nuevo, agregá una entrada con:
//   defaultSettings  ajustes del panel "Ajustes" (solo se muestran los que existan)
//   hint             atajos que se ven antes de jugar: [[teclas...], 'qué hacen']
//   defaultBindings  (opcional) teclas reasignables; si no hay, se muestra keyList
//   keyList          (opcional) controles fijos: [['tecla', 'qué hace']]
//   identifyFile     valida el archivo que aporta el jugador -> { fileName, title }
//   start(options)   arranca el motor -> { pause, resume, destroy, applySettings?, setBindings? }

import { startDoom } from './doom/index.js'
import { defaultBindings as doomBindings } from './doom/keys.js'
import { identifyTyrianZip, startTyrian } from './tyrian/index.js'
import { identifyWad } from '../lib/wad.js'

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
  identifyFile(bytes, name) {
    const { wadName, title } = identifyWad(bytes, name)
    return { fileName: wadName, title }
  },
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

const RUNTIMES = { doom, tyrian }

export function runtimeFor(engine) {
  const runtime = RUNTIMES[engine]
  if (!runtime) throw new Error(`No hay un runtime para el motor "${engine}".`)
  return runtime
}
