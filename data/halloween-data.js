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
  // Mapa de la Mansión Encantada (mundo multiworld:mansionencantada). Imagen del mapa de Xaero: 1 píxel = 1 bloque.
  // bounds: bloques que cubre la imagen. Waypoints [x, y, z] del export de Xaero (cm$mansionhalloween_2.txt).
  mansion: {
    image: "assets/img/eventos/halloween/mansion.webp",
    bounds: { minX: -230, maxX: 230, minZ: -230, maxZ: 330 },
    adivinador: [143, -24, 106],
    litwicks: [[43, -7, 33], [-37, -7, -16], [-50, -7, 63], [127, -24, 170], [-21, -24, 168], [-61, -24, 123], [-97, -14, 96], [-141, -22, 73], [-119, -24, 28], [-118, -24, 23], [-141, -14, -24], [-110, -24, -79], [-59, -24, -92], [-15, -7, -59], [129, -24, -16], [136, -23, 9], [164, -23, 41], [42, -23, 180], [-37, -24, 216], [-23, -5, -137], [-42, -7, -55], [-70, -7, -51], [-66, -7, 39], [89, -7, -22], [30, -3, -114], [111, -5, 13], [81, -2, 138], [40, -24, 211], [-9, -17, 252]],
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
        tip: "Están dentro de la Mansión Encantada. Lleva un equipo preparado: si quieres, móntalo antes en el constructor Competitivo.",
        link: ["Montar un equipo", "competitivo.html"],
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
