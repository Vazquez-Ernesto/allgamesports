

## 24. Segundo control de NES

`runtimes/consoleInput.js` ahora sabe de jugadores: cada tecla apunta a un
jugador y un botón, y los mandos se reparten en orden (el primero conectado
es el jugador 1). Game Boy lo usa con un solo control; NES, con dos.

Las teclas del jugador 2 (Y G H J, L, K, O, I) son las de la demo oficial de
binjnes: en vez de inventar un esquema, se siguió el del autor.

Con eso volvió RHDE: Furniture Fight, que se había descartado por ser solo
para dos. Se probó que cada jugador elige su personaje con sus teclas, que
la partida arranca (Start del jugador 1) y que Game Boy ignora las teclas
del jugador 2.
