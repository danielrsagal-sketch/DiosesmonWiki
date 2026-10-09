// Configuración de /dexrewards del servidor. Editar a mano.
//
// Cada sección tiene sus hitos (percent). En "rewards" van los textos de lo que da cada hito,
// por ejemplo: { percent: 10, rewards: ["16× Ultra Ball", "1× Caramelo Raro"] }.
// Si "rewards" está vacío, la página muestra "Recompensa por confirmar".
//
// range: números nacionales que cuenta la sección. "includeFusions" suma las fusiones de Diosesmon
// (así la Pokédex General da 1036, igual que en el juego).
window.DEXREWARDS = [
  {
    id: "general",
    title: "Pokédex General",
    subtitle: "Nacional",
    description: "Da seguimiento a tu progreso general en la Pokédex. Cuentan todas las generaciones, no solo las activas.",
    range: [1, 1025],
    includeFusions: true,
    sprite: 133,
    color: "#5ee1ff",
    milestones: [
      { percent: 5, rewards: [] },
      { percent: 10, rewards: ["5.000 PokéDólares"] },
      { percent: 25, rewards: ["15.000 PokéDólares"] },
      { percent: 50, rewards: ["50.000 PokéDólares"] },
      { percent: 75, rewards: [] },
      { percent: 100, rewards: [] },
    ],
  },
  {
    id: "kanto", title: "Generación 1 – Kanto", subtitle: "Gen 1", range: [1, 151], sprite: 25, color: "#ff5a5a",
    milestones: [
      { percent: 10, rewards: ["2.000 PokéDólares"] },
      { percent: 20, rewards: ["6 Caramelos Raros"] },
      { percent: 40, rewards: ["Set de DT (por confirmar)"] },
      { percent: 60, rewards: ["3.000 PokéDólares"] },
      { percent: 80, rewards: ["100 Dcoins"] },
      { percent: 100, rewards: [] },
    ],
  },
  {
    id: "johto", title: "Generación 2 – Johto", subtitle: "Gen 2", range: [152, 251], sprite: 175, color: "#ffd442",
    milestones: [
      { percent: 10, rewards: ["2.000 PokéDólares"] },
      { percent: 20, rewards: ["6 Caramelos Raros"] },
      { percent: 40, rewards: ["Set de DT (por confirmar)"] },
      { percent: 60, rewards: ["3.000 PokéDólares"] },
      { percent: 80, rewards: ["100 Dcoins"] },
      { percent: 100, rewards: [] },
    ],
  },
  {
    id: "hoenn", title: "Generación 3 – Hoenn", subtitle: "Gen 3", range: [252, 386], sprite: 258, color: "#4bb6ff",
    milestones: [
      { percent: 10, rewards: ["4.000 PokéDólares"] },
      { percent: 20, rewards: ["DT Terremoto", "DT Surf"] },
      { percent: 40, rewards: ["12 Caramelos Raros"] },
      { percent: 60, rewards: ["5.000 PokéDólares"] },
      { percent: 80, rewards: ["100 Dcoins"] },
      { percent: 100, rewards: [] },
    ],
  },
  { id: "sinnoh", title: "Generación 4 – Sinnoh", subtitle: "Gen 4", range: [387, 493], sprite: 448, color: "#b38cff", milestones: [25, 50, 75, 100] },
  { id: "unova", title: "Generación 5 – Teselia", subtitle: "Gen 5", range: [494, 649], sprite: 495, color: "#e8ecf4", milestones: [25, 50, 75, 100] },
  { id: "kalos", title: "Generación 6 – Kalos", subtitle: "Gen 6", range: [650, 721], sprite: 700, color: "#7ad7ff", milestones: [25, 50, 75, 100] },
  { id: "alola", title: "Generación 7 – Alola", subtitle: "Gen 7", range: [722, 809], sprite: 722, color: "#ffa64d", milestones: [25, 50, 75, 100] },
  { id: "galar", title: "Generación 8 – Galar", subtitle: "Gen 8", range: [810, 905], sprite: 813, color: "#ff6fb1", milestones: [25, 50, 75, 100] },
  { id: "paldea", title: "Generación 9 – Paldea", subtitle: "Gen 9", range: [906, 1025], sprite: 906, color: "#9ce35a", milestones: [25, 50, 75, 100] },
  {
    id: "shiny",
    title: "Recompensas Shiny",
    subtitle: "Shiny",
    description: "Recompensas por capturar Pokémon variocolor. La wiki aún no registra tus shiny, así que aquí solo se muestran los hitos.",
    shiny: true,
    sprite: 130,
    color: "#ffd442",
    milestones: [],
  },
];
