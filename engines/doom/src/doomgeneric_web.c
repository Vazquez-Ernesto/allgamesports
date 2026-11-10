// doomgeneric - capa de plataforma para navegador (Emscripten, sin SDL).
//
// Doom le pide 6 cosas a la plataforma: iniciar, dibujar un frame, dormir,
// leer el reloj, leer una tecla y cambiar el titulo. Aca cada una se resuelve
// llamando a JavaScript (EM_JS) o exponiendo una funcion para que JS la llame
// (EMSCRIPTEN_KEEPALIVE). Los callbacks de JS viven en Module.dg.

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <emscripten.h>

#include "d_event.h"
#include "doomgeneric.h"

// ---------------------------------------------------------------------------
// C -> JS
// ---------------------------------------------------------------------------

EM_JS(void, js_draw_frame, (const void *pixels, int width, int height), {
    Module.dg.drawFrame(pixels, width, height);
});

EM_JS(void, js_set_title, (const char *title), {
    if (Module.dg.setTitle) Module.dg.setTitle(UTF8ToString(title));
});

EM_JS(void, js_quit, (void), {
    if (Module.dg.quit) Module.dg.quit();
});

// ---------------------------------------------------------------------------
// Cola de teclas: JS empuja, Doom consume una vez por frame.
// ---------------------------------------------------------------------------

#define KEYQUEUE_SIZE 128

typedef struct
{
    unsigned char pressed;
    unsigned char key;      // tecla de Doom (ver doomkeys.h)
    unsigned char typed;    // caracter tipeado (para trucos y nombres de partida)
} queued_key_t;

static queued_key_t s_queue[KEYQUEUE_SIZE];
static unsigned int s_write = 0;
static unsigned int s_read = 0;

// Lo lee i_input.c para completar event.data2.
unsigned char DG_LastTypedChar = 0;

EMSCRIPTEN_KEEPALIVE
void dg_key(int pressed, int key, int typed)
{
    unsigned int next = (s_write + 1) % KEYQUEUE_SIZE;

    if (next == s_read)
    {
        return; // cola llena: se descarta
    }

    s_queue[s_write].pressed = pressed ? 1 : 0;
    s_queue[s_write].key = (unsigned char) key;
    s_queue[s_write].typed = (unsigned char) typed;
    s_write = next;
}

// Mouse: Doom ya entiende eventos ev_mouse, solo hay que publicarlos.
// JS llama a dg_mouse() en cada movimiento; aca se acumula y se publica UN
// evento por tic (Doom pisa el movimiento si le llegan varios en el mismo tic).
// buttons: bit 0 = izquierdo, bit 1 = derecho, bit 2 = medio.
static int s_mouse_buttons = 0;
static int s_mouse_dx = 0;
static int s_mouse_dirty = 0;

EMSCRIPTEN_KEEPALIVE
void dg_mouse(int buttons, int dx)
{
    s_mouse_buttons = buttons;
    s_mouse_dx += dx;
    s_mouse_dirty = 1;
}

// Llamado desde I_GetEvent (i_input.c), una vez por tic.
void DG_WebPumpMouse(void)
{
    event_t event;

    if (!s_mouse_dirty)
    {
        return;
    }

    event.type = ev_mouse;
    event.data1 = s_mouse_buttons;
    event.data2 = s_mouse_dx;
    event.data3 = 0; // sin movimiento vertical: en Doom eso camina, no mira
    event.data4 = 0;

    s_mouse_dx = 0;
    s_mouse_dirty = 0;

    D_PostEvent(&event);
}

// ---------------------------------------------------------------------------
// Interfaz que exige doomgeneric
// ---------------------------------------------------------------------------

void DG_Init(void)
{
}

void DG_DrawFrame(void)
{
    js_draw_frame(DG_ScreenBuffer, DOOMGENERIC_RESX, DOOMGENERIC_RESY);
}

void DG_SleepMs(uint32_t ms)
{
    // En el navegador no se puede bloquear el hilo principal: el ritmo lo
    // marca requestAnimationFrame desde JS.
    (void) ms;
}

uint32_t DG_GetTicksMs(void)
{
    return (uint32_t) emscripten_get_now();
}

int DG_GetKey(int *pressed, unsigned char *doomKey)
{
    if (s_read == s_write)
    {
        return 0;
    }

    *pressed = s_queue[s_read].pressed;
    *doomKey = s_queue[s_read].key;
    DG_LastTypedChar = s_queue[s_read].typed;
    s_read = (s_read + 1) % KEYQUEUE_SIZE;

    return 1;
}

void DG_SetWindowTitle(const char *title)
{
    js_set_title(title);
}

// Llamado desde I_Quit (i_system.c) cuando el jugador sale del juego.
void DG_WebQuit(void)
{
    js_quit();
}

// Punto de entrada que llama JS: recibe la linea de comandos como un solo
// texto ("doom -iwad /iwad/freedoom1.wad ...") y la separa en argumentos.
// Doom se queda con los punteros a argv, por eso se copia con strdup.
#define MAX_ARGS 32

EMSCRIPTEN_KEEPALIVE
void dg_start(const char *cmdline)
{
    static char *argv[MAX_ARGS];
    int argc = 0;
    char *copy = strdup(cmdline);
    char *token = strtok(copy, " ");

    while (token != NULL && argc < MAX_ARGS - 1)
    {
        argv[argc++] = token;
        token = strtok(NULL, " ");
    }

    argv[argc] = NULL;

    // Solo inicializa. Cada frame lo pide JS llamando a doomgeneric_Tick().
    doomgeneric_Create(argc, argv);
}

int main(void)
{
    // Nada: el juego arranca cuando JS llama a dg_start().
    return 0;
}
