// Gimnasios, Alto Mando y Campeón de cada región del servidor. Editar a mano.
//
// Cada combate:
//   kind: "leader" (líder de gimnasio), "elite" (Alto Mando) o "champion" (Campeón)
//   trainer: nombre del sprite de Showdown (play.pokemonshowdown.com/sprites/trainers/<trainer>.png)
//   badge: número de medalla en PokéAPI (sprites/badges/<n>.png)
//   cap / capAfter: level cap al enfrentarlo y el que se desbloquea al vencerlo (Kanto y Johto)
//   rewards: recompensas por vencerlo (el icono sale solo: PokéDólares, Dcoins, MT/DT…)
//   team: equipo del líder o campeón, p. ej. [{ id: 74 }, { id: 95, level: 14 }]  (id = número nacional)
//     Megas: { id: 94, mega: true, sprite: 10038 } (mega: "X"/"Y" si tiene dos). Regionales: { id: 26, form: "alola", sprite: 10100, types: [...] }.
//     sprite = número del Pokémon en PokéAPI para esa forma; note = texto extra (p. ej. "Habilidad: Levitación").
//     No se marcan shiny: en el servidor varían en cada combate.
//   trainers: los 2 entrenadores del gimnasio antes del líder, p. ej. [{ name: "Entrenador 1", team: [{ id: 138 }] }]
//   El Alto Mando hace de entrenadores previos del Campeón: no da recompensa propia.
//   unconfirmed: true marca nombres pendientes de confirmar en el servidor
//
// Level caps de Kanto y Johto según https://wiki.diosesmon.net/tutoriales/gimnasios
window.GYM_REGIONS = [
  {
    id: "kanto",
    name: "Kanto",
    generation: 1,
    available: true,
    color: "#ff5a5a",
    badge: 1,
    levelRule: "Level cap según tus medallas",
    allowed: "Pokémon de cualquier generación",
    battles: [
      { kind: "leader", name: "Brock", type: "Roca", badge: 1, badgeName: "Medalla Roca", trainer: "brock", cap: 15, capAfter: 19, rewards: ["13 Dcoins", "1.000 PokéDólares"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 138 }, { id: 185 }] },
          { name: "Entrenador 2", team: [{ id: 222 }, { id: 213 }] },
        ],
        team: [{ id: 74 }, { id: 95 }, { id: 140 }] },
      { kind: "leader", name: "Misty", type: "Agua", badge: 2, badgeName: "Medalla Cascada", trainer: "misty", cap: 19, capAfter: 24, rewards: ["13 Dcoins", "1.000 PokéDólares"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 194 }, { id: 98 }] },
          { name: "Entrenador 2", team: [{ id: 90 }, { id: 170 }, { id: 222 }] },
        ],
        team: [{ id: 61 }, { id: 72 }, { id: 171 }, { id: 121 }] },
      { kind: "leader", name: "Tte. Surge", type: "Eléctrico", badge: 3, badgeName: "Medalla Trueno", trainer: "ltsurge", cap: 24, capAfter: 28, rewards: ["13 Dcoins", "1.000 PokéDólares", "Megapulsera", "Repartir Exp"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 170 }, { id: 180 }] },
          { name: "Entrenador 2", team: [{ id: 100 }, { id: 171 }, { id: 135 }] },
        ],
        team: [{ id: 101 }, { id: 26, mega: "X", sprite: 10304, note: "Habilidad: Levitación" }, { id: 82 }, { id: 125 }, { id: 181 }] },
      { kind: "leader", name: "Erika", type: "Planta", badge: 4, badgeName: "Medalla Arcoíris", trainer: "erika", cap: 28, capAfter: 33, rewards: ["13 Dcoins", "1.000 PokéDólares"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 192 }, { id: 114 }, { id: 70 }] },
          { name: "Entrenador 2", team: [{ id: 45 }, { id: 71 }, { id: 182 }] },
        ],
        team: [{ id: 189 }, { id: 3 }, { id: 103 }, { id: 47 }, { id: 154 }] },
      { kind: "leader", name: "Sabrina", type: "Psíquico", badge: 6, badgeName: "Medalla Pantano", trainer: "sabrina", cap: 33, capAfter: 37, rewards: ["13 Dcoins", "1.000 PokéDólares"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 103 }, { id: 97 }] },
          { name: "Entrenador 2", team: [{ id: 203 }, { id: 178 }, { id: 122 }] },
        ],
        team: [{ id: 26, form: "alola", sprite: 10100, types: ["Eléctrico", "Psíquico"] }, { id: 80 }, { id: 65, mega: true, sprite: 10037 }, { id: 196 }, { id: 202 }, { id: 124 }] },
      { kind: "leader", name: "Koga", type: "Veneno", badge: 5, badgeName: "Medalla Alma", trainer: "koga", cap: 37, capAfter: 42, rewards: ["13 Dcoins", "1.000 PokéDólares"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 24 }, { id: 71 }] },
          { name: "Entrenador 2", team: [{ id: 211 }, { id: 31 }, { id: 89 }] },
        ],
        team: [{ id: 169 }, { id: 34 }, { id: 73 }, { id: 94, mega: true, sprite: 10038 }, { id: 49 }, { id: 110 }] },
      { kind: "leader", name: "Blaine", type: "Fuego", badge: 7, badgeName: "Medalla Volcán", trainer: "blaine", cap: 42, capAfter: 46, rewards: ["13 Dcoins", "1.000 PokéDólares"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 156 }, { id: 77 }] },
          { name: "Entrenador 2", team: [{ id: 219 }, { id: 126 }, { id: 136 }] },
        ],
        team: [{ id: 38 }, { id: 6 }, { id: 229, mega: true, sprite: 10048 }, { id: 157, form: "hisui", sprite: 10233, types: ["Fuego", "Fantasma"] }, { id: 78 }, { id: 59, form: "hisui", sprite: 10230, types: ["Fuego", "Roca"] }] },
      { kind: "leader", name: "Giovanni", type: "Tierra", badge: 8, badgeName: "Medalla Tierra", trainer: "giovanni", cap: 46, capAfter: 60, rewards: ["13 Dcoins", "1.000 PokéDólares"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 51 }, { id: 105 }] },
          { name: "Entrenador 2", team: [{ id: 221 }, { id: 112 }, { id: 28 }] },
        ],
        team: [{ id: 248 }, { id: 34 }, { id: 195 }, { id: 115, mega: true, sprite: 10039 }, { id: 53 }, { id: 232 }] },
      // Kanto no tiene Alto Mando: tras Giovanni se reta directamente al Campeón.
      { kind: "champion", name: "Gary", title: "Campeón de Kanto", trainer: "blue", cap: 60, capAfter: 64, rewards: ["50 Dcoins", "4.000 PokéDólares", "MT Cola Férrea"],
        team: [{ id: 112 }, { id: 130 }, { id: 94 }, { id: 6, mega: "Y", sprite: 10035 }, { id: 143 }, { id: 65 }] },
    ],
  },
  {
    id: "johto",
    name: "Johto",
    generation: 2,
    available: true,
    color: "#ffd442",
    badge: 9,
    levelRule: "Level cap según tus medallas",
    allowed: "Pokémon de cualquier generación",
    battles: [
      { kind: "leader", name: "Pegaso", type: "Volador", badge: 9, badgeName: "Medalla Céfiro", trainer: "falkner", cap: 64, capAfter: 68, rewards: ["2.000 PokéDólares", "MT Respiro"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 130 }, { id: 142 }] },
          { name: "Entrenador 2", team: [{ id: 169 }, { id: 6 }, { id: 85 }] },
        ],
        team: [{ id: 142 }, { id: 227 }, { id: 130 }, { id: 149 }, { id: 18, mega: true, sprite: 10073 }, { id: 6 }] },
      { kind: "leader", name: "Antón", type: "Bicho", badge: 10, badgeName: "Medalla Colmena", trainer: "bugsy", cap: 68, capAfter: 71, rewards: ["2.200 PokéDólares", "MT Tijera X"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 168 }, { id: 214 }] },
          { name: "Entrenador 2", team: [{ id: 213 }, { id: 12 }, { id: 212 }] },
        ],
        team: [{ id: 15, mega: true, sprite: 10090 }, { id: 123 }, { id: 127 }, { id: 205 }, { id: 212 }, { id: 214 }] },
      { kind: "leader", name: "Blanca", type: "Normal", badge: 11, badgeName: "Medalla Planicie", trainer: "whitney", cap: 71, capAfter: 75, rewards: ["2.400 PokéDólares", "MT Gigaimpacto"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 40 }, { id: 206 }] },
          { name: "Entrenador 2", team: [{ id: 203 }, { id: 143 }, { id: 53 }] },
        ],
        team: [{ id: 235 }, { id: 115 }, { id: 40 }, { id: 242 }, { id: 233 }, { id: 241 }] },
      { kind: "leader", name: "Morti", type: "Fantasma", badge: 12, badgeName: "Medalla Niebla", trainer: "morty", cap: 75, capAfter: 79, rewards: ["2.600 PokéDólares", "MT Bola Sombra"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 94 }, { id: 200 }] },
          { name: "Entrenador 2", team: [{ id: 94 }, { id: 93 }, { id: 200 }] },
        ],
        team: [{ id: 169 }, { id: 94, mega: true, sprite: 10038 }, { id: 429 }, { id: 200 }, { id: 979 }, { id: 157, form: "hisui", sprite: 10233, types: ["Fuego", "Fantasma"] }] },
      { kind: "leader", name: "Aníbal", type: "Lucha", badge: 13, badgeName: "Medalla Tormenta", trainer: "chuck", cap: 79, capAfter: 82, rewards: ["2.800 PokéDólares", "MT Puño Drenaje"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 57 }, { id: 237 }] },
          { name: "Entrenador 2", team: [{ id: 57 }, { id: 62 }, { id: 214 }] },
        ],
        team: [{ id: 68 }, { id: 106 }, { id: 57 }, { id: 62 }, { id: 107 }, { id: 237 }] },
      { kind: "leader", name: "Yasmina", type: "Acero", badge: 14, badgeName: "Medalla Mineral", trainer: "jasmine", cap: 82, capAfter: 86, rewards: ["3.000 PokéDólares", "MT Cola Férrea"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 208 }, { id: 227 }] },
          { name: "Entrenador 2", team: [{ id: 208 }, { id: 82 }, { id: 205 }] },
        ],
        team: [{ id: 227 }, { id: 462 }, { id: 205 }, { id: 208, mega: true, sprite: 10072 }, { id: 51 }, { id: 212 }] },
      { kind: "leader", name: "Fredo", type: "Hielo", badge: 15, badgeName: "Medalla Glaciar", trainer: "pryce", cap: 86, capAfter: 90, rewards: ["3.200 PokéDólares", "MT Rayo Hielo"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 131 }, { id: 221 }] },
          { name: "Entrenador 2", team: [{ id: 221 }, { id: 91 }, { id: 473 }] },
        ],
        team: [{ id: 473 }, { id: 87 }, { id: 131 }, { id: 91 }, { id: 221 }, { id: 124 }] },
      { kind: "leader", name: "Débora", type: "Dragón", badge: 16, badgeName: "Medalla Dragón", trainer: "clair", cap: 90, capAfter: 100, rewards: ["3.400 PokéDólares", "MT Garra Dragón"],
        trainers: [
          { name: "Entrenador 1", team: [{ id: 230 }, { id: 149 }] },
          { name: "Entrenador 2", team: [{ id: 230 }, { id: 149 }, { id: 149 }] },
        ],
        team: [{ id: 230 }, { id: 149 }, { id: 6, mega: "X", sprite: 10034, types: ["Fuego", "Dragón"] }, { id: 142 }, { id: 227 }, { id: 130 }] },
      // Johto tampoco tiene Alto Mando: tras Débora se reta directamente al Campeón.
      { kind: "champion", name: "Lance", title: "Campeón de Johto", type: "Dragón", trainer: "lance", cap: 100, capAfter: 100, rewards: ["3.000 PokéDólares", "MT Cola Férrea"],
        team: [{ id: 160, mega: true, sprite: 10283 }, { id: 149 }, { id: 230 }, { id: 227 }, { id: 130 }, { id: 149 }] },
    ],
  },
  {
    id: "hoenn",
    name: "Hoenn",
    generation: 3,
    available: true,
    color: "#4bb6ff",
    badge: 17,
    levelRule: "Rivales a nivel 100 · combates nivelados a 50",
    allowed: "Solo Pokémon de Hoenn y Johto",
    battles: [
      { kind: "leader", name: "Petra", type: "Roca", badge: 17, badgeName: "Medalla Piedra", trainer: "roxanne", rewards: ["30 Dcoins", "4.500 PokéDólares", "DT Avalancha"], team: [] },
      { kind: "leader", name: "Marcial", type: "Lucha", badge: 18, badgeName: "Medalla Puño", trainer: "brawly", rewards: ["30 Dcoins", "4.600 PokéDólares", "DT Puño Incremento"], team: [] },
      { kind: "leader", name: "Erico", type: "Eléctrico", badge: 19, badgeName: "Medalla Dínamo", trainer: "wattson", rewards: ["30 Dcoins", "4.700 PokéDólares", "DT Trueno"], team: [] },
      { kind: "leader", name: "Candela", type: "Fuego", badge: 20, badgeName: "Medalla Calor", trainer: "flannery", rewards: ["30 Dcoins", "4.800 PokéDólares", "DT Llamarada"], team: [] },
      { kind: "leader", name: "Norman", type: "Normal", badge: 21, badgeName: "Medalla Equilibrio", trainer: "norman", rewards: ["30 Dcoins", "4.900 PokéDólares", "DT Giga Impacto"], team: [] },
      { kind: "leader", name: "Alana", type: "Volador", badge: 22, badgeName: "Medalla Pluma", trainer: "winona", rewards: ["30 Dcoins", "5.000 PokéDólares", "DT Aire Afilado"], team: [] },
      { kind: "leader", name: "Vito y Leti", type: "Psíquico", badge: 23, badgeName: "Medalla Mente", trainer: "tateandliza-gen3", rewards: ["30 Dcoins", "5.100 PokéDólares", "DT Psíquico"], team: [] },
      { kind: "leader", name: "Plubio", type: "Agua", badge: 24, badgeName: "Medalla Lluvia", trainer: "wallace", rewards: ["30 Dcoins", "5.200 PokéDólares", "DT Hidrobomba"], team: [] },
      { kind: "elite", name: "Sixto", type: "Siniestro", trainer: "sidney", team: [], unconfirmed: true },
      { kind: "elite", name: "Fátima", type: "Fantasma", trainer: "phoebe-gen3", team: [], unconfirmed: true },
      { kind: "elite", name: "Nívea", type: "Hielo", trainer: "glacia", team: [], unconfirmed: true },
      { kind: "elite", name: "Dracón", type: "Dragón", trainer: "drake-gen3", team: [], unconfirmed: true },
      { kind: "champion", name: "Máximo", title: "Campeón de Hoenn", trainer: "steven", rewards: ["60 Dcoins", "6.500 PokéDólares", "DT Foco Resplandor"], team: [] },
    ],
  },
  {
    id: "sinnoh",
    name: "Sinnoh",
    generation: 4,
    available: true,
    color: "#b38cff",
    badge: 25,
    levelRule: "Rivales a nivel 100 · combates nivelados a 50",
    allowed: "Solo Pokémon de Sinnoh y Hoenn",
    battles: [
      { kind: "leader", name: "Roco", type: "Roca", badge: 25, badgeName: "Medalla Lignito", trainer: "roark", rewards: ["3.500 PokéDólares", "DT Romperrocas"], team: [] },
      { kind: "leader", name: "Gardenia", type: "Planta", badge: 26, badgeName: "Medalla Bosque", trainer: "gardenia", rewards: ["3.800 PokéDólares", "DT Energibola"], team: [] },
      { kind: "leader", name: "Brega", type: "Lucha", badge: 27, badgeName: "Medalla Adoquín", trainer: "maylene", rewards: ["4.300 PokéDólares", "DT Puño Drenaje"], team: [] },
      { kind: "leader", name: "Mananti", type: "Agua", badge: 28, badgeName: "Medalla Ciénaga", trainer: "crasherwake", rewards: ["4.600 PokéDólares", "DT Cascada"], team: [] },
      { kind: "leader", name: "Fantina", type: "Fantasma", badge: 29, badgeName: "Medalla Reliquia", trainer: "fantina", rewards: ["5.000 PokéDólares", "DT Golpe Fantasma"], team: [] },
      { kind: "leader", name: "Acerón", type: "Acero", badge: 30, badgeName: "Medalla Mina", trainer: "byron", rewards: ["5.400 PokéDólares", "DT Represión Metal"], team: [] },
      { kind: "leader", name: "Inverna", type: "Hielo", badge: 31, badgeName: "Medalla Carámbano", trainer: "candice", rewards: ["6.000 PokéDólares", "DT Martillo Hielo"], team: [] },
      { kind: "leader", name: "Lectro", type: "Eléctrico", badge: 32, badgeName: "Medalla Faro", trainer: "volkner", rewards: ["7.500 PokéDólares", "DT Voltio Cruel"], team: [] },
      { kind: "elite", name: "Alecrán", type: "Bicho", trainer: "aaron", team: [], unconfirmed: true },
      { kind: "elite", name: "Gaia", type: "Tierra", trainer: "bertha", team: [], unconfirmed: true },
      { kind: "elite", name: "Fausto", type: "Fuego", trainer: "flint", team: [], unconfirmed: true },
      { kind: "elite", name: "Delos", type: "Psíquico", trainer: "lucian", team: [], unconfirmed: true },
      { kind: "champion", name: "Cintia", title: "Campeona de Sinnoh", trainer: "cynthia", rewards: ["20.000 PokéDólares", "DT Terremoto"], team: [] },
    ],
  },
  { id: "teselia", name: "Teselia", generation: 5, available: false, color: "#e8ecf4", battles: [] },
  { id: "kalos", name: "Kalos", generation: 6, available: false, color: "#7ad7ff", battles: [] },
  { id: "alola", name: "Alola", generation: 7, available: false, color: "#ffa64d", battles: [] },
  { id: "galar", name: "Galar", generation: 8, available: false, color: "#ff6fb1", battles: [] },
  { id: "paldea", name: "Paldea", generation: 9, available: false, color: "#9ce35a", battles: [] },
];
