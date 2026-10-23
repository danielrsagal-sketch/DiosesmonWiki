// Crianza: planificador de cadenas con pesas/brazales, inventario de 1x31, precios y compartir.
// Reglas de Diosesmon: la hembra decide la especie, los padres (y su objeto) se pierden al recoger el huevo,
// elegir el sexo y cada objeto recio cuestan 500 (configurable) y nunca se recomienda el Lazo Destino.
(function crianzaPlanner() {
  const VC = window.VC;
  if (!VC || !VC.species.length) return;
  const { byId, species, STATS, statByKey, STAT_ORDER, TYPE_COLORS, TYPES, NIDORAN, VOLBEAT_ILLUMISE, DITTO, RARITY,
    escapeHtml, money, normalize, sprite, itemIcon, canBreed, genderLabel, store, rootOf, lineOf, firstBreedable, spawnScore, safariOf } = VC;

  const OBJECTIVES = [
    { key: "4", label: "4 IVs", stats: (style) => (style === "special" ? ["hp", "spa", "spd", "spe"] : ["hp", "atk", "def", "spe"]) },
    { key: "5f", label: "5 IVs físico", hint: "sin At. Esp.", stats: () => ["hp", "atk", "def", "spd", "spe"] },
    { key: "5e", label: "5 IVs especial", hint: "sin Ataque", stats: () => ["hp", "def", "spa", "spd", "spe"] },
    { key: "6", label: "6 IVs", stats: () => ["hp", "atk", "def", "spa", "spd", "spe"] },
    { key: "trf", label: "Espacio Raro físico", hint: "Vel 0", trickRoom: true, stats: () => ["hp", "atk", "def", "spd"] },
    { key: "tre", label: "Espacio Raro especial", hint: "Vel 0", trickRoom: true, stats: () => ["hp", "def", "spa", "spd"] },
  ];
  // Pokémon competitivos de las generaciones 1 a 5 (que se pueden criar), con su papel habitual.
  const COMPETITIVE = [
    [445, "Físico"], [373, "Físico"], [248, "Físico"], [149, "Físico"], [376, "Físico"], [212, "Físico"], [448, "Mixto"], [286, "Físico"],
    [130, "Físico"], [461, "Físico"], [473, "Físico"], [472, "Defensivo"], [392, "Mixto"], [214, "Físico"], [68, "Físico"], [475, "Físico"],
    [184, "Físico"], [143, "Físico"], [450, "Defensivo"], [464, "Físico"], [230, "Mixto"], [398, "Físico"], [430, "Físico"], [466, "Físico"],
    [260, "Defensivo"], [257, "Mixto"], [142, "Físico"], [342, "Físico"], [359, "Físico"], [424, "Físico"], [237, "Soporte"], [452, "Defensivo"],
    [94, "Especial"], [65, "Especial"], [468, "Especial"], [282, "Especial"], [121, "Especial"], [462, "Especial"], [474, "Especial"], [135, "Especial"],
    [196, "Especial"], [407, "Especial"], [350, "Defensivo"], [131, "Especial"], [478, "Soporte"], [429, "Especial"], [157, "Especial"], [395, "Especial"],
    [3, "Especial"], [6, "Especial"], [9, "Especial"], [272, "Especial"], [460, "Especial"], [471, "Especial"], [469, "Especial"], [26, "Especial"],
    [242, "Defensivo"], [227, "Defensivo"], [197, "Defensivo"], [134, "Defensivo"], [36, "Soporte"], [437, "Defensivo"], [205, "Defensivo"], [423, "Defensivo"],
    [73, "Defensivo"], [477, "Defensivo"], [169, "Soporte"], [442, "Soporte"], [454, "Físico"], [80, "Defensivo"], [59, "Físico"], [112, "Físico"],
    [530, "Físico"], [635, "Especial"], [609, "Especial"], [612, "Físico"], [534, "Físico"], [553, "Físico"], [598, "Defensivo"], [637, "Especial"],
    [571, "Especial"], [560, "Defensivo"], [625, "Físico"], [591, "Defensivo"], [596, "Especial"], [576, "Soporte"], [497, "Especial"], [500, "Mixto"],
    [503, "Físico"], [620, "Físico"], [579, "Especial"], [593, "Defensivo"], [589, "Físico"], [563, "Defensivo"], [547, "Soporte"], [604, "Especial"],
  ];
  const ROLE_COLORS = { Físico: "var(--warn)", Especial: "var(--info)", Mixto: "var(--gold-2)", Defensivo: "var(--ok)", Soporte: "var(--female)" };
  // Espera de crianza y slots según el rango.
  const RANKS = [
    { key: "none", label: "Sin rango / Entrenador", minutes: 25, slots: 2 },
    { key: "as", label: "AS", minutes: 20, slots: 2 },
    { key: "lider", label: "Líder", minutes: 15, slots: 2 },
    { key: "maestro", label: "Maestro", minutes: 10, slots: 4 },
  ];
  const DEFAULT_PRICES = { item: 500, gender: 500 };
  // Código para compartir un plan: DIOSESMON-1: + JSON comprimido (gzip → base64url).
  const CODE_PREFIX = "DIOSESMON-1:";
  const formatTime = (minutes) => (minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `${minutes} min`);
  const sortStats = (list) => [...list].sort((a, b) => STAT_ORDER.indexOf(a) - STAT_ORDER.indexOf(b));
  const sameSet = (a, b) => a.length === b.length && a.every((value) => b.includes(value));

  // --- Preferencias guardadas ---
  // Una sola vez: pasa el progreso del planificador anterior (mismas claves de plan) al nuevo.
  (function migrateOldPlanner() {
    try {
      if (localStorage.getItem("wiki-diosesmon-crianza-planes") !== null) return;
      const old = JSON.parse(localStorage.getItem("wiki-diosesmon-crianza-v1") || "null");
      if (old && typeof old === "object") {
        const plans = {};
        Object.entries(old).forEach(([key, value]) => {
          plans[key] = Array.isArray(value) ? { done: value, owned: [], species: {} } : value;
        });
        store.set("planes", plans);
      }
      const rank = localStorage.getItem("wiki-diosesmon-crianza-rank");
      if (rank && localStorage.getItem("wiki-diosesmon-crianza-rango") === null) store.set("rango", rank);
      const safari = localStorage.getItem("wiki-diosesmon-crianza-safari");
      if (safari === "on" || safari === "off") store.set("safari", safari === "on");
    } catch { /* sin almacenamiento */ }
  })();
  let useSafari = store.get("safari", true) !== false;
  const prices = { ...DEFAULT_PRICES, ...store.get("precios", {}) };
  // Inventario de 1x31 por stat y por sexo: m = macho, f = hembra, d = Ditto (sirve de pareja de cualquier sexo).
  const SEXES = [
    { key: "m", icon: "♂", label: "machos", one: "macho" },
    { key: "f", icon: "♀", label: "hembras", one: "hembra" },
    { key: "d", icon: "◆", label: "Ditto", one: "Ditto" },
  ];
  const clampCount = (value) => Math.min(99, Math.max(0, Number.parseInt(value, 10) || 0));
  const inventory = (() => {
    const saved = store.get("inventario", {});
    const bySex = {};
    const counts = {};
    const use = {};
    STATS.forEach(({ key }) => {
      const old = saved.bySex?.[key];
      // Inventarios antiguos (sin sexo): lo guardado pasa a «machos» para no perderlo.
      bySex[key] = old ? { m: clampCount(old.m), f: clampCount(old.f), d: clampCount(old.d) } : { m: clampCount(saved.counts?.[key]), f: 0, d: 0 };
      counts[key] = bySex[key].m + bySex[key].f + bySex[key].d;
      use[key] = saved.use?.[key] !== false;
    });
    return { bySex, counts, use, auto: saved.auto !== false };
  })();
  const saveInventory = () => {
    STATS.forEach(({ key }) => { const box = inventory.bySex[key]; inventory.counts[key] = box.m + box.f + box.d; });
    store.set("inventario", { bySex: inventory.bySex, use: inventory.use, auto: inventory.auto });
  };
  const loadPlans = () => { const value = store.get("planes", {}); return value && typeof value === "object" ? value : {}; };
  const savePlans = (plans) => store.set("planes", plans);
  const planData = (plans, key) => {
    const value = plans[key] ?? {};
    const list = (array) => (Array.isArray(array) ? array.filter(Number.isFinite) : []);
    return { done: list(value.done), owned: list(value.owned), notOwned: list(value.notOwned), species: value.species && typeof value.species === "object" ? value.species : {} };
  };

  const safariBonus = (entry) => (!useSafari || !safariOf[entry.id] ? 0 : safariOf[entry.id].some((place) => !place.rare) ? -1000 : -400);
  const safariLine = (entry) => (useSafari && safariOf[entry.id] ? `<small class="cr-safari">Safari: ${safariOf[entry.id].map(({ zone, rare }) => `${escapeHtml(zone.name)}${rare ? " (raro)" : ""}`).join(" · ")}</small>` : "");

  // --- Estado ---
  const state = { target: null, objective: null, custom: null, breeder: null, start: null, priority: null, browse: "competitive", type: null, query: "", selected: null, root: null, planKey: null, needs: {}, info: null, totals: null };
  let planName = String(store.get("nombre", "") ?? "").slice(0, 80);

  // Análisis del Pokémon objetivo.
  function analyse(target) {
    const line = lineOf(target.id);
    const egg = line[0];
    const breedable = line.filter(canBreed);
    const parent = [...breedable].sort((a, b) => spawnScore(a) - spawnScore(b))[0] ?? null;
    const style = target.atk >= target.spa + 15 ? "physical" : target.spa >= target.atk + 15 ? "special" : "mixed";
    const ratio = (parent ?? target).male;
    // Sin género: crían con su grupo huevo y hacen de madre. Solo macho: siempre con Ditto, salvo Volbeat (madre Illumise).
    const mode = !parent ? "blocked" : NIDORAN.has(target.id) ? "nidoran" : ratio === 1 && !VOLBEAT_ILLUMISE.has(target.id) ? "ditto" : ratio < 0 ? "genderless" : "normal";
    const warnings = [];
    if (!parent) warnings.push({ tone: "bad", text: "Esta especie no puede criar (grupo huevo Desconocido): no se puede conseguir por crianza." });
    if (mode === "nidoran") warnings.push({ tone: "bad", text: "La crianza de Nidoran♂ y Nidoran♀ está bugeada en el servidor: te recomendamos no hacerla." });
    if (VOLBEAT_ILLUMISE.has(target.id)) warnings.push({ tone: "warn", text: "Volbeat e Illumise: la cría siempre sale 50/50 y no se puede elegir el sexo. Usa una Illumise como madre." });
    if (ratio < 0 && parent) warnings.push({ tone: "info", text: `${parent.name} no tiene género: puede criar con cualquier Pokémon de su grupo huevo (${parent.egg.join(" o ")}) o con Ditto. Cruzado con un macho hace de madre y del huevo sale ${egg.name}; sus crías no tienen sexo, así que no pagas elegir sexo en su rama.` });
    if (ratio === 1 && parent && !VOLBEAT_ILLUMISE.has(target.id)) warnings.push({ tone: "warn", text: `${parent.name} es siempre macho: necesitas un Ditto como pareja en cada cruce de su rama.` });
    if (egg.egg.includes("Desconocido") && parent && egg.id !== parent.id) warnings.push({ tone: "info", text: `${egg.name} es una especie bebé y no puede criar: usa ${breedable.map((entry) => entry.name).join(" o ")} y del huevo saldrá ${egg.name}.` });
    return { line, egg, parent, style, mode, warnings };
  }

  // Especies que pueden cruzarse con la línea del objetivo (comparten grupo huevo).
  const compatibleWith = (info) => species.filter((entry) => canBreed(entry) && !NIDORAN.has(entry.id)
    && (entry.id === DITTO || entry.egg.some((group) => info.parent.egg.includes(group))));

  function breedersFor(info) {
    if (!info.parent) return [];
    return compatibleWith(info)
      .filter((entry) => entry.id !== DITTO && entry.male > 0 && entry.male < 1 && (entry.spawn || (useSafari && safariOf[entry.id])))
      .sort((a, b) => spawnScore(a) + (canBreed(rootOf(a.id)) ? 0 : 80) + safariBonus(a) - spawnScore(b) - (canBreed(rootOf(b.id)) ? 0 : 80) - safariBonus(b))
      .slice(0, 12);
  }

  // --- Árbol de la cadena ---
  // Un Pokémon con esos IVs a 31 sale de cruzar (stats − último) × (stats − penúltimo).
  let counter = 0;
  function buildTree(stats, onPath) {
    const node = { id: counter++, stats, onPath };
    if (stats.length === 1) return node;
    const left = stats.filter((_, index) => index !== stats.length - 1);
    const right = stats.filter((_, index) => index !== stats.length - 2);
    node.left = buildTree(left, false);
    node.right = buildTree(right, onPath);
    node.left.item = left.find((stat) => !right.includes(stat));
    node.right.item = right.find((stat) => !left.includes(stat));
    return node;
  }
  // Especies que solo crían con Ditto: objetivo × Ditto con una stat nueva en cada paso.
  function buildDittoChain(stats) {
    let node = { id: counter++, stats: [stats[0]], onPath: true };
    for (let index = 1; index < stats.length; index += 1) {
      const ditto = { id: counter++, stats: [stats[index]], ditto: true, item: stats[index] };
      node.item = node.stats[0];
      node = { id: counter++, stats: stats.slice(0, index + 1), onPath: true, left: ditto, right: node };
    }
    return node;
  }

  const defaultSpecies = (node, info, breeder) => (node.ditto ? byId[DITTO] : node.onPath ? (VOLBEAT_ILLUMISE.has(state.target.id) ? byId[314] : info.parent) : breeder);

  // Hojas cubiertas por el inventario de 1x31, sin pisar las marcas manuales (owned / notOwned).
  // Cada hoja necesita un sexo: el padre de la izquierda es macho y la madre de la derecha, hembra.
  // En las parejas de breeders da igual quién sea quién (los dos son breeders), así que se giran
  // para aprovechar los machos y hembras que tienes; un Ditto puede ocupar cualquiera de los dos huecos.
  // La rama de tu especie es fija: allí la madre tiene que ser tu Pokémon.
  function inventoryMarks(root, plan, info) {
    const manual = new Set(plan.owned);
    const refused = new Set(plan.notOwned);
    const remaining = {};
    STATS.forEach(({ key }) => { remaining[key] = { ...inventory.bySex[key] }; });
    const auto = new Set();
    const leafSex = (node, side) => {
      if (node.ditto) return "d";
      if (node.onPath && info.mode === "genderless") return null; // sin género: no sale del inventario por sexo
      if (node.onPath && info.mode === "ditto") return "m";
      return side === "left" ? "m" : "f";
    };
    const take = (stat, sex, allowDitto) => {
      const box = remaining[stat];
      if (sex && box[sex] > 0) { box[sex] -= 1; return sex; }
      if (allowDitto && sex !== "d" && box.d > 0) { box.d -= 1; return "d"; }
      return null;
    };
    const usable = (node) => !manual.has(node.id) && !refused.has(node.id);
    // Un Ditto del inventario puede sustituir a un breeder (no a tu especie, ni en las cadenas con Ditto).
    const dittoOk = (node) => !node.onPath && !node.ditto && info.mode !== "ditto";
    // Saca del inventario lo que pide una hoja en su lado; devuelve el sexo usado o null.
    const fill = (node, side, allowDitto = true) => (usable(node) ? take(node.stats[0], leafSex(node, side), allowDitto && dittoOk(node)) : null);
    const mark = (node, got) => {
      if (!got) return;
      auto.add(node.id);
      if (got === "d" && !node.ditto) node.inventoryDitto = true;
    };
    // Grupos de hojas: parejas de dos hojas (las de breeders se pueden girar) y hojas sueltas junto a un cruce.
    const units = [];
    const walk = (node, isRoot) => {
      if (!isRoot && manual.has(node.id)) {
        if (!node.left) { const sex = leafSex(node, node.side); if (sex) take(node.stats[0], sex, false); }
        return;
      }
      if (!node.left) return;
      node.left.side = "left";
      node.right.side = "right";
      const leafL = !node.left.left;
      const leafR = !node.right.left;
      if (leafL && leafR) units.push({ pair: node });
      else {
        if (leafL) units.push({ leaf: node.left });
        if (leafR) units.push({ leaf: node.right });
      }
      walk(node.left, false);
      walk(node.right, false);
    };
    walk(root, true);
    if (inventory.auto) {
      const onPathUnit = (unit) => Boolean(unit.pair ? unit.pair.onPath : unit.leaf.onPath);
      // Primero los breeders; tu especie, al final (suele ser una captura concreta).
      units.sort((a, b) => Number(onPathUnit(a)) - Number(onPathUnit(b))).forEach((unit) => {
        if (unit.leaf) { mark(unit.leaf, fill(unit.leaf, unit.leaf.side)); return; }
        const pair = unit.pair;
        const canSwap = !pair.onPath && info.mode !== "ditto" && !pair.left.ditto && !pair.right.ditto;
        // Prueba las dos orientaciones sobre una copia y se queda con la que cubre más hojas (gastando menos Ditto).
        const simulate = (swap) => {
          const saved = JSON.stringify(remaining);
          const [l, r] = swap ? [pair.right, pair.left] : [pair.left, pair.right];
          const gotL = fill(l, "left");
          const gotR = fill(r, "right", gotL !== "d");
          const result = { swap, score: Number(Boolean(gotL)) + Number(Boolean(gotR)) - 0.1 * (Number(gotL === "d") + Number(gotR === "d")) };
          Object.assign(remaining, JSON.parse(saved));
          return result;
        };
        const options = [simulate(false)];
        if (canSwap) options.push(simulate(true));
        const best = options.reduce((a, b) => (b.score > a.score ? b : a));
        if (best.swap) {
          [pair.left, pair.right] = [pair.right, pair.left];
          [pair.left.side, pair.right.side] = ["left", "right"];
        }
        const gotL = fill(pair.left, "left");
        mark(pair.left, gotL);
        mark(pair.right, fill(pair.right, "right", gotL !== "d"));
      });
    }
    return { auto, remaining };
  }

  // Lo que pide el árbol (ya con los sexos) frente a lo que tienes, por stat y sexo.
  function inventoryNeeds(root, remaining) {
    const needs = {};
    STATS.forEach(({ key }) => { needs[key] = { m: 0, f: 0, d: 0, x: 0, missing: { m: 0, f: 0, d: 0, x: 0 }, total: 0 }; });
    leavesOf(root).forEach((leaf) => {
      if (leaf.left) return; // un cruce que ya tienes no es una hoja de captura
      const stat = leaf.stats[0];
      const sex = leaf.species?.id === DITTO ? "d" : leaf.sex === "male" ? "m" : leaf.sex === "female" ? "f" : "x";
      needs[stat][sex] += 1;
      needs[stat].total += 1;
      if (!leaf.owned) needs[stat].missing[sex] += 1;
    });
    STATS.forEach(({ key }) => { needs[key].spare = remaining?.[key] ?? { m: 0, f: 0, d: 0 }; });
    return needs;
  }

  // De cada cruce sale la especie base de la madre (o del padre si la pareja es Ditto).
  function assignRoles(node, info, breeder, sex, plan, ownedSet, autoSet, isRoot = true) {
    node.sex = sex;
    const owned = !isRoot && ownedSet.has(node.id);
    node.owned = owned;
    node.autoOwned = owned && autoSet.has(node.id);
    if (!node.left || owned) {
      node.species = byId[plan.species[node.id]] ?? (node.inventoryDitto ? byId[DITTO] : defaultSpecies(node, info, breeder));
      if (node.species.id === DITTO || node.species.male < 0) node.sex = null;
      node.custom = Boolean(plan.species[node.id]);
      return;
    }
    const pathSex = info.mode === "ditto" ? (info.parent.male < 0 ? null : "male") : info.mode === "genderless" ? null : "female";
    assignRoles(node.left, info, breeder, info.mode === "ditto" ? null : "male", plan, ownedSet, autoSet, false);
    assignRoles(node.right, info, breeder, node.onPath ? pathSex : "female", plan, ownedSet, autoSet, false);
    if (info.mode === "ditto" && node.onPath) node.sex = pathSex;
    const motherNode = node.right.species.id === DITTO ? node.left : node.right;
    const mother = motherNode.evolveTo ?? motherNode.species;
    node.species = rootOf(mother.id);
    if (!canBreed(node.species) && !isRoot) node.evolveTo = firstBreedable(node.species.id);
    node.issues = pairIssues(node.left, node.right);
  }

  // Comprueba que un cruce se puede hacer en la guardería.
  function pairIssues(father, mother) {
    const issues = [];
    const a = father.evolveTo ?? father.species;
    const b = mother.evolveTo ?? mother.species;
    if (a.id === DITTO && b.id === DITTO) issues.push("Dos Ditto no pueden criar entre sí.");
    if (a.id !== DITTO && b.id !== DITTO) {
      if (!a.egg.some((group) => b.egg.includes(group))) issues.push(`${a.name} y ${b.name} no comparten grupo huevo.`);
      if (b.male === 1) issues.push(`${b.name} no puede ir como hembra.`);
      if (a.male === 0) issues.push(`${a.name} no puede ir como macho.`);
    }
    if (NIDORAN.has(a.id) || NIDORAN.has(b.id)) issues.push("La crianza de Nidoran está bugeada.");
    if (!canBreed(a) || !canBreed(b)) issues.push("Uno de los padres no puede criar.");
    return issues;
  }

  // Cruces a hacer (lo que ya tienes no hace falta criarlo) y numeración.
  function collectBreeds(root) {
    const breeds = [];
    const depthOf = (node) => (node.left && !node.owned ? 1 + Math.max(depthOf(node.left), depthOf(node.right)) : 0);
    const walk = (node) => { if (node.left && !node.owned) { walk(node.left); walk(node.right); breeds.push(node); } };
    walk(root);
    breeds.sort((a, b) => depthOf(a) - depthOf(b) || a.id - b.id);
    breeds.forEach((node, index) => { node.step = index + 1; });
    return breeds;
  }
  const leavesOf = (node) => (node.left && !node.owned ? [...leavesOf(node.left), ...leavesOf(node.right)] : [node]);
  const findNode = (node, id) => (node.id === id ? node : node.left ? findNode(node.left, id) ?? findNode(node.right, id) : null);
  const isLeafLike = (node) => !node.left || node.owned;

  // --- Elementos ---
  const $ = (id) => document.getElementById(id);
  const els = {
    search: $("cr-search"), browseTabs: $("cr-browse-tabs"), types: $("cr-types"), picks: $("cr-picks"), target: $("cr-target"),
    objectives: $("cr-objectives"), custom: $("cr-custom"), invHint: $("cr-inv-hint"), breeders: $("cr-breeders"), breederSelect: $("cr-breeder-select"),
    tree: $("cr-tree"), treeWrap: $("cr-tree-wrap"), editor: $("cr-editor"), start: $("cr-start"), summary: $("cr-summary"), steps: $("cr-steps"), planner: $("cr-planner"),
    invGrid: $("cr-inv-grid"), invStatus: $("cr-inv-status"), invAuto: $("cr-inv-auto"),
    priceItem: $("cr-price-item"), priceGender: $("cr-price-gender"), pricesSum: $("cr-prices-sum"),
    planName: $("cr-plan-name"), codeOut: $("cr-code-out"), codeIn: $("cr-code-in"), codeCopy: $("cr-code-copy"), shareStatus: $("cr-share-status"),
  };

  const statChips = (stats) => sortStats(stats).map((stat) => `<span class="cr-stat" style="--stat-color:${statByKey[stat].color}">${statByKey[stat].short}</span>`).join("");
  const sexIcon = (sex) => (sex === "male" ? '<span class="cr-sex is-male" title="Macho">♂</span>' : sex === "female" ? '<span class="cr-sex is-female" title="Hembra">♀</span>' : "");
  const sexText = (sex) => (sex === "male" ? " ♂" : sex === "female" ? " ♀" : "");
  const setStatus = (element, text, tone = "") => { element.className = `cr-status${tone ? ` is-${tone}` : ""}`; element.innerHTML = text; };

  // --- Selector de Pokémon objetivo ---
  const roleOf = Object.fromEntries(COMPETITIVE);
  const autoRole = (entry) => (entry.atk >= entry.spa + 15 ? "Físico" : entry.spa >= entry.atk + 15 ? "Especial" : "Mixto");
  els.types.innerHTML = TYPES.map((type) => `<button class="cr-type" type="button" data-type="${type}" aria-pressed="false" style="--type-color:${TYPE_COLORS[type]}"><i></i>${type}</button>`).join("");

  function renderBrowser() {
    els.browseTabs.querySelectorAll("[data-browse]").forEach((tab) => tab.setAttribute("aria-pressed", String(tab.dataset.browse === state.browse)));
    els.types.querySelectorAll("[data-type]").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.type === state.type)));
    const query = normalize(state.query);
    let list = state.browse === "competitive" ? COMPETITIVE.map(([id]) => byId[id]).filter(Boolean) : species;
    if (state.type) list = list.filter((entry) => entry.types.includes(state.type));
    if (query) list = (state.browse === "competitive" && !list.some((entry) => normalize(entry.name).includes(query)) ? species : list)
      .filter((entry) => normalize(entry.name).includes(query) || String(entry.id) === query);
    els.picks.innerHTML = list.slice(0, 160).map((entry) => {
      const role = roleOf[entry.id] ?? autoRole(entry);
      return `<button class="cr-pick${state.target?.id === entry.id ? " is-active" : ""}" type="button" data-target="${entry.id}" aria-pressed="${state.target?.id === entry.id}">
        <img class="pixel" src="${sprite(entry.id)}" alt="" width="64" height="64" loading="lazy">
        <strong>${escapeHtml(entry.name)}</strong>
        <small style="--role-color:${ROLE_COLORS[role]}">${role}</small>
      </button>`;
    }).join("") || '<p class="cr-note cr-more">Ningún Pokémon coincide con la búsqueda.</p>';
    if (list.length > 160) els.picks.insertAdjacentHTML("beforeend", `<p class="cr-note cr-more">Y ${list.length - 160} más: escribe el nombre o filtra por tipo.</p>`);
  }

  // --- Objetivo, breeders y stats del plan ---
  function currentStats(info) {
    if (state.objective === "custom") return sortStats(state.custom ?? []);
    const objective = OBJECTIVES.find((entry) => entry.key === state.objective) ?? OBJECTIVES[1];
    return objective.stats(info.style);
  }
  // Orden de las stats en el árbol: la primera es la que más se repite; la de inicio va al final (en la cadena con Ditto, al principio).
  function planStats(info) {
    const base = currentStats(info);
    const rank = (stat) => (state.priority?.includes(stat) ? state.priority.indexOf(stat) : 10 + STAT_ORDER.indexOf(stat));
    const ordered = [...base].sort((a, b) => rank(a) - rank(b));
    if (!base.includes(state.start)) state.start = null;
    const startStat = state.start ?? (info.mode === "ditto" ? ordered[0] : ordered[ordered.length - 1]);
    const others = ordered.filter((stat) => stat !== startStat);
    return { base, startStat, stats: base.length ? (info.mode === "ditto" ? [startStat, ...others] : [...others, startStat]) : [] };
  }
  const planKeyFor = (info, stats) => {
    const breeder = byId[state.breeder] ?? info.parent;
    return `${state.target.id}:${stats.join(",")}:${info.mode === "ditto" ? DITTO : breeder.id}`;
  };

  function renderTarget(info) {
    const target = state.target;
    const styleText = { physical: "Atacante físico", special: "Atacante especial", mixed: "Mixto" }[info.style];
    const recommendation = { physical: "5 IVs físico", special: "5 IVs especial", mixed: "6 IVs" }[info.style];
    const femaleTarget = info.mode === "ditto" ? `${info.egg.name}${info.parent.male < 0 ? "" : " ♂"}` : info.mode === "genderless" ? info.egg.name : `${info.egg.name} ♀`;
    els.target.innerHTML = `
      <div class="cr-target-card">
        <img class="cr-target-sprite" src="${VC.SPRITES}/other/official-artwork/${target.id}.png" alt="" width="140" height="140">
        <div class="cr-target-info">
          <small>#${String(target.id).padStart(3, "0")} · ${target.types.map(VC.typeChip).join(" ")}${roleOf[target.id] ? ` · ${roleOf[target.id]}` : ""}</small>
          <h3>${escapeHtml(target.name)}</h3>
          ${info.parent && info.mode !== "nidoran"
            ? `<p class="cr-goal">Tu objetivo: <strong>${escapeHtml(femaleTarget)}</strong> con los IVs del plan${info.egg.id !== target.id ? `, y luego evolucionarlo a ${escapeHtml(target.name)}` : ""}.</p>`
            : `<p class="cr-goal is-blocked">${info.parent ? "No recomendamos criar esta especie en el servidor." : "Esta especie no se puede criar."}</p>`}
          <ul class="cr-facts">
            <li><span>Del huevo sale</span><strong><img class="pixel" src="${sprite(info.egg.id)}" alt="" width="32" height="32">${escapeHtml(info.egg.name)}</strong></li>
            <li><span>Madre de la cadena</span><strong>${info.parent ? `<img class="pixel" src="${sprite(info.parent.id)}" alt="" width="32" height="32">${escapeHtml(info.parent.name)}` : "—"}</strong></li>
            <li><span>Grupos huevo</span><strong>${(info.parent ?? target).egg.join(" · ")}</strong></li>
            <li><span>Sexo</span><strong>${genderLabel((info.parent ?? target).male)}</strong></li>
            <li><span>Estilo</span><strong>${styleText} <em>(Atq ${target.atk} · AtE ${target.spa})</em></strong></li>
            <li><span>Recomendado</span><strong>${recommendation}${target.spe <= 50 ? " o Espacio Raro" : ""}</strong></li>
          </ul>
        </div>
      </div>
      ${info.warnings.map((warning) => `<p class="v-note cr-warning is-${warning.tone}${warning.tone === "bad" ? " is-bad" : ""}"><span>${escapeHtml(warning.text)}</span></p>`).join("")}`;
  }

  function renderObjectives(info) {
    els.objectives.innerHTML = OBJECTIVES.map((objective) => `<button class="v-chip" type="button" data-objective="${objective.key}" aria-pressed="${state.objective === objective.key}">${objective.label}${objective.hint ? ` <small>${objective.hint}</small>` : ""}</button>`).join("")
      + `<button class="v-chip" type="button" data-objective="custom" aria-pressed="${state.objective === "custom"}">Personalizado</button>`;
    const stats = currentStats(info);
    els.custom.innerHTML = STATS.map((stat) => `<label class="cr-toggle" style="--stat-color:${stat.color}"><input type="checkbox" data-stat="${stat.key}" ${stats.includes(stat.key) ? "checked" : ""}><span>${stat.short}</span></label>`).join("")
      + '<small class="cr-custom-help">Toca las stats para hacer tu propio objetivo.</small>';
    // Recordatorio del inventario.
    const total = Object.values(inventory.counts).reduce((sum, value) => sum + value, 0);
    const best = total ? bestObjective(info) : null;
    els.invHint.innerHTML = total
      ? `<span>📦 Con tu inventario (${STATS.filter(({ key }) => inventory.counts[key]).map(({ key, short }) => `${short} ${sexCount(inventory.bySex[key], ["m", "f", "d"])}`).join(" · ")}) ${best ? `te alcanza para <strong>${best.stats.length} IVs</strong>.` : "aún no llegas a 2 IVs."}</span> ${best ? '<button type="button" class="v-btn is-sm" data-suggest>✨ Usar lo que tengo</button>' : ""} <a href="#inventario" data-jump="inventario">Editar inventario</a>`
      : '<span>¿Ya tienes Pokémon con un IV a 31?</span> <a href="#inventario" data-jump="inventario">Apúntalos en tu inventario</a> y te sugerimos el objetivo.';
  }

  function renderBreeders(info, list) {
    const pick = els.breederSelect.closest(".v-field");
    if (info.mode === "ditto") {
      $("cr-safari-note").innerHTML = "";
      els.breeders.innerHTML = '<p class="cr-note">Esta especie solo cría con <strong>Ditto</strong>: consigue Dittos con un 31 distinto cada uno (el Safari asegura 1 IV a 31) o mejóralos en la Tienda de IVs.</p>';
      pick.hidden = true;
      return;
    }
    pick.hidden = false;
    const compatible = compatibleWith(info).filter((entry) => entry.id !== DITTO && entry.male > 0 && entry.male < 1);
    els.breederSelect.innerHTML = compatible.sort((a, b) => a.name.localeCompare(b.name, "es")).map((entry) => `<option value="${entry.id}" ${entry.id === state.breeder ? "selected" : ""}>${escapeHtml(entry.name)}${safariOf[entry.id] ? " · Safari" : ""}</option>`).join("");
    els.breeders.innerHTML = list.map((entry) => `
      <button class="cr-breeder${entry.id === state.breeder ? " is-active" : ""}" type="button" data-breeder="${entry.id}" aria-pressed="${entry.id === state.breeder}">
        <img class="pixel" src="${sprite(entry.id)}" alt="" width="64" height="64" loading="lazy">
        <span><strong>${escapeHtml(entry.name)}</strong>
          ${safariLine(entry)}
          ${entry.spawn ? `<small><b class="cr-rarity is-${entry.spawn.rarity}">${RARITY[entry.spawn.rarity]}</b> · Nv. ${entry.spawn.level}</small>
          <small>${entry.spawn.places.slice(0, 3).map(escapeHtml).join(" · ")}</small>` : ""}
          <em>${entry.egg.join(" · ")}</em></span>
      </button>`).join("") || '<p class="cr-note">No hay breeders compatibles con spawn salvaje.</p>';
    const fromSafari = useSafari ? compatible.filter((entry) => safariOf[entry.id]) : [];
    $("cr-safari-note").innerHTML = fromSafari.length ? `<p class="cr-safari-note"><img class="pixel" src="${VC.itemUrl("safari-ball")}" alt="" width="28" height="28"><span><strong>${fromSafari.length} breeders compatibles salen en la Zona Safari</strong>, con al menos un IV a 31.</span></p>` : "";
  }

  // --- Árbol en HTML ---
  function nodeHtml(node) {
    const isBreed = node.left && !node.owned;
    const entry = node.species;
    const classes = ["cr-node", isBreed ? "is-breed" : "is-leaf", node.onPath && "is-path", node.ditto && "is-ditto", node.done && "is-done",
      node === state.root && "is-root", node.owned && "is-owned", node.issues?.length && "has-issue", state.selected === node.id && "is-selected"].filter(Boolean).join(" ");
    const card = `
      <div class="${classes}" data-node="${node.id}" tabindex="0" role="button" aria-label="Editar ${escapeHtml(entry.name)}">
        ${isBreed ? `<label class="cr-node-step" title="Marcar cruce como hecho"><input type="checkbox" data-step="${node.step}" ${node.done ? "checked" : ""} aria-label="Cruce ${node.step} hecho"><span>${node.step}</span></label>` : ""}
        ${node.owned ? `<span class="cr-owned" title="${node.autoOwned ? "De tu inventario" : "Ya lo tienes"}">★</span>` : ""}
        <img class="cr-node-sprite pixel" src="${sprite(entry.id)}" alt="" width="48" height="48" loading="lazy">
        <div class="cr-node-body">
          <strong>${escapeHtml(entry.name)} ${sexIcon(node.sex)}${node.issues?.length ? ' <span class="cr-issue" title="Cruce no válido">⚠</span>' : ""}</strong>
          ${node.evolveTo ? `<small class="cr-evolve">→ evoluciona a ${escapeHtml(node.evolveTo.name)}</small>` : ""}
          ${node.owned ? `<small class="cr-evolve is-owned">${node.autoOwned ? "De tu inventario" : "Ya lo tienes"}</small>` : ""}
          <span class="cr-node-stats">${statChips(node.stats)}</span>
        </div>
        ${node.item ? `<img class="cr-node-item pixel" src="${itemIcon(node.item)}" alt="${statByKey[node.item].itemName}" title="Lleva ${statByKey[node.item].itemName}" width="30" height="30">` : ""}
      </div>`;
    if (!isBreed) return `<div class="cr-branch">${card}</div>`;
    return `<div class="cr-branch"><div class="cr-kids">${nodeHtml(node.left)}${nodeHtml(node.right)}</div>${card}</div>`;
  }

  function renderEditor(info, plan) {
    const node = state.selected != null && state.root ? findNode(state.root, state.selected) : null;
    if (!node) {
      els.editor.innerHTML = '<p class="cr-note cr-editor-empty">👆 Toca cualquier Pokémon del árbol para cambiar su especie o marcar que <strong>ya lo tienes</strong> (la cadena empieza desde ahí).</p>';
      return;
    }
    const editable = isLeafLike(node);
    const isRoot = node === state.root;
    const options = compatibleWith(info)
      .filter((entry) => (node.sex === "female" ? entry.male < 1 : node.sex === "male" ? entry.male > 0 : true))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    const current = node.species.id;
    const refused = plan.notOwned.includes(node.id);
    els.editor.innerHTML = `
      <div class="cr-editor-card">
        <img class="pixel" src="${sprite(node.species.id)}" alt="" width="72" height="72">
        <div class="cr-editor-body">
          <strong>${escapeHtml(node.species.name)}${sexText(node.sex)} <span class="cr-node-stats">${statChips(node.stats)}</span></strong>
          <small>${isRoot ? "Tu Pokémon final." : node.left && !node.owned ? `Sale del cruce ${node.step}: su especie la decide la madre.` : node.owned ? (node.autoOwned ? "Marcado desde tu inventario de 1x31. Desmárcalo si este en concreto no lo tienes." : "Ya lo tienes: no hace falta criarlo ni a sus padres.") : `Pokémon base: atrápalo con 31 en ${statByKey[node.stats[0]].label}.`}</small>
          ${editable ? `<label class="v-field"><span>Especie</span><select class="v-select" data-edit-species>${options.map((entry) => `<option value="${entry.id}" ${entry.id === current ? "selected" : ""}>${escapeHtml(entry.name)}${entry.id === DITTO ? " (Ditto)" : ""}${safariOf[entry.id] ? " · Safari" : ""}</option>`).join("")}</select></label>` : ""}
          ${!isRoot ? `<label class="v-check"><input type="checkbox" data-edit-owned ${node.owned ? "checked" : ""}><span>Ya tengo este Pokémon con estos IVs${node.left ? " (empezar desde aquí)" : ""}</span></label>` : ""}
          ${node.issues?.length ? `<p class="v-note is-bad"><span>${node.issues.map(escapeHtml).join(" ")}</span></p>` : ""}
          ${node.custom || plan.owned.includes(node.id) || refused ? '<button class="v-btn is-ghost is-sm" type="button" data-edit-reset>Restablecer este Pokémon</button>' : ""}
        </div>
        <button class="cr-editor-close" type="button" data-edit-close aria-label="Cerrar editor">✕</button>
      </div>`;
  }

  function renderStart(info, stats, startStat) {
    const starter = VOLBEAT_ILLUMISE.has(state.target.id) ? byId[314] : info.parent;
    const sex = info.mode === "ditto" ? (starter.male < 0 ? "" : " ♂") : info.mode === "genderless" ? "" : " ♀";
    els.start.innerHTML = `
      <img class="pixel" src="${sprite(starter.id)}" alt="" width="56" height="56">
      <div>
        <strong>¿Con qué IV a 31 empieza tu ${escapeHtml(starter.name)}${sex}?</strong>
        <small>Elige el IV perfecto que ya tiene tu Pokémon de partida y la cadena se arma desde ahí.</small>
        <div class="cr-start-chips">${stats.map((stat) => `<button type="button" class="cr-start-chip" data-start="${stat}" aria-pressed="${stat === startStat}" style="--stat-color:${statByKey[stat].color}">${statByKey[stat].label}</button>`).join("")}</div>
      </div>`;
  }

  function renderPlan(info) {
    if (!info.parent || info.mode === "nidoran") {
      els.planner.hidden = true;
      state.root = null;
      state.needs = {};
      return;
    }
    els.planner.hidden = false;
    const { base, startStat, stats } = planStats(info);
    renderStart(info, base, startStat);
    if (stats.length < 2) {
      els.tree.innerHTML = '<p class="cr-note">Elige al menos 2 stats para armar una cadena.</p>';
      els.summary.innerHTML = "";
      els.steps.innerHTML = "";
      els.editor.innerHTML = "";
      state.root = null;
      state.needs = {};
      fitTree();
      renderInventory();
      return;
    }
    counter = 0;
    const breeder = byId[state.breeder] ?? info.parent;
    const planKey = planKeyFor(info, stats);
    const plan = planData(loadPlans(), planKey);
    const root = info.mode === "ditto" ? buildDittoChain(stats) : buildTree(stats, true);
    state.root = root;
    state.planKey = planKey;
    const marks = inventoryMarks(root, plan, info);
    const ownedSet = new Set([...plan.owned, ...marks.auto]);
    assignRoles(root, info, breeder, info.mode === "ditto" ? (info.parent.male < 0 ? null : "male") : info.mode === "genderless" ? null : "female", plan, ownedSet, marks.auto);
    state.needs = inventoryNeeds(root, marks.remaining);
    const breeds = collectBreeds(root);
    breeds.forEach((node) => { node.done = plan.done.includes(node.step); });
    els.tree.innerHTML = nodeHtml(root);
    renderEditor(info, plan);

    // Compra y costes.
    const leaves = leavesOf(root);
    const toCatch = leaves.filter((leaf) => !leaf.owned);
    const owned = leaves.filter((leaf) => leaf.owned);
    const shopping = {};
    toCatch.forEach((leaf) => { const key = `${leaf.species.id}|${leaf.sex ?? ""}|${leaf.stats[0]}`; shopping[key] = (shopping[key] ?? 0) + 1; });
    const items = {};
    breeds.flatMap((node) => [node.left, node.right]).forEach((parent) => { if (parent.item) items[parent.item] = (items[parent.item] ?? 0) + 1; });
    const itemCount = Object.values(items).reduce((sum, value) => sum + value, 0);
    // Elegir sexo solo si la cría tiene sexo: en la rama de un sin género, con Ditto o en Volbeat/Illumise no se paga.
    const genderBreeds = VOLBEAT_ILLUMISE.has(state.target.id) || info.mode === "ditto" ? [] : breeds.filter((node) => !(info.mode === "genderless" && node.onPath));
    const genderCost = genderBreeds.length * prices.gender;
    const itemCost = itemCount * prices.item;
    const total = itemCost + genderCost;
    const pending = breeds.filter((node) => !node.done);
    const remainingCost = pending.reduce((sum, node) => sum + [node.left, node.right].filter((parent) => parent.item).length * prices.item + (genderBreeds.includes(node) ? prices.gender : 0), 0);
    const shopCost = stats.length * VC.ivShopCost(0, 31);
    const doneCount = breeds.length - pending.length;
    const objective = OBJECTIVES.find((entry) => entry.key === state.objective);
    const rank = RANKS.find((entry) => entry.key === store.get("rango", "none")) ?? RANKS[0];
    const depthGroups = {};
    breeds.forEach((node) => { const depth = node.stats.length; depthGroups[depth] = (depthGroups[depth] ?? 0) + 1; });
    const rounds = Object.values(depthGroups).reduce((sum, count) => sum + Math.ceil(count / rank.slots), 0);
    state.totals = { toCatch: toCatch.length, breeds: breeds.length, done: doneCount, items: itemCount, total, stats };
    els.summary.innerHTML = `
      <div class="cr-kpis">
        <div><strong>${toCatch.length}</strong><span>Pokémon base 1x31 a atrapar</span></div>
        <div><strong>${breeds.length}</strong><span>cruces (${doneCount} hechos)</span></div>
        <div><strong>${itemCount}</strong><span>objetos recios (se pierden)</span></div>
        <div class="is-money"><strong>$${money(total)}</strong><span>${doneCount ? `quedan $${money(remainingCost)}` : "coste total"}</span></div>
      </div>
      <div class="cr-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${breeds.length}" aria-valuenow="${doneCount}" aria-label="Cruces hechos"><i style="width:${breeds.length ? (doneCount / breeds.length) * 100 : 0}%"></i></div>
      <div class="cr-time">
        <label class="v-field"><span>Tu rango</span><select class="v-select" data-rank>${RANKS.map((entry) => `<option value="${entry.key}" ${entry.key === rank.key ? "selected" : ""}>${entry.label}</option>`).join("")}</select></label>
        <p>⏱️ Cada crianza tarda <strong>${rank.minutes} min</strong> y tienes <strong>${rank.slots} slots</strong>: la cadena lleva unas <strong>${formatTime(rounds * rank.minutes)}</strong> de guardería, más eclosionar cada huevo (3.000 pasos).</p>
      </div>
      <div class="cr-shop-list">
        <div>
          <h4>Pokémon que necesitas atrapar</h4>
          <ul>${Object.entries(shopping).map(([key, count]) => {
            const [id, sex, stat] = key.split("|");
            return `<li><img class="pixel" src="${sprite(id)}" alt="" width="40" height="40"><span><strong>${count}× ${escapeHtml(byId[id].name)} ${sexIcon(sex || null)}</strong><small>con 31 en ${statByKey[stat].label}${safariOf[id] ? " · sale en el Safari" : ""}</small></span></li>`;
          }).join("") || '<li><span class="cr-sex-icon">✓</span><span><strong>Nada: ya tienes todo lo necesario.</strong></span></li>'}</ul>
          ${owned.length ? `<h4 class="cr-owned-title">Ya los tienes</h4><ul>${owned.map((node) => `<li><img class="pixel" src="${sprite(node.species.id)}" alt="" width="40" height="40"><span><strong>${escapeHtml(node.species.name)}${sexText(node.sex)}</strong><small>con ${sortStats(node.stats).map((stat) => statByKey[stat].short).join(" · ")}${node.autoOwned ? " · de tu inventario" : ""}</small></span></li>`).join("")}</ul>` : ""}
        </div>
        <div>
          <h4>Objetos y costes</h4>
          <ul>${Object.entries(items).map(([stat, count]) => `<li><img class="pixel" src="${itemIcon(stat)}" alt="" width="32" height="32"><span><strong>${count}× ${statByKey[stat].itemName}</strong><small>$${money(count * prices.item)} ($${money(prices.item)} cada uno) · ${statByKey[stat].label}</small></span></li>`).join("")}
            ${genderCost ? `<li><span class="cr-sex-icon">⚥</span><span><strong>${genderBreeds.length}× elegir sexo de la cría</strong><small>$${money(genderCost)} ($${money(prices.gender)} por cruce)</small></span></li>` : ""}
          </ul>
          <p class="cr-compare">Comprar esos ${stats.length} IVs de 0 a 31 en la Tienda de IVs costaría <strong>$${money(shopCost)}</strong>.</p>
          ${objective?.trickRoom ? `<p class="cr-compare is-tr">Espacio Raro: al terminar, baja la <strong>Velocidad a 0</strong> en la Tienda de IVs (de 31 a 0 son $${money(VC.ivShopCost(31, 0))}).</p>` : ""}
        </div>
      </div>`;
    els.pricesSum.textContent = `· objeto $${money(prices.item)} · sexo $${money(prices.gender)}`;

    // Paso a paso.
    const parentText = (parent) => `${escapeHtml((parent.evolveTo ?? parent.species).name)}${sexText(parent.sex)} (${sortStats(parent.stats).map((stat) => statByKey[stat].short).join("·")}${parent.item ? `, con ${statByKey[parent.item].itemName}` : ""})`;
    els.steps.innerHTML = breeds.map((node) => {
      const gender = node.sex && genderBreeds.includes(node) ? ` Elige <strong>${node.sex === "female" ? "hembra" : "macho"}</strong> ($${money(prices.gender)}).` : "";
      const evolve = node.evolveTo ? ` Sale como bebé: <strong>evoluciónalo a ${escapeHtml(node.evolveTo.name)}</strong> antes del siguiente cruce.` : "";
      const issue = node.issues?.length ? ` <span class="cr-issue-text">⚠ ${node.issues.map(escapeHtml).join(" ")}</span>` : "";
      return `<li class="${node.done ? "is-done" : ""}"><label class="cr-step-num" title="Marcar como hecho"><input type="checkbox" data-step="${node.step}" ${node.done ? "checked" : ""} aria-label="Cruce ${node.step} hecho"><span>${node.step}</span></label><p>${parentText(node.left)} × ${parentText(node.right)} → <strong>${escapeHtml(node.species.name)}${sexText(node.sex)}</strong> con ${sortStats(node.stats).map((stat) => statByKey[stat].short).join(" · ")}.${gender}${evolve}${node === root ? " <em>¡Este es tu Pokémon final!</em>" : ""}${issue}</p></li>`;
    }).join("") || "<li><p>¡Ya tienes tu Pokémon final!</p></li>";
    fitTree(true);
  }

  // --- Inventario de 1x31 ---
  // k IVs necesitan 2^(k-1) bases repartidas 2^(k-2), …, 2, 1, 1 por stat (con Ditto, 1 por stat).
  const needFor = (k, ditto) => Array.from({ length: k }, (_, index) => (ditto ? 1 : index >= k - 2 ? 1 : 2 ** (k - 2 - index)));
  function bestObjective(info) {
    const usable = STAT_ORDER.filter((key) => inventory.use[key]).sort((a, b) => inventory.counts[b] - inventory.counts[a] || STAT_ORDER.indexOf(a) - STAT_ORDER.indexOf(b));
    const ditto = info?.mode === "ditto";
    for (let k = usable.length; k >= 2; k -= 1) {
      const top = usable.slice(0, k);
      const need = needFor(k, ditto);
      if (top.every((stat, index) => inventory.counts[stat] >= need[index])) return { stats: top, need, usable };
    }
    return null;
  }

  // Texto corto «2♂ 1♀» de un recuento por sexo.
  const sexCount = (box, keys = ["m", "f", "d", "x"]) => keys.filter((key) => box[key] > 0)
    .map((key) => `${box[key]}${{ m: "♂", f: "♀", d: " Ditto", x: " sin sexo" }[key]}`).join(" · ");
  function renderInventory() {
    els.invAuto.checked = inventory.auto;
    els.invGrid.innerHTML = STATS.map((stat) => {
      const need = state.needs[stat.key];
      const box = inventory.bySex[stat.key];
      let status = '<em class="cr-inv-need is-off">no está en el plan</em>';
      if (need?.total) {
        const missing = sexCount(need.missing);
        status = `<em class="cr-inv-need${missing ? "" : " is-ok"}">el plan pide ${sexCount(need)}${missing ? ` · te faltan <b>${missing}</b>` : " · ✓ cubierto"}</em>`;
        const spare = sexCount(need.spare, ["m", "f", "d"]);
        if (spare && inventory.auto) status += `<em class="cr-inv-need is-spare">te sobran ${spare}</em>`;
      }
      const steppers = SEXES.map((sex) => `
          <span class="cr-sex-step is-${sex.key}">
            <span class="cr-sex-label" aria-hidden="true">${sex.icon}</span>
            <span class="cr-stepper">
              <button type="button" data-inv-step="${stat.key}" data-sex="${sex.key}" data-delta="-1" aria-label="Un ${sex.one} menos de ${stat.label}">−</button>
              <input type="number" min="0" max="99" inputmode="numeric" value="${box[sex.key]}" data-inv="${stat.key}" data-sex="${sex.key}" aria-label="${sex.label} 1x31 de ${stat.label}">
              <button type="button" data-inv-step="${stat.key}" data-sex="${sex.key}" data-delta="1" aria-label="Un ${sex.one} más de ${stat.label}">+</button>
            </span>
          </span>`).join("");
      return `<div class="cr-inv-row${inventory.use[stat.key] ? "" : " is-off"}" style="--stat-color:${stat.color}">
        <img class="pixel" src="${itemIcon(stat.key)}" alt="" width="36" height="36">
        <span class="cr-inv-name"><strong>${stat.label}</strong>${status}</span>
        <label class="v-check cr-inv-use"><input type="checkbox" data-inv-use="${stat.key}" ${inventory.use[stat.key] ? "checked" : ""}><span>usar</span></label>
        <span class="cr-sex-steps">${steppers}</span>
      </div>`;
    }).join("");
  }

  function suggestObjective() {
    if (!state.target) return;
    const info = analyse(state.target);
    if (!info.parent || info.mode === "nidoran") {
      setStatus(els.invStatus, `${escapeHtml(state.target.name)} no se puede (o no conviene) criar: elige otro Pokémon en el planificador.`, "bad");
      return;
    }
    const best = bestObjective(info);
    if (!best) {
      const usable = STAT_ORDER.filter((key) => inventory.use[key]);
      setStatus(els.invStatus, usable.length < 2
        ? "Marca «usar» en al menos 2 stats."
        : "Con lo que tienes todavía no llegas ni a un cruce de 2 IVs: necesitas al menos <strong>1 Pokémon 1x31 en dos stats distintas</strong>.", "bad");
      return;
    }
    const { stats, need, usable } = best;
    const preset = OBJECTIVES.find((objective) => sameSet(objective.stats(info.style), stats));
    state.objective = preset ? preset.key : "custom";
    state.custom = sortStats(stats);
    state.priority = [...stats];
    state.start = info.mode === "ditto" ? stats[0] : stats[stats.length - 1];
    state.selected = null;
    let next = "";
    if (usable.length > stats.length) {
      const k = stats.length + 1;
      const nextNeed = needFor(k, info.mode === "ditto");
      const top = usable.slice(0, k);
      const missing = top.map((stat, index) => [stat, nextNeed[index] - inventory.counts[stat]]).filter(([, value]) => value > 0);
      if (missing.length) next = ` Para ${k} IVs te faltarían: ${missing.map(([stat, value]) => `${value} de ${statByKey[stat].label}`).join(", ")}.`;
    }
    render();
    const short = STATS.filter(({ key }) => state.needs[key]?.missing && (state.needs[key].missing.m || state.needs[key].missing.f))
      .map(({ key }) => `${statByKey[key].short} ${sexCount(state.needs[key].missing, ["m", "f"])}`);
    if (short.length) next += ` <br>Por sexo aún te faltan: <strong>${short.join(" · ")}</strong>. Cambia la especie de esas hojas por un Ditto con 31 si lo tienes, o captúralos.`;
    setStatus(els.invStatus, `Con lo que tienes te alcanza para <strong>${stats.length} IVs (${preset ? preset.label : stats.map((stat) => statByKey[stat].short).join(" · ")})</strong> para ${escapeHtml(state.target.name)}. Usa ${stats.map((stat, index) => `${statByKey[stat].short} ×${need[index]}`).join(" · ")}. Ya está aplicado al árbol.${next}`, "ok");
  }

  // --- Render general ---
  function render() {
    if (!state.target) return;
    const info = analyse(state.target);
    state.info = info;
    const breeders = breedersFor(info);
    if (!state.breeder || !byId[state.breeder] || (info.parent && !byId[state.breeder].egg.some((group) => info.parent.egg.includes(group)))) state.breeder = breeders[0]?.id ?? info.parent?.id ?? null;
    if (!state.objective) state.objective = { physical: "5f", special: "5e", mixed: "6" }[info.style];
    if (state.objective === "custom" && !state.custom) state.custom = OBJECTIVES.find((entry) => entry.key === { physical: "5f", special: "5e", mixed: "6" }[info.style]).stats(info.style);
    renderPlan(info);
    renderTarget(info);
    renderObjectives(info);
    renderBreeders(info, breeders);
    renderBrowser();
    renderInventory();
    document.querySelectorAll("[data-price-item]").forEach((element) => { element.textContent = `$${money(prices.item)}`; });
    document.querySelectorAll("[data-price-gender]").forEach((element) => { element.textContent = `$${money(prices.gender)}`; });
    if (!location.hash.startsWith("#plan=")) history.replaceState(null, "", shortHash());
  }
  const shortHash = () => `#${state.target.id}-${state.objective}${state.objective === "custom" ? `-${(state.custom ?? []).join(".")}` : ""}${state.breeder ? `-b${state.breeder}` : ""}${state.start ? `-s${state.start}` : ""}${state.priority?.length ? `-o${state.priority.join(".")}` : ""}`;

  function selectTarget(id, scroll) {
    const target = byId[id];
    if (!target) return;
    Object.assign(state, { target, objective: null, custom: null, breeder: null, start: null, priority: null, selected: null });
    render();
    if (scroll) els.target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updatePlan(change) {
    const plans = loadPlans();
    const plan = planData(plans, state.planKey);
    change(plan);
    plans[state.planKey] = plan;
    savePlans(plans);
    render();
  }

  // --- Zoom y desplazamiento del árbol ---
  let zoom = 1;
  const scaleBox = els.tree.parentElement;
  const applyZoom = () => {
    els.tree.style.setProperty("--zoom", zoom);
    scaleBox.style.width = `${els.tree.scrollWidth * zoom}px`;
    scaleBox.style.height = `${els.tree.scrollHeight * zoom}px`;
  };
  function fitTree(initial = false) {
    els.tree.style.setProperty("--zoom", 1);
    const available = els.treeWrap.clientWidth - 20;
    const fit = Math.min(1, available / Math.max(1, els.tree.scrollWidth));
    // En móvil, el primer ajuste no baja de 0,5 para que se pueda leer (se mueve arrastrando).
    zoom = Math.max(0.2, initial && available < 600 ? Math.max(fit, 0.5) : fit);
    applyZoom();
  }
  const setZoom = (value) => { zoom = Math.min(1.6, Math.max(0.2, value)); applyZoom(); };
  $("cr-zoom-in").addEventListener("click", () => setZoom(zoom + 0.15));
  $("cr-zoom-out").addEventListener("click", () => setZoom(zoom - 0.15));
  $("cr-zoom-fit").addEventListener("click", () => fitTree(false));
  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (state.root) fitTree(true); }, 150); });
  // La rueda solo hace zoom con Ctrl: sin Ctrl, la página se desplaza con normalidad.
  els.treeWrap.addEventListener("wheel", (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setZoom(zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
  }, { passive: false });
  // Arrastrar para mover (ratón). En pantallas táctiles el dedo desplaza el árbol de forma nativa.
  let drag = null;
  let suppressClick = false;
  els.treeWrap.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || event.target.closest("input, select, label, button")) return;
    drag = { x: event.clientX, y: event.clientY, left: els.treeWrap.scrollLeft, top: window.scrollY, moved: false, id: event.pointerId };
  });
  window.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) { drag.moved = true; els.treeWrap.classList.add("is-dragging"); }
    els.treeWrap.scrollLeft = drag.left - dx;
    window.scrollTo({ top: drag.top - dy, behavior: "instant" });
    event.preventDefault();
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); }
    drag = null;
    els.treeWrap.classList.remove("is-dragging");
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  els.treeWrap.addEventListener("click", (event) => { if (suppressClick) { event.stopPropagation(); event.preventDefault(); } }, true);

  // --- Eventos del planificador ---
  els.search.addEventListener("input", () => { state.query = els.search.value; renderBrowser(); });
  els.search.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const first = els.picks.querySelector("[data-target]");
    if (first) selectTarget(Number(first.dataset.target), true);
  });
  els.browseTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-browse]");
    if (!tab) return;
    state.browse = tab.dataset.browse;
    renderBrowser();
  });
  els.types.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-type]");
    if (!chip) return;
    state.type = state.type === chip.dataset.type ? null : chip.dataset.type;
    renderBrowser();
  });
  els.picks.addEventListener("click", (event) => {
    const button = event.target.closest("[data-target]");
    if (button) selectTarget(Number(button.dataset.target), true);
  });
  els.objectives.addEventListener("click", (event) => {
    const button = event.target.closest("[data-objective]");
    if (!button) return;
    if (button.dataset.objective === "custom") state.custom = currentStats(analyse(state.target));
    state.objective = button.dataset.objective;
    state.selected = null;
    render();
  });
  els.custom.addEventListener("change", () => {
    state.custom = [...els.custom.querySelectorAll("input:checked")].map((input) => input.dataset.stat);
    state.objective = "custom";
    state.selected = null;
    render();
  });
  els.invHint.addEventListener("click", (event) => { if (event.target.closest("[data-suggest]")) suggestObjective(); });
  els.breeders.addEventListener("click", (event) => {
    const button = event.target.closest("[data-breeder]");
    if (!button) return;
    state.breeder = Number(button.dataset.breeder);
    state.selected = null;
    render();
  });
  const safariToggle = $("cr-safari-toggle");
  safariToggle.checked = useSafari;
  safariToggle.addEventListener("change", () => {
    useSafari = safariToggle.checked;
    store.set("safari", useSafari);
    state.breeder = null;
    state.selected = null;
    render();
  });
  els.breederSelect.addEventListener("change", () => { state.breeder = Number(els.breederSelect.value); state.selected = null; render(); });
  const toggleStep = (input) => {
    const step = Number(input.dataset.step);
    updatePlan((plan) => {
      const done = new Set(plan.done);
      if (input.checked) done.add(step); else done.delete(step);
      plan.done = [...done].sort((a, b) => a - b);
    });
  };
  els.tree.addEventListener("change", (event) => { const input = event.target.closest("[data-step]"); if (input) toggleStep(input); });
  els.steps.addEventListener("change", (event) => { const input = event.target.closest("[data-step]"); if (input) toggleStep(input); });
  const selectNode = (element) => {
    state.selected = Number(element.dataset.node);
    render();
    els.editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  els.tree.addEventListener("click", (event) => {
    if (event.target.closest(".cr-node-step")) return;
    const element = event.target.closest("[data-node]");
    if (element) selectNode(element);
  });
  els.tree.addEventListener("keydown", (event) => {
    const element = event.target.closest("[data-node]");
    if (element && event.target === element && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); selectNode(element); }
  });
  els.editor.addEventListener("change", (event) => {
    const id = state.selected;
    if (event.target.matches("[data-edit-species]")) {
      const value = Number(event.target.value);
      updatePlan((plan) => { plan.species[id] = value; });
    } else if (event.target.matches("[data-edit-owned]")) {
      const checked = event.target.checked;
      updatePlan((plan) => {
        plan.notOwned = plan.notOwned.filter((value) => value !== id);
        plan.owned = plan.owned.filter((value) => value !== id);
        if (checked) plan.owned.push(id);
        else plan.notOwned.push(id); // «no lo tengo» manual: el inventario ya no lo marca solo
      });
    }
  });
  els.editor.addEventListener("click", (event) => {
    if (event.target.closest("[data-edit-close]")) { state.selected = null; render(); return; }
    if (!event.target.closest("[data-edit-reset]")) return;
    const id = state.selected;
    updatePlan((plan) => { delete plan.species[id]; plan.owned = plan.owned.filter((value) => value !== id); plan.notOwned = plan.notOwned.filter((value) => value !== id); });
  });
  els.start.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-start]");
    if (!chip) return;
    state.start = chip.dataset.start;
    state.selected = null;
    render();
  });
  els.summary.addEventListener("change", (event) => {
    if (!event.target.matches("[data-rank]")) return;
    store.set("rango", event.target.value);
    render();
  });

  // --- Precios ---
  const syncPriceInputs = () => { els.priceItem.value = prices.item; els.priceGender.value = prices.gender; };
  syncPriceInputs();
  const onPrice = () => {
    prices.item = Math.max(0, Number.parseInt(els.priceItem.value, 10) || 0);
    prices.gender = Math.max(0, Number.parseInt(els.priceGender.value, 10) || 0);
    store.set("precios", prices);
    render();
  };
  els.priceItem.addEventListener("change", onPrice);
  els.priceGender.addEventListener("change", onPrice);
  $("cr-price-reset").addEventListener("click", () => { Object.assign(prices, DEFAULT_PRICES); syncPriceInputs(); onPrice(); });

  // --- Inventario: eventos ---
  const setCount = (key, sex, value) => {
    inventory.bySex[key][sex] = clampCount(value);
    saveInventory();
    render();
  };
  els.invGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inv-step]");
    if (button) setCount(button.dataset.invStep, button.dataset.sex, inventory.bySex[button.dataset.invStep][button.dataset.sex] + Number(button.dataset.delta));
  });
  els.invGrid.addEventListener("change", (event) => {
    if (event.target.matches("[data-inv]")) setCount(event.target.dataset.inv, event.target.dataset.sex, event.target.value);
    if (event.target.matches("[data-inv-use]")) { inventory.use[event.target.dataset.invUse] = event.target.checked; saveInventory(); render(); }
  });
  els.invAuto.addEventListener("change", () => { inventory.auto = els.invAuto.checked; saveInventory(); render(); });
  $("cr-suggest").addEventListener("click", suggestObjective);
  $("cr-inv-clear").addEventListener("click", () => {
    STAT_ORDER.forEach((key) => { inventory.bySex[key] = { m: 0, f: 0, d: 0 }; });
    saveInventory();
    render();
    setStatus(els.invStatus, "Inventario vaciado.");
  });

  // --- Compartir: código comprimido (gzip → base64url) y enlace con el plan en el hash ---
  const toB64 = (bytes) => {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const fromB64 = (text) => {
    const clean = text.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(clean + "=".repeat((4 - (clean.length % 4)) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  };
  async function encodePlan(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (typeof CompressionStream === "function") {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
      return `${CODE_PREFIX}${toB64(new Uint8Array(await new Response(stream).arrayBuffer()))}`;
    }
    return `${CODE_PREFIX}RAW:${toB64(bytes)}`;
  }
  async function decodePlan(text) {
    let raw = String(text ?? "").trim();
    const hashAt = raw.indexOf("#plan=");
    if (hashAt >= 0) raw = raw.slice(hashAt + 6);
    raw = raw.replace(/\s+/g, "");
    if (raw.startsWith(CODE_PREFIX)) raw = raw.slice(CODE_PREFIX.length);
    let bytes;
    if (raw.startsWith("RAW:")) bytes = fromB64(raw.slice(4));
    else {
      if (typeof DecompressionStream !== "function") throw new Error("Tu navegador no puede descomprimir el código.");
      const stream = new Blob([fromB64(raw)]).stream().pipeThrough(new DecompressionStream("gzip"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || payload.app !== "wiki-diosesmon-crianza" || !byId[payload.target]) throw new Error("invalid");
    return payload;
  }
  function currentPayload() {
    const plan = planData(loadPlans(), state.planKey);
    // Lo marcado desde el inventario viaja como «ya lo tengo» para que quien lo reciba vea lo mismo.
    const owned = [];
    const walk = (node) => { if (node.owned) owned.push(node.id); if (node.left && !node.owned) { walk(node.left); walk(node.right); } };
    if (state.root) walk(state.root);
    return {
      v: 1, app: "wiki-diosesmon-crianza", title: planName, target: state.target.id, objective: state.objective, custom: state.custom, breeder: state.breeder, start: state.start, priority: state.priority,
      plan: { done: plan.done, owned: [...new Set([...plan.owned, ...owned])], notOwned: [], species: plan.species }, prices: { ...prices }, createdAt: new Date().toISOString(),
    };
  }
  function applyPayload(payload) {
    const objectiveOk = payload.objective === "custom" || OBJECTIVES.some((objective) => objective.key === payload.objective);
    const validStats = (list) => (Array.isArray(list) ? list.filter((key) => statByKey[key]) : null);
    Object.assign(state, {
      target: byId[payload.target], objective: objectiveOk ? payload.objective : null, custom: validStats(payload.custom), breeder: byId[payload.breeder] ? Number(payload.breeder) : null,
      start: statByKey[payload.start] ? payload.start : null, priority: validStats(payload.priority), selected: null,
    });
    if (payload.prices) {
      prices.item = Math.max(0, Number(payload.prices.item) || 0);
      prices.gender = Math.max(0, Number(payload.prices.gender) || 0);
      store.set("precios", prices);
      syncPriceInputs();
    }
    planName = String(payload.title ?? "").slice(0, 80);
    els.planName.value = planName;
    store.set("nombre", planName);
    // Se calcula la clave del plan con el mismo estado y se guarda su progreso.
    const info = analyse(state.target);
    if (!state.objective) state.objective = { physical: "5f", special: "5e", mixed: "6" }[info.style];
    if (info.parent && info.mode !== "nidoran") {
      if (!state.breeder) state.breeder = breedersFor(info)[0]?.id ?? info.parent.id;
      const { stats } = planStats(info);
      if (stats.length >= 2) {
        const plans = loadPlans();
        plans[planKeyFor(info, stats)] = planData({ value: payload.plan }, "value");
        savePlans(plans);
      }
    }
    render();
  }
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  };
  const shareLink = (code) => `${location.origin}${location.pathname}#plan=${code.slice(CODE_PREFIX.length)}`;

  els.planName.value = planName;
  els.planName.addEventListener("input", () => { planName = els.planName.value.slice(0, 80); store.set("nombre", planName); });
  $("cr-share-code").addEventListener("click", async () => {
    if (!state.root) { setStatus(els.shareStatus, "Primero arma una cadena en el planificador.", "bad"); return; }
    try {
      els.codeOut.value = await encodePlan(currentPayload());
      els.codeCopy.hidden = false;
      setStatus(els.shareStatus, `Código generado (${els.codeOut.value.length} caracteres). Cópialo y envíalo.`, "ok");
    } catch { setStatus(els.shareStatus, "No se pudo generar el código en este navegador.", "bad"); }
  });
  els.codeCopy.addEventListener("click", async () => {
    if (await copyText(els.codeOut.value)) setStatus(els.shareStatus, "¡Código copiado! Ya puedes enviarlo.", "ok");
    else { els.codeOut.select(); setStatus(els.shareStatus, "No se pudo copiar solo: el código está seleccionado, usa Ctrl+C.", "bad"); }
  });
  $("cr-share-link").addEventListener("click", async () => {
    if (!state.root) { setStatus(els.shareStatus, "Primero arma una cadena en el planificador.", "bad"); return; }
    try {
      const code = await encodePlan(currentPayload());
      const link = shareLink(code);
      els.codeOut.value = link;
      els.codeCopy.hidden = false;
      setStatus(els.shareStatus, (await copyText(link)) ? "¡Enlace con el plan copiado! Quien lo abra verá tu plan tal cual." : "Enlace creado: cópialo del recuadro.", "ok");
    } catch { setStatus(els.shareStatus, "No se pudo crear el enlace en este navegador.", "bad"); }
  });
  $("cr-code-load").addEventListener("click", async () => {
    const text = els.codeIn.value.trim();
    if (!text) { setStatus(els.shareStatus, "Pega un código o un enlace primero.", "bad"); return; }
    try {
      const payload = await decodePlan(text);
      applyPayload(payload);
      setStatus(els.shareStatus, `¡Plan cargado! ${payload.title ? `«${escapeHtml(payload.title)}»: ` : ""}${escapeHtml(byId[payload.target].name)}. El árbol está reconstruido arriba.`, "ok");
      document.getElementById("planificador").scrollIntoView({ behavior: "smooth" });
    } catch { setStatus(els.shareStatus, "Ese código no es válido o está incompleto.", "bad"); }
  });
  $("cr-code-clear").addEventListener("click", () => { els.codeIn.value = ""; setStatus(els.shareStatus, "Campo de importación limpiado."); });

  // --- Exportar PNG (crianza-png.js) ---
  async function exportPng(button) {
    if (!state.root) { setStatus(els.shareStatus, "Primero arma una cadena en el planificador.", "bad"); return; }
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "⏳ Generando…";
    try {
      const objective = OBJECTIVES.find((entry) => entry.key === state.objective);
      const result = await VC.exportTreePng({
        root: state.root,
        title: planName || `${state.target.name} · ${state.totals.stats.length} IVs`,
        subtitle: `${state.target.name} · ${objective ? objective.label : "Personalizado"} (${sortStats(state.totals.stats).map((stat) => statByKey[stat].short).join(" · ")})`,
        summary: `${state.totals.toCatch} Pokémon base · ${state.totals.breeds} cruces (${state.totals.done} hechos) · ${state.totals.items} objetos recios · $${money(state.totals.total)}`,
        filename: `wiki-diosesmon-crianza-${normalize(planName || state.target.name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan"}.png`,
      });
      setStatus(els.shareStatus, result.withSprites ? "Imagen PNG descargada." : "Imagen PNG descargada (sin sprites: no se pudieron cargar).", "ok");
    } catch {
      setStatus(els.shareStatus, "No se pudo generar la imagen del árbol.", "bad");
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }
  $("cr-png").addEventListener("click", (event) => exportPng(event.currentTarget));
  $("cr-share-png").addEventListener("click", (event) => exportPng(event.currentTarget));

  // --- Estado inicial: plan compartido (#plan=…), enlace corto (#468-5f-b21…) o Togekiss ---
  function fromHash() {
    const found = location.hash.match(/^#(\d+)(?:-(4|5f|5e|6|trf|tre|custom))?(?:-((?:hp|atk|def|spa|spd|spe)(?:\.(?:hp|atk|def|spa|spd|spe))*))?(?:-b(\d+))?(?:-s(hp|atk|def|spa|spd|spe))?(?:-o((?:hp|atk|def|spa|spd|spe)(?:\.(?:hp|atk|def|spa|spd|spe))*))?$/);
    if (!found || !byId[found[1]]) return false;
    if (location.hash === shortHashSafe()) return true;
    Object.assign(state, {
      target: byId[found[1]], objective: found[2] ?? null, custom: found[2] === "custom" ? (found[3] ?? "").split(".").filter((key) => statByKey[key]) : null,
      breeder: found[4] ? Number(found[4]) : null, start: found[5] ?? null, priority: found[6] ? found[6].split(".") : null, selected: null,
    });
    render();
    return true;
  }
  const shortHashSafe = () => (state.target ? shortHash() : "");
  async function fromPlanHash() {
    if (!location.hash.startsWith("#plan=")) return false;
    try {
      const payload = await decodePlan(location.hash);
      history.replaceState(null, "", location.pathname);
      applyPayload(payload);
      setStatus(els.shareStatus, `¡Plan cargado desde el enlace!${payload.title ? ` «${escapeHtml(payload.title)}»` : ""}`, "ok");
    } catch {
      history.replaceState(null, "", location.pathname);
      if (!state.target) selectTarget(468, false);
      setStatus(els.shareStatus, "El enlace del plan está dañado o incompleto.", "bad");
    }
    return true;
  }
  window.addEventListener("hashchange", () => { fromPlanHash().then((handled) => { if (!handled) fromHash(); }); });

  VC.selectTarget = (id, scroll = true) => {
    selectTarget(id, false);
    if (scroll) document.getElementById("planificador").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  VC.currentTargetId = () => state.target?.id ?? null;

  if (location.hash.startsWith("#plan=")) { selectTarget(468, false); fromPlanHash(); }
  else if (!fromHash()) selectTarget(468, false);
})();
