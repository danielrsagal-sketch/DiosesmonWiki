// Cazas del servidor: misiones que rotan cada 12 horas. Los Pokémon cambian en cada rotación,
// pero las recompensas dependen solo de la dificultad (estrellas). Editar a mano si cambian.
//   kind: "captura" (atrapar el Pokémon pedido) · "crianza" (entregarlo con IVs perfectos)
//   tiers: una fila por dificultad. need = lo que pide además del Pokémon; money = Pokédólares;
//   balls: [cantidad, id de Poké Ball de PokéAPI, nombre]
window.DIOSESMON_CAZAS = {
  rotationHours: 12,
  // Cazas actuales de respaldo: Inicio usa las de /api/cazas (las que guardas en admin.html)
  // y solo si no responde, estas.
  current: {
    startedAt: "2026-10-16T08:00:00-03:00",
    captura: [
      { id: 422, name: "Shellos", stars: 1 },
      { id: 452, name: "Drapion", stars: 2 },
      { id: 465, name: "Tangrowth", stars: 3 },
    ],
    crianza: [
      { id: 360, name: "Wynaut", stars: 1, ivs: 2 },
      { id: 111, name: "Rhyhorn", stars: 2, ivs: 4 },
      { id: 129, name: "Magikarp", stars: 3, ivs: 5 },
    ],
  },
  kinds: [
    {
      kind: "captura",
      title: "Cazas de captura",
      icon: "items/poke-ball",
      text: "Captura el Pokémon que te piden, con la Poké Ball que quieras.",
      tiers: [
        { stars: 1, need: "Captúralo", money: 1000, balls: [[8, "poke-ball", "Poké Ball"], [6, "great-ball", "Super Ball"], [2, "ultra-ball", "Ultra Ball"]] },
        { stars: 2, need: "Captúralo", money: 3000, balls: [[18, "poke-ball", "Poké Ball"], [12, "great-ball", "Super Ball"], [6, "ultra-ball", "Ultra Ball"], [6, "timer-ball", "Turno Ball"], [6, "quick-ball", "Veloz Ball"]] },
        { stars: 3, need: "Captúralo", money: 7000, balls: [[12, "ultra-ball", "Ultra Ball"], [12, "dusk-ball", "Ocaso Ball"], [12, "timer-ball", "Turno Ball"], [12, "quick-ball", "Veloz Ball"]] },
      ],
    },
    {
      kind: "crianza",
      title: "Cazas de crianza",
      icon: "items/oval-charm",
      text: "Entrega el Pokémon pedido con <strong>IVs perfectos</strong> (a 31): sin ellos no se puede completar. Cuantos más IVs pide, mejor paga.",
      tiers: [
        { stars: 1, need: "2/6 IVs perfectos", ivs: 2, money: 3750, balls: [[8, "poke-ball", "Poké Ball"], [6, "great-ball", "Super Ball"], [2, "ultra-ball", "Ultra Ball"]] },
        { stars: 2, need: "4/6 IVs perfectos", ivs: 4, money: 13500, balls: [[18, "poke-ball", "Poké Ball"], [12, "great-ball", "Super Ball"], [6, "ultra-ball", "Ultra Ball"], [6, "timer-ball", "Turno Ball"], [6, "quick-ball", "Veloz Ball"]] },
        { stars: 3, need: "5/6 IVs perfectos", ivs: 5, money: 25500, balls: [[12, "ultra-ball", "Ultra Ball"], [12, "dusk-ball", "Ocaso Ball"], [12, "timer-ball", "Turno Ball"], [12, "quick-ball", "Veloz Ball"]] },
      ],
    },
  ],
};
