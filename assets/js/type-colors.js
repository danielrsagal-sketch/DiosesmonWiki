// Color de cada tipo (mismos tonos que Gimnasios) y etiqueta de tipo reutilizable.
const TYPE_COLORS = {
  Planta: "#368d56", Fuego: "#cc493d", Agua: "#367cc1", "Psíquico": "#ba5795", "Dragón": "#7150bb",
  Acero: "#657a8b", Normal: "#817f74", Roca: "#947445", Volador: "#537cc0", Veneno: "#8551a4",
  "Eléctrico": "#c29420", Fantasma: "#554b79", Bicho: "#77942c", Hada: "#c36c9a", Lucha: "#a04437",
  Tierra: "#aa8150", Hielo: "#51a4b6", Siniestro: "#514859",
};

function typeChip(type, className = "type-chip") {
  return `<span class="${className}" style="--type-color:${TYPE_COLORS[type] ?? "#555"}">${type}</span>`;
}
