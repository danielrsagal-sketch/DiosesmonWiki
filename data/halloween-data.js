// Evento de Halloween 2026. Editar a mano.
//   ticket: precio y lo que incluye.
//   shop: lo que vende la tienda del evento, en su orden. cur: "$" (PokéDólares) o "dc" (DiosesCoins).
//     img = icono recortado del juego; las decoraciones no lo llevan: usan su modelo 3D (data/halloween-decor.js, por nombre).
//   bingo.missions: las 8 misiones del cartón (en el orden del menú del juego).
//     goal = cantidad que pide; icon = sprite (pokemon/<n>, items/<nombre> o ruta local); mons = Pokémon útiles [id, nombre].
//   Las listas del Nether y del Safari salen de los datos de la wiki (spawns de Cobblemon 1.7.3 y zonas del Safari).
window.HALLOWEEN_EVENT = {
  ticket: {
    name: "Ticket Calabaza",
    price: 45000,
    image: "assets/img/eventos/halloween/ticket.png",
    includes: ["Bingo Halloween", "Casa Encantada"],
  },
  // El Adivinador (Gimnasio Psíquico de la Mansión): 5 preguntas y luego combate. Cada fallo castiga a un Pokémon tuyo.
  //   questions: las que nos salieron; answer = índice de la opción correcta (0 = A).
  adivinador: {
    name: "Adivino",
    skin: "assets/img/eventos/halloween/adivinador.png", face: "assets/img/eventos/halloween/cara-adivinador.png",
    level: 60,
    team: [{ id: 229, name: "Houndoom", types: ["Siniestro", "Fuego"] }, { id: 169, name: "Crobat", types: ["Veneno", "Volador"] }, { id: 430, name: "Honchkrow", types: ["Siniestro", "Volador"] }],
    questions: [
      { q: "¿Qué hace la habilidad Rompemoldes?", options: ["Los ataques del usuario ignoran las habilidades del oponente", "Baja el ataque físico del rival", "Sube mucho la velocidad al iniciar el combate", "Los ataques del oponente ignoran la habilidad del usuario"], answer: 0 },
      { q: "¿Cuál de estas evoluciones no es una evolución oficial de Eevee?", options: ["Glaceon", "Leafeon", "Sylveon", "Poiseon"], answer: 3 },
      { q: "¿Cuál de estos Pokémon no es un Pokémon oficial?", options: ["Zorua", "Dudunsparce", "Dunsparce", "Bibaroof"], answer: 3, why: "El oficial es Bibarel." },
      { q: "¿Qué hace el efecto de Quemado en un Pokémon?", options: ["Sube el Ataque Físico", "Baja el Ataque Especial", "Sube el Ataque Especial", "Baja el Ataque Físico"], answer: 3, why: "Además, le quita un poco de PS cada turno." },
      { q: "¿Cuál de estos ataques Pokémon no es un ataque oficial del juego?", options: ["Octopresa", "Bastión Final", "Tumba Piedras", "Pesadilla"], answer: 2, why: "El oficial se llama Tumba Rocas. Octopresa y Bastión Final son de la 8.ª generación." },
    ],
  },
  // Recorrido de la Mansión después del Adivinador: los 3 Entrenadores Misteriosos (misión del Bingo) y lo que hay entre ellos.
  //   kind: "battle" (combate) o "step" (laberinto, parkour…). skin: su aspecto de frente (de la skin del juego). team: Pokémon a nivel 100 con aspecto de Halloween.
  //   rewards: [texto, imagen opcional]. Los equipos son los que vimos; los aspectos de Halloween no salen en los sprites.
  route: [
    { kind: "battle", name: "Entrenador Misterioso", skin: "assets/img/eventos/halloween/entrenador-misterioso.png", face: "assets/img/eventos/halloween/cara-entrenador-misterioso.png", title: "1.er Entrenador Misterioso", where: "En el centro del mapa (X 0, Y −1, Z 0). Aparece al vencer al Adivinador.", pos: [0, -1, 0], level: 100,
      team: [{ id: 609, name: "Chandelure" }, { id: 143, name: "Snorlax" }, { id: 430, name: "Honchkrow" }, { id: 94, name: "Gengar" }, { id: 468, name: "Togekiss" }, { id: 571, name: "Zoroark" }],
      rewards: [["Collar de Almas", "assets/img/eventos/halloween/collar-de-almas.png", "Exclusivo y decorativo"], ["8.000 PokéDólares"]] },
    { kind: "step", icon: "🌀", name: "El laberinto", text: "Cruza el laberinto hasta el portal: te teletransporta al siguiente combate." },
    { kind: "battle", name: "Entrenadora Sangrienta", skin: "assets/img/eventos/halloween/entrenadora-sangrienta.png", face: "assets/img/eventos/halloween/cara-entrenadora-sangrienta.png", title: "2.º Entrenador Misterioso", where: "Al otro lado del portal del laberinto (X 0, Y 36, Z 2).", pos: [0, 36, 2], level: 100,
      team: [{ id: 3, name: "Venusaur" }, { id: 350, name: "Milotic" }, { id: 9, name: "Blastoise" }, { id: 612, name: "Haxorus" }, { id: 59, name: "Arcanine" }, { id: 6, name: "Charizard" }],
      rewards: [["Corona Maldita", "assets/img/eventos/halloween/corona-maldita.png", "Exclusiva y decorativa"], ["12.000 PokéDólares"], ["Globo rojo", "assets/img/eventos/halloween/tienda/globo-rojo.png", "Para el parkour"]] },
    { kind: "step", icon: "🎈", name: "El parkour", text: "Usa el Globo rojo que te acaban de dar: en la mano saltas más alto y caes lento. <strong>Si te caes, vuelves al inicio del parkour.</strong>" },
    { kind: "battle", name: "Rey Calabaza", skin: "assets/img/eventos/halloween/rey-calabaza.png", face: "assets/img/eventos/halloween/cara-rey-calabaza.png", title: "3.er Entrenador Misterioso", where: "Al final del parkour (X 0, Y 50, Z 0).", pos: [0, 50, 0], level: 100,
      team: [{ id: 26, mega: "X", sprite: 10304, label: "Mega Raichu X" }, { id: 468, name: "Togekiss" }, { id: 149, name: "Dragonite" }, { id: 217, name: "Ursaring" }, { id: 448, name: "Lucario" }, { id: 25, name: "Pikachu" }],
      rewards: [["Sombrero Embrujado", "assets/img/eventos/halloween/sombrero-embrujado.png", "Exclusivo y decorativo"], ["Globo morado", "assets/img/eventos/halloween/tienda/globo-morado.png", "+25% de probabilidad de Shiny"], ["17.000 PokéDólares"]] },
  ],
  // Mapa de la Mansión Encantada (mundo multiworld:mansionencantada). Imagen del mapa de Xaero: 1 píxel = 1 bloque.
  // bounds: bloques que cubre la imagen. Adivinador: waypoint de Xaero. Litwick [x, y, z]: los 33 que hay (mod diosesmon-npcs, /npcs exportar).
  mansion: {
    image: "assets/img/eventos/halloween/mansion.webp",
    bounds: { minX: -230, maxX: 230, minZ: -230, maxZ: 330 },
    adivinador: [143, -24, 106],
    litwicks: [[-37, -24, 216], [-9, -17, 252], [-21, -24, 168], [42, -23, 180], [40, -24, 211], [81, -2, 138], [127, -24, 168], [162, -22, 42], [111, -5, 13], [135, -23, 9], [129, -24, -16], [89, -7, -22], [43, -7, 33], [30, -3, -114], [-15, -8, -62], [-23, -5, -137], [-18, 37, -28], [-42, -7, -55], [-7, 95, -14], [-61, -24, -92], [-36, -7, -16], [-70, -7, -51], [-111, -24, -81], [-140, -14, -24], [-72, 36, 0], [-118, -24, 23], [-119, -24, 28], [-140, -23, 70], [-66, -7, 39], [-97, -14, 96], [-50, -7, 65], [-61, -24, 123], [-12, -3, 25]],
  },
  shop: {
    groups: [
      // Globos: ítem exclusivo de Halloween 2026. En la mano saltas más alto y caes lento; estalla tras 10.000 pasos con él en la mano.
      { name: "Globos", text: "Ítem exclusivo de Halloween 2026. <strong>Mantenlo en la mano</strong> para saltar más alto y caer lento, y tendrás su ventaja especial. <strong>Estalla tras recorrer 10.000 pasos</strong> con el globo en la mano.", items: [
        { name: "Globo rojo", price: 15000, cur: "$", img: "globo-rojo", perk: "+25% de ratio de captura" },
        { name: "Globo morado", price: 15000, cur: "$", img: "globo-morado", perk: "+25% de probabilidad de aparición de Shiny" },
        { name: "Globo naranja", price: 15000, cur: "$", img: "globo-naranja", perk: "+25% de experiencia en combate" },
      ] },
      { name: "Mascotas", items: [
        { name: "Mascota Gengar de Halloween", price: 300, cur: "dc", img: "mascota-gengar" },
        { name: "Mascota Esqueleto de Halloween", price: 300, cur: "dc", img: "mascota-esqueleto", note: "Nombre por confirmar" },
        { name: "Milotic", price: 300, cur: "dc", img: "milotic" },
        { name: "Mascota Charizard de Halloween", price: 300, cur: "dc", img: "mascota-charizard" },
        { name: "Mascota Frankenstein", price: 220, cur: "dc", img: "mascota-frankenstein" },
        { name: "Mascota Fantasma", price: 220, cur: "dc", img: "mascota-fantasma" },
        { name: "Mascota Bruja", price: 220, cur: "dc", img: "mascota-bruja" },
      ] },
      { name: "Peluches", items: [
        { name: "Peluche Gato Negro", price: 120, cur: "dc", img: "peluche-gato-negro" },
        { name: "Peluche Parca", price: 150, cur: "dc", img: "peluche-parca" },
        { name: "Peluche Vegetta", price: 180, cur: "dc", img: "peluche-vegetta" },
        { name: "Peluche Willy", price: 180, cur: "dc", img: "peluche-willy" },
      ] },
      { name: "Decoraciones", items: ["Candelabro", "Lápida de cruz", "Lápida de cruz alta", "Lápida redondeada", "Atril con grimorio", "Calabaza terrorífica", "Torre de calabazas", "Farol de calavera", "Montón de calaveras", "Farola", "Farola de calabaza"].map((name) => ({ name, price: 500, cur: "$" })) },
    ],
  },
  bingo: {
    // Premios: por hacer una línea y por completar el cartón. Contenido pendiente de confirmar.
    rewards: [
      { key: "linea", name: "Línea", text: "Por completar una línea del cartón.", items: [] },
      { key: "bingo", name: "Bingo", text: "Por completar el cartón entero.", items: [] },
    ],
    missions: [
      {
        id: "safari-fantasma", goal: 30, icon: "pokemon/92",
        title: "Captura 30 Pokémon Fantasma en el Safari",
        text: "Captura treinta Pokémon de tipo Fantasma dentro del Safari.",
        tip: "El <strong>Valle Sombrío</strong> es la mejor zona: tiene 16 Pokémon Fantasma. También salen en Selva Ancestral, Tierras Ígneas, Cumbres Salvajes y Campos Árticos.",
        link: ["Ver el mapa del Safari", "safari.html"],
        mons: [[92, "Gastly"], [93, "Haunter"], [94, "Gengar"], [200, "Misdreavus"], [292, "Shedinja"], [302, "Sableye"], [353, "Shuppet"], [354, "Banette"], [355, "Duskull"], [356, "Dusclops"], [425, "Drifloon"], [426, "Drifblim"], [429, "Mismagius"], [442, "Spiritomb"], [477, "Dusknoir"], [478, "Froslass"]],
      },
      {
        id: "cria-fantasma", goal: 3, icon: "items/lucky-egg",
        title: "Cría 3 Pokémon Fantasma distintos con 3×31",
        text: "Consigue en la guardería tres crías de tipo Fantasma de especies distintas, cada una con al menos tres IVs a 31.",
        tip: "Las capturas del Safari traen <strong>1 IV a 31 asegurado</strong>: con 4 de ellas y 3 cruces llegas a 3×31. Elige especies que salgan del huevo siendo Fantasma, como Gastly, Misdreavus, Shuppet, Duskull, Drifloon o Litwick. Ojo con Shedinja: su huevo es un Nincada.",
        link: ["Planificar la crianza", "crianza.html#92"],
        mons: [[92, "Gastly"], [200, "Misdreavus"], [353, "Shuppet"], [355, "Duskull"], [425, "Drifloon"], [607, "Litwick"], [302, "Sableye"], [442, "Spiritomb"]],
      },
      {
        id: "nether-fuego", goal: 50, icon: "pokemon/126",
        title: "Derrota 50 Pokémon Fuego en el Nether",
        text: "Derrota en combate a cincuenta Pokémon salvajes de tipo Fuego en el Nether.",
        tip: "Vale cualquier Pokémon salvaje de tipo Fuego que aparezca en el Nether. Estos son los que aparecen allí:",
        mons: [[4, "Charmander"], [5, "Charmeleon"], [6, "Charizard"], [77, "Ponyta"], [78, "Rapidash"], [126, "Magmar"], [155, "Cyndaquil"], [156, "Quilava"], [218, "Slugma"], [219, "Magcargo"], [228, "Houndour"], [229, "Houndoom"], [240, "Magby"], [322, "Numel"], [323, "Camerupt"], [324, "Torkoal"], [467, "Magmortar"], [498, "Tepig"], [499, "Pignite"], [500, "Emboar"], [554, "Darumaka"], [555, "Darmanitan"], [607, "Litwick"], [608, "Lampent"], [609, "Chandelure"], [631, "Heatmor"], [636, "Larvesta"], [637, "Volcarona"]],
      },
      {
        id: "nether-siniestro", goal: 50, icon: "pokemon/228",
        title: "Captura 50 Pokémon Siniestro en el Nether",
        text: "Captura cincuenta Pokémon de tipo Siniestro en el Nether.",
        tip: "En el Nether solo aparecen dos Pokémon de tipo Siniestro: <strong>Houndour</strong> y <strong>Houndoom</strong>. Búscalos en la Pokédex para ver en qué biomas del Nether salen.",
        link: ["Houndour en la Pokédex", "pokedex.html#pokemon/228"],
        mons: [[228, "Houndour"], [229, "Houndoom"]],
      },
      {
        id: "nether-lineas", goal: 3, icon: "items/gold-leaf",
        title: "Captura 3 líneas evolutivas del Nether",
        text: "Captura todos los Pokémon de al menos tres líneas evolutivas que aparecen en el Nether.",
        tip: "Estas líneas aparecen <strong>enteras</strong> en el Nether. Las más rápidas son las cortas, como Torkoal, Heatmor o Durant, que son de una sola especie, o Ekans y Arbok, Ponyta y Rapidash o Numel y Camerupt.",
        lines: [[[4, "Charmander"], [5, "Charmeleon"], [6, "Charizard"]], [[23, "Ekans"], [24, "Arbok"]], [[46, "Paras"], [47, "Parasect"]], [[77, "Ponyta"], [78, "Rapidash"]], [[92, "Gastly"], [93, "Haunter"], [94, "Gengar"]], [[95, "Onix"], [208, "Steelix"]], [[240, "Magby"], [126, "Magmar"], [467, "Magmortar"]], [[200, "Misdreavus"], [429, "Mismagius"]], [[207, "Gligar"], [472, "Gliscor"]], [[218, "Slugma"], [219, "Magcargo"]], [[228, "Houndour"], [229, "Houndoom"]], [[322, "Numel"], [323, "Camerupt"]], [[324, "Torkoal"]], [[325, "Spoink"], [326, "Grumpig"]], [[355, "Duskull"], [356, "Dusclops"], [477, "Dusknoir"]], [[498, "Tepig"], [499, "Pignite"], [500, "Emboar"]], [[543, "Venipede"], [544, "Whirlipede"], [545, "Scolipede"]], [[554, "Darumaka"], [555, "Darmanitan"]], [[607, "Litwick"], [608, "Lampent"], [609, "Chandelure"]], [[631, "Heatmor"]], [[632, "Durant"]], [[636, "Larvesta"], [637, "Volcarona"]]],
      },
      {
        id: "bayas-calabaza", goal: 64, icon: "assets/img/eventos/halloween/baya-calabaza.png",
        title: "Craftea 64 Bayas Calabaza",
        text: "Rodea una calabaza con las bayas Pabaya, Grana, Frambu, Lichi, Tamate, Alcho, Monli y Touga y craftea 64 Bayas Calabaza.",
        tip: "Cada crafteo usa 1 calabaza y 1 baya de cada tipo. Si cada uno da una Baya Calabaza, necesitas 64 calabazas y 64 de cada baya: ¡planta con tiempo!",
        recipe: "assets/img/eventos/halloween/receta-baya-calabaza.png",
        berries: [["iapapa", "Pabaya"], ["pomeg", "Grana"], ["razz", "Frambu"], ["liechi", "Lichi"], ["tamato", "Tamate"], ["charti", "Alcho"], ["nomel", "Monli"], ["touga", "Touga"]],
      },
      {
        id: "entrenadores", goal: 3, icon: "items/dusk-ball",
        title: "Derrota a los 3 Entrenadores Misteriosos",
        text: "Vence a los tres Entrenadores Misteriosos que esperan en la Mansión.",
        tip: "Primero vence al <strong>Adivinador</strong>: entonces aparece el 1.er Entrenador Misterioso en el centro de la Mansión. Luego vienen el laberinto, la <strong>Entrenadora Sangrienta</strong>, un parkour y el <strong>Rey Calabaza</strong>. Todos usan Pokémon de nivel 100.",
        link: ["Ver el recorrido y sus equipos", "#recorrido"],
      },
      {
        id: "litwick", goal: 20, icon: "pokemon/607",
        title: "Encuentra los 20 Litwick de la Mansión Encantada",
        text: "Busca por la Mansión Encantada los Litwick escondidos y habla con los veinte.",
        tip: "Así son los Litwick que tienes que encontrar. Revisa rincones, muebles y habitaciones de la Mansión.",
        image: "assets/img/eventos/halloween/litwick.png",
      },
    ],
  },
};
