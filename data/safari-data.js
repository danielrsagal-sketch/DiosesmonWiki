// Mapa de la Zona Safari. Editar a mano.
//
// Coordenadas en bloques de Minecraft: x (oeste − / este +) y z (norte − / sur +), como en F3.
// En el mapa, haz clic en cualquier punto para ver y copiar sus coordenadas.
//
// categories: tipos de punto. icon = sprite de PokéAPI (items/<nombre>, pokemon/<número>), imagen propia (assets/img/…) o URL completa.
// zones: nombre y posición de la etiqueta de cada zona.
// waypoints: puntos del mapa. type = una de las categorías. y (altura) y description son opcionales.
// Los de Xaero's Minimap («waypoint:Nombre:P:X:Y:Z:…») se pasan tomando X, Y y Z en ese orden.
window.SAFARI_MAP = {
  categories: {
    spawn: { label: "Spawn", color: "#ffd442", icon: "items/safari-ball" },
    taxi: { label: "Taxis", color: "#ffa64d", icon: "pokemon/823" },
    pokeparada: { label: "Poképaradas", color: "#26c6f9", icon: "assets/img/pokestop.png" },
    entrenador: { label: "Entrenadores", color: "#ff6fb1", icon: "https://play.pokemonshowdown.com/sprites/trainers/acetrainer.png" },
  },
  zones: [
    { id: "selva", name: "Selva Ancestral", x: -500, z: -860, color: "#46d466" },
    { id: "articos", name: "Campos Árticos", x: 520, z: -920, color: "#b4ecff" },
    { id: "cumbres", name: "Cumbres Salvajes", x: 1030, z: 40, color: "#c9e86a" },
    { id: "valle", name: "Valle Sombrío", x: 520, z: 840, color: "#ad85f5" },
    { id: "jardin", name: "Jardín Mágico", x: -620, z: 840, color: "#ea7dbd" },
    { id: "igneas", name: "Tierras Ígneas", x: -1120, z: -160, color: "#ff6d2e" },
  ],
  waypoints: [
    { type: "spawn", name: "Spawn de la Zona Safari", x: 0, z: 0, description: "Punto de llegada a la Zona Safari. Desde aquí salen los caminos hacia las 6 zonas." },
    { type: "taxi", name: "Taxi", x: -758, y: 66, z: -54 },
    { type: "taxi", name: "Taxi", x: -459, y: 66, z: 775 },
    { type: "pokeparada", name: "Poképarada", x: -1337, y: 82, z: -569 },
    { type: "pokeparada", name: "Poképarada", x: -1124, y: 86, z: 883 },
    { type: "pokeparada", name: "Poképarada", x: -1098, y: 67, z: 730 },
    { type: "pokeparada", name: "Poképarada", x: -1082, y: 65, z: 468 },
    { type: "pokeparada", name: "Poképarada", x: -830, y: 66, z: 733 },
    { type: "pokeparada", name: "Poképarada", x: -827, y: 98, z: 1108 },
    { type: "pokeparada", name: "Poképarada", x: -732, y: 105, z: 395 },
    { type: "pokeparada", name: "Poképarada", x: -656, y: 66, z: 844 },
    { type: "pokeparada", name: "Poképarada", x: -635, y: 77, z: 322 },
    { type: "pokeparada", name: "Poképarada", x: -505, y: 73, z: 1362 },
    { type: "pokeparada", name: "Poképarada", x: -463, y: 84, z: 900 },
    { type: "pokeparada", name: "Poképarada", x: -432, y: 70, z: 595 },
    { type: "pokeparada", name: "Poképarada", x: -369, y: 81, z: -1009 },
    { type: "pokeparada", name: "Poképarada", x: -313, y: 72, z: 1043 },
    { type: "pokeparada", name: "Poképarada", x: -181, y: 74, z: 837 },
    { type: "pokeparada", name: "Poképarada", x: 94, y: 68, z: -131 },
    { type: "pokeparada", name: "Poképarada", x: 196, y: 67, z: 7 },
    { type: "pokeparada", name: "Poképarada", x: 279, y: 66, z: -354 },
    { type: "pokeparada", name: "Poképarada", x: 331, y: 77, z: -51 },
    { type: "pokeparada", name: "Poképarada", x: 454, y: 67, z: -480 },
    { type: "entrenador", name: "Entrenador", x: -1222, y: 69, z: 72 },
    { type: "entrenador", name: "Entrenador", x: -604, y: 65, z: 459 },
    { type: "entrenador", name: "Entrenador", x: -400, y: 92, z: 1407 },
    { type: "entrenador", name: "Entrenador", x: -321, y: 78, z: 345 },
    { type: "entrenador", name: "Entrenador", x: -306, y: 65, z: 936 },
  ],
};
