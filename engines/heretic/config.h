// allgamesports: config.h para compilar Chocolate Heretic con Emscripten.
// En el proyecto original lo genera CMake; acá se escribe a mano porque se
// compila llamando a emcc directo.

#define PACKAGE_NAME "Chocolate Doom"
#define PACKAGE_TARNAME "chocolate-doom"
#define PACKAGE_VERSION "3.1.0"
#define PACKAGE_STRING "Chocolate Doom 3.1.0"
#define PROGRAM_PREFIX "chocolate-"

#define HAVE_DIRENT_H
#define HAVE_DECL_STRCASECMP 1
#define HAVE_DECL_STRNCASECMP 1
