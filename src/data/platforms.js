// Plataformas originales de los juegos del catálogo. Cada juego apunta a una
// con game.platform (la clave de este objeto). Para sumar una consola, agregá
// su entrada acá: el catálogo arma una sección por plataforma.

export const PLATFORMS = {
  dos: {
    name: 'PC (MS-DOS)',
    maker: 'Microsoft',
    years: '1981 – 2000',
    about:
      'El sistema operativo de las PC de los 80 y 90. Los juegos venían en disquetes o CD y se arrancaban escribiendo comandos.',
  },
  ps1: {
    name: 'PlayStation',
    maker: 'Sony',
    years: '1994 – 2006',
    about:
      'La primera consola de Sony: 32 bits, juegos en CD y gráficos 3D. Acá no hay un emulador: cada juego corre sobre una reconstrucción de su propio motor y usa los archivos de tu disco.',
  },
}

export function platformOf(game) {
  const platform = PLATFORMS[game.platform]
  if (!platform) throw new Error(`El juego "${game.slug}" usa una plataforma sin definir: "${game.platform}".`)
  return platform
}
