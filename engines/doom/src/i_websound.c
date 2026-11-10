// Modulo de sonido para navegador.
//
// Doom guarda cada efecto en el WAD como un "lump" en formato DMX: 8 bytes de
// cabecera y despues audio PCM de 8 bits sin signo, casi siempre a 11025 Hz.
// Aca solo se valida la cabecera y se le pasa el audio a JavaScript, que lo
// reproduce con Web Audio (ver Module.dg.sfx* del lado web).

#include <stdio.h>
#include <string.h>

#include <emscripten.h>

#include "deh_str.h"
#include "i_sound.h"
#include "m_misc.h"
#include "w_wad.h"
#include "z_zone.h"

#define NUM_CHANNELS 16

EM_JS(int, js_sfx_is_cached, (int lumpnum), {
    return Module.dg.sfxIsCached(lumpnum) ? 1 : 0;
});

EM_JS(void, js_sfx_load, (int lumpnum, const void *samples, int length, int samplerate), {
    Module.dg.sfxLoad(lumpnum, samples, length, samplerate);
});

EM_JS(void, js_sfx_play, (int channel, int lumpnum, int vol, int sep), {
    Module.dg.sfxPlay(channel, lumpnum, vol, sep);
});

EM_JS(void, js_sfx_stop, (int channel), {
    Module.dg.sfxStop(channel);
});

EM_JS(int, js_sfx_is_playing, (int channel), {
    return Module.dg.sfxIsPlaying(channel) ? 1 : 0;
});

EM_JS(void, js_sfx_update, (int channel, int vol, int sep), {
    Module.dg.sfxUpdate(channel, vol, sep);
});

static boolean use_sfx_prefix;

static void GetSfxLumpName(sfxinfo_t *sfx, char *buf, size_t buf_len)
{
    // Los sonidos "link" reutilizan el lump de otro sonido.
    if (sfx->link != NULL)
    {
        sfx = sfx->link;
    }

    if (use_sfx_prefix)
    {
        M_snprintf(buf, buf_len, "ds%s", DEH_String(sfx->name));
    }
    else
    {
        M_StringCopy(buf, DEH_String(sfx->name), buf_len);
    }
}

// Carga el lump y se lo manda a JS. Devuelve false si no es un sonido valido.
static boolean CacheSfx(sfxinfo_t *sfxinfo)
{
    int lumpnum = sfxinfo->lumpnum;
    unsigned int lumplen;
    unsigned int length;
    int samplerate;
    byte *data;

    if (js_sfx_is_cached(lumpnum))
    {
        return true;
    }

    data = W_CacheLumpNum(lumpnum, PU_STATIC);
    lumplen = W_LumpLength(lumpnum);

    // Cabecera DMX: formato 3, frecuencia (16 bits), cantidad de muestras (32 bits).
    if (lumplen < 8 || data[0] != 0x03 || data[1] != 0x00)
    {
        W_ReleaseLumpNum(lumpnum);
        return false;
    }

    samplerate = (data[3] << 8) | data[2];
    length = (data[7] << 24) | (data[6] << 16) | (data[5] << 8) | data[4];

    // La libreria DMX original ignora los primeros y ultimos 16 bytes.
    if (length > lumplen - 8 || length <= 48)
    {
        W_ReleaseLumpNum(lumpnum);
        return false;
    }

    js_sfx_load(lumpnum, data + 8 + 16, (int) (length - 32), samplerate);

    W_ReleaseLumpNum(lumpnum);
    return true;
}

static boolean I_Web_InitSound(boolean _use_sfx_prefix)
{
    use_sfx_prefix = _use_sfx_prefix;
    return true;
}

static void I_Web_ShutdownSound(void)
{
    int i;

    for (i = 0; i < NUM_CHANNELS; i++)
    {
        js_sfx_stop(i);
    }
}

static int I_Web_GetSfxLumpNum(sfxinfo_t *sfx)
{
    char namebuf[9];

    GetSfxLumpName(sfx, namebuf, sizeof(namebuf));

    return W_GetNumForName(namebuf);
}

static void I_Web_UpdateSound(void)
{
}

static void I_Web_UpdateSoundParams(int channel, int vol, int sep)
{
    if (channel < 0 || channel >= NUM_CHANNELS)
    {
        return;
    }

    js_sfx_update(channel, vol, sep);
}

static int I_Web_StartSound(sfxinfo_t *sfxinfo, int channel, int vol, int sep)
{
    if (channel < 0 || channel >= NUM_CHANNELS)
    {
        return -1;
    }

    if (!CacheSfx(sfxinfo))
    {
        return -1;
    }

    js_sfx_play(channel, sfxinfo->lumpnum, vol, sep);

    return channel;
}

static void I_Web_StopSound(int channel)
{
    if (channel < 0 || channel >= NUM_CHANNELS)
    {
        return;
    }

    js_sfx_stop(channel);
}

static boolean I_Web_SoundIsPlaying(int channel)
{
    if (channel < 0 || channel >= NUM_CHANNELS)
    {
        return false;
    }

    return js_sfx_is_playing(channel) != 0;
}

static void I_Web_PrecacheSounds(sfxinfo_t *sounds, int num_sounds)
{
    // Se cargan a demanda la primera vez que suenan.
    (void) sounds;
    (void) num_sounds;
}

static snddevice_t sound_web_devices[] =
{
    SNDDEVICE_SB,
    SNDDEVICE_PAS,
    SNDDEVICE_GUS,
    SNDDEVICE_WAVEBLASTER,
    SNDDEVICE_SOUNDCANVAS,
    SNDDEVICE_AWE32,
};

sound_module_t DG_sound_module =
{
    sound_web_devices,
    sizeof(sound_web_devices) / sizeof(*sound_web_devices),
    I_Web_InitSound,
    I_Web_ShutdownSound,
    I_Web_GetSfxLumpNum,
    I_Web_UpdateSound,
    I_Web_UpdateSoundParams,
    I_Web_StartSound,
    I_Web_StopSound,
    I_Web_SoundIsPlaying,
    I_Web_PrecacheSounds,
};

// Variables de configuracion que el resto del motor espera encontrar.
int use_libsamplerate = 0;
float libsamplerate_scale = 0.65f;

// ---------------------------------------------------------------------------
// Musica: por ahora un modulo vacio. La musica de Doom esta en formato MUS
// (parecido a MIDI) y necesita un sintetizador; queda para un paso siguiente.
// ---------------------------------------------------------------------------

static boolean I_Web_InitMusic(void) { return true; }
static void I_Web_ShutdownMusic(void) { }
static void I_Web_SetMusicVolume(int volume) { (void) volume; }
static void I_Web_PauseMusic(void) { }
static void I_Web_ResumeMusic(void) { }
static void *I_Web_RegisterSong(void *data, int len) { (void) len; return data; }
static void I_Web_UnRegisterSong(void *handle) { (void) handle; }
static void I_Web_PlaySong(void *handle, boolean looping) { (void) handle; (void) looping; }
static void I_Web_StopSong(void) { }
static boolean I_Web_MusicIsPlaying(void) { return false; }
static void I_Web_PollMusic(void) { }

static snddevice_t music_web_devices[] =
{
    SNDDEVICE_ADLIB,
    SNDDEVICE_SB,
    SNDDEVICE_PAS,
    SNDDEVICE_GUS,
    SNDDEVICE_WAVEBLASTER,
    SNDDEVICE_SOUNDCANVAS,
    SNDDEVICE_GENMIDI,
    SNDDEVICE_AWE32,
};

music_module_t DG_music_module =
{
    music_web_devices,
    sizeof(music_web_devices) / sizeof(*music_web_devices),
    I_Web_InitMusic,
    I_Web_ShutdownMusic,
    I_Web_SetMusicVolume,
    I_Web_PauseMusic,
    I_Web_ResumeMusic,
    I_Web_RegisterSong,
    I_Web_UnRegisterSong,
    I_Web_PlaySong,
    I_Web_StopSong,
    I_Web_MusicIsPlaying,
    I_Web_PollMusic,
};
