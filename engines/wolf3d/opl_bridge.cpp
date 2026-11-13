// allgamesports: puente entre el codigo C de Wolf4SDL y el emulador OPL de
// DOSBox, que es C++. El contenido viene de id_sd.c (Wolf4SDL, GPL).

#include <stdint.h>
#include "dosbox/dbopl.h"

static DBOPL::Chip oplChip;

extern "C" void OplBridge_Setup(int rate)
{
	oplChip.Setup(rate);
}

extern "C" void OplBridge_Write(unsigned int reg, unsigned char val)
{
	oplChip.WriteReg(reg, val);
}

// Convierte las muestras de 32 bits del emulador a 16 bits estereo.
static void convert(const Bit32s *buffer, int16_t *stream, int length, bool stereo)
{
	for(int i = 0; i < length; i++)
	{
		// Multiply by 4 to match loudness of MAME emulator.
		Bit32s sample = buffer[i] << 2;
		if(sample > 32767) sample = 32767;
		else if(sample < -32768) sample = -32768;
		if(stereo) stream[i] = (int16_t) sample;
		else stream[i * 2] = stream[i * 2 + 1] = (int16_t) sample;
	}
}

extern "C" void OplBridge_Update(int16_t *stream, int length)
{
	Bit32s buffer[512 * 2];

	// length is at maximum samplesPerMusicTick = param_samplerate / 700
	// so 512 is sufficient for a sample rate of 358.4 kHz (default 44.1 kHz)
	if(length > 512)
		length = 512;

	if(oplChip.opl3Active)
	{
		oplChip.GenerateBlock3(length, buffer);
		convert(buffer, stream, length * 2, true);  // * 2 for left/right channel
	}
	else
	{
		oplChip.GenerateBlock2(length, buffer);
		convert(buffer, stream, length, false);
	}
}
