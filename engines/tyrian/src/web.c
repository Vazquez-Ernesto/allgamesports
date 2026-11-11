// OpenTyrian - capa para navegador (Emscripten + Asyncify).
//
// El juego original es una cadena de bucles que nunca devuelven el control
// (cada menu es un do { ... } while (!done)). En el navegador eso congela la
// pagina: solo se pinta y se reciben teclas cuando el codigo devuelve el
// control. Con Asyncify, emscripten_sleep() "pausa" la funcion C, deja que el
// navegador haga lo suyo y la retoma despues, sin reescribir los bucles.
//
// SDL_Delay ya duerme con emscripten_sleep. Aca se agrega una cesion
// periodica para los bucles que no esperan, la pausa y la salida.

#ifdef __EMSCRIPTEN__

#include "web.h"

#include "varz.h"

#include "SDL.h"

#include <emscripten.h>

// Cada cuanto se cede el control como minimo (un frame a 60 Hz).
#define WEB_YIELD_MS 16
#define WEB_PAUSE_POLL_MS 100

static int s_paused = 0;
static int s_stop_requested = 0;
static int s_exiting = 0;
static Uint32 s_last_yield = 0;

EM_JS(void, js_notify_exit, (int code), {
    if (Module.tyrian && Module.tyrian.onExit) Module.tyrian.onExit(code);
});

// JS: pausar o reanudar (con un panel del sitio abierto, el juego se congela).
EMSCRIPTEN_KEEPALIVE
void web_set_paused(int paused)
{
    s_paused = paused ? 1 : 0;
}

// JS: el jugador salio de la pagina o reinicio. El juego guarda y termina
// la proxima vez que pase por web_yield().
EMSCRIPTEN_KEEPALIVE
void web_request_stop(void)
{
    s_stop_requested = 1;
}

// Llamado en cada vuelta del bucle de eventos (handleSdlEvents).
void web_yield(void)
{
    if (s_stop_requested && !s_exiting)
    {
        JE_tyrianHalt(0); // guarda configuracion y partidas, y llama a web_exit
    }

    while (s_paused && !s_stop_requested)
    {
        emscripten_sleep(WEB_PAUSE_POLL_MS);
    }

    Uint32 now = SDL_GetTicks();
    if (now - s_last_yield >= WEB_YIELD_MS)
    {
        emscripten_sleep(0);
        s_last_yield = SDL_GetTicks();
    }
}

// Reemplaza a exit(): avisa a JS (para sincronizar las partidas guardadas)
// y termina el programa sin cerrar la pagina.
void web_exit(int code)
{
    s_exiting = 1;
    js_notify_exit(code);
    emscripten_force_exit(code);
}

#endif
