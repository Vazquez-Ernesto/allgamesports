// allgamesports: config.h para compilar Crispy Heretic con Emscripten.
// En el proyecto original lo genera CMake; acá se escribe a mano porque se
// compila llamando a emcc directo.

#define PACKAGE_NAME "Crispy Doom"
#define PACKAGE_TARNAME "crispy-doom"
#define PACKAGE_VERSION "7.2"
#define PACKAGE_STRING "Crispy Doom 7.2"
#define PROGRAM_PREFIX "crispy-"

#define HAVE_DIRENT_H
#define HAVE_DECL_STRCASECMP 1
#define HAVE_DECL_STRNCASECMP 1

// zlib (port de Emscripten): nodos comprimidos de mapas grandes.
#define HAVE_LIBZ
