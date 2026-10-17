// Crianza: datos y utilidades comunes del planificador, la Pokédex y la Tienda de IVs.
// Todo cuelga de window.VC para que los demás scripts de la página lo usen.
(function crianzaShared() {
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const ITEMS = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";
  const species = window.BREEDING_SPECIES ?? [];
  const byId = Object.fromEntries(species.map((entry) => [entry.id, entry]));

  // Cada stat con su objeto recio. Los colores salen de las variables de v-components.css.
  const STATS = [
    { key: "hp", short: "PS", label: "PS", color: "var(--bad)", cssVar: "--bad", item: "power-weight", itemName: "Pesa Recia" },
    { key: "atk", short: "ATQ", label: "Ataque", color: "var(--warn)", cssVar: "--warn", item: "power-bracer", itemName: "Brazal Recio" },
    { key: "def", short: "DEF", label: "Defensa", color: "var(--gold-2)", cssVar: "--gold-2", item: "power-belt", itemName: "Cinto Recio" },
    { key: "spa", short: "AT.E", label: "At. Esp.", color: "var(--info)", cssVar: "--info", item: "power-lens", itemName: "Lente Recia" },
    { key: "spd", short: "DEF.E", label: "Def. Esp.", color: "var(--ok)", cssVar: "--ok", item: "power-band", itemName: "Banda Recia" },
    { key: "spe", short: "VEL", label: "Velocidad", color: "var(--female)", cssVar: "--female", item: "power-anklet", itemName: "Franja Recia" },
  ];
  const statByKey = Object.fromEntries(STATS.map((stat) => [stat.key, stat]));
  const STAT_ORDER = STATS.map((stat) => stat.key);

  const TYPE_COLORS = {
    Planta: "#368d56", Fuego: "#cc493d", Agua: "#367cc1", "Psíquico": "#ba5795", "Dragón": "#7150bb",
    Acero: "#657a8b", Normal: "#817f74", Roca: "#947445", Volador: "#537cc0", Veneno: "#8551a4",
    "Eléctrico": "#c29420", Fantasma: "#554b79", Bicho: "#77942c", Hada: "#c36c9a", Lucha: "#a04437",
    Tierra: "#aa8150", Hielo: "#51a4b6", Siniestro: "#514859",
  };
  const TYPES = ["Normal", "Fuego", "Agua", "Planta", "Eléctrico", "Hielo", "Lucha", "Veneno", "Tierra", "Volador", "Psíquico", "Bicho", "Roca", "Fantasma", "Dragón", "Siniestro", "Acero", "Hada"];
  const EGG_GROUPS = ["Monstruo", "Agua 1", "Agua 2", "Agua 3", "Bicho", "Volador", "Campo", "Hada", "Planta", "Humanoide", "Mineral", "Amorfo", "Dragón", "Ditto", "Desconocido"];

  const NIDORAN = new Set([29, 30, 31, 32, 33, 34]);
  const VOLBEAT_ILLUMISE = new Set([313, 314]);
  const DITTO = 132;
  const RARITY = { common: "Común", uncommon: "Poco común", rare: "Raro", "ultra-rare": "Ultra raro" };
  const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, "ultra-rare": 3 };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const money = (value) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const normalize = (text) => String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const sprite = (id) => `${SPRITES}/${id}.png`;
  const itemIcon = (stat) => `${ITEMS}/${statByKey[stat].item}.png`;
  const itemUrl = (name) => `${ITEMS}/${name}.png`;
  const canBreed = (entry) => Boolean(entry) && !entry.egg.includes("Desconocido");
  const genderLabel = (ratio) => (ratio < 0 ? "Sin género" : ratio === 1 ? "Solo macho" : ratio === 0 ? "Solo hembra" : `${Math.round(ratio * 100)}% ♂ · ${Math.round((1 - ratio) * 100)}% ♀`);
  const typeChip = (type) => `<span class="type-chip" style="--type-color:${TYPE_COLORS[type] ?? "#555"}">${escapeHtml(type)}</span>`;

  // localStorage siempre con prefijo wiki-diosesmon-crianza- y dentro de try/catch.
  const store = {
    get(key, fallback) {
      try { const raw = localStorage.getItem(`wiki-diosesmon-crianza-${key}`); return raw == null ? fallback : JSON.parse(raw); } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(`wiki-diosesmon-crianza-${key}`, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
    },
  };

  // Línea evolutiva.
  const children = {};
  species.forEach((entry) => { if (entry.from) (children[entry.from] ??= []).push(entry.id); });
  const rootOf = (id) => { let current = byId[id]; while (current?.from && byId[current.from]) current = byId[current.from]; return current; };
  const lineOf = (id) => {
    const out = [];
    const walk = (node) => { out.push(byId[node]); (children[node] ?? []).forEach(walk); };
    walk(rootOf(id).id);
    return out;
  };
  const firstBreedable = (id) => lineOf(id).find(canBreed);
  // Cuanto menor, más fácil de encontrar (rareza, nivel, condiciones y biomas).
  const spawnScore = (entry) => (entry.spawn ? RARITY_RANK[entry.spawn.rarity] * 100 + Number.parseInt(entry.spawn.level, 10) + entry.spawn.notes.length * 12 - entry.spawn.places.length * 3 : 1000);

  // Zona Safari: lo que se atrapa allí trae al menos un IV a 31.
  const safariOf = {};
  (window.SAFARI_POKEMON ?? []).forEach((zone) => zone.pokemon.forEach(({ id, rare }) => (safariOf[id] ??= []).push({ zone, rare })));

  // Por qué una especie no se puede (o no conviene) criar.
  const breedBlock = (entry) => {
    if (NIDORAN.has(entry.id)) return "Crianza bugeada en el servidor";
    if (entry.id === DITTO) return null;
    if (!canBreed(entry)) return firstBreedable(entry.id) && firstBreedable(entry.id).id !== entry.id && entry.from == null ? "Bebé: no cría (sí sale del huevo)" : "Grupo Desconocido: no cría";
    return null;
  };

  // Tienda de IVs (NPC): cobra cada punto según el valor al que llega el IV (también al bajar).
  const IV_SHOP_BANDS = [
    { min: 0, max: 10, price: 1500 },
    { min: 11, max: 15, price: 3000 },
    { min: 16, max: 20, price: 6000 },
    { min: 21, max: 25, price: 10000 },
    { min: 26, max: 28, price: 20000 },
    { min: 29, max: 31, price: 50000 },
  ];
  const ivShopPointPrice = (value) => IV_SHOP_BANDS.find((band) => value <= band.max).price;
  const ivShopCost = (from, to) => {
    let total = 0;
    if (to > from) for (let value = from + 1; value <= to; value += 1) total += ivShopPointPrice(value);
    else for (let value = from - 1; value >= to; value -= 1) total += ivShopPointPrice(value);
    return total;
  };

  window.VC = {
    IV_SHOP_BANDS, ivShopPointPrice, ivShopCost,
    SPRITES, ITEMS, species, byId, STATS, statByKey, STAT_ORDER, TYPE_COLORS, TYPES, EGG_GROUPS, NIDORAN, VOLBEAT_ILLUMISE, DITTO, RARITY, RARITY_RANK,
    escapeHtml, money, normalize, sprite, itemIcon, itemUrl, canBreed, genderLabel, typeChip, store, rootOf, lineOf, firstBreedable, spawnScore, safariOf, breedBlock,
  };
})();
