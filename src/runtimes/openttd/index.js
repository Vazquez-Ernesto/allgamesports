// Runtime de OpenTTD: corre la página games/openttd/play.html en un iframe
// (ver ../iframe.js). El motor y sus gráficos libres bajan juntos.

import { startIframeEngine } from '../iframe.js'

const ENGINE_DIR = `${import.meta.env.BASE_URL}games/openttd/`

export function startOpenttd({ frame, onQuit, onError }) {
  return startIframeEngine({
    frame,
    name: 'OpenTTD',
    source: 'openttd',
    src: `${ENGINE_DIR}play.html`,
    audioContextOf: (win) => win.Module?.SDL2?.audioContext,
    pausesMainLoop: true,
    onQuit,
    onError,
  })
}
