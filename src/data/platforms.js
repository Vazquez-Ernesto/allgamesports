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
}

export function platformOf(game) {
  const platform = PLATFORMS[game.platform]
  if (!platform) throw new Error(`El juego "${game.slug}" usa una plataforma sin definir: "${game.platform}".`)
  return platform
}
