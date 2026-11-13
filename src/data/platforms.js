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
  pc: {
    name: 'PC (Windows y Linux)',
    maker: 'Varios fabricantes',
    years: '1995 – hoy',
    about:
      'La PC con ventanas y mouse. Acá van los juegos de código abierto hechos por comunidades de aficionados, que se siguen actualizando hoy.',
  },
  gb: {
    name: 'Game Boy',
    maker: 'Nintendo',
    years: '1989 – 2003',
    about:
      'La consola portátil de Nintendo: pantalla de cuatro tonos de gris y juegos en cartucho. Estos son juegos caseros, hechos por aficionados años después y publicados gratis por sus autores. Corren sobre un emulador libre.',
  },
  gbc: {
    name: 'Game Boy Color',
    maker: 'Nintendo',
    years: '1998 – 2003',
    about:
      'La sucesora de la Game Boy, con pantalla a color y más memoria. Estos son juegos caseros publicados gratis por sus autores. Corren sobre un emulador libre.',
  },
}

export function platformOf(game) {
  const platform = PLATFORMS[game.platform]
  if (!platform) throw new Error(`El juego "${game.slug}" usa una plataforma sin definir: "${game.platform}".`)
  return platform
}
