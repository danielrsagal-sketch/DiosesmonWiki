// Crianza: planificador de cadenas de crianza con pesas/brazales (datos en data/crianza-data.js).
// Reglas del servidor: la hembra decide la especie, los padres (y sus pesas) se pierden al recoger el huevo,
// elegir el sexo de la cría cuesta 500 y el Lazo Destino no se recomienda.
(function renderBreeding() {
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const STORAGE_KEY = "wiki-diosesmon-crianza-v1";
  const RANK_KEY = "wiki-diosesmon-crianza-rank";
  const ITEM_PRICE = 500;
  const GENDER_PRICE = 500;
  const STATS = [
    { key: "hp", short: "PS", label: "PS", color: "#ff5959", item: "power_weight", itemName: "Pesa Recia" },
    { key: "atk", short: "ATQ", label: "Ataque", color: "#f5ac78", item: "power_bracer", itemName: "Brazal Recio" },
    { key: "def", short: "DEF", label: "Defensa", color: "#fae078", item: "power_belt", itemName: "Cinturón Recio" },
    { key: "spa", short: "AT.E", label: "At. Esp.", color: "#9db7f5", item: "power_lens", itemName: "Lente Recia" },
    { key: "spd", short: "DEF.E", label: "Def. Esp.", color: "#a7db8d", item: "power_band", itemName: "Banda Recia" },
    { key: "spe", short: "VEL", label: "Velocidad", color: "#fa92b2", item: "power_anklet", itemName: "Franja Recia" },
  ];
  const OBJECTIVES = [
    { key: "4", label: "4 IVs", stats: (style) => (style === "special" ? ["hp", "spa", "spd", "spe"] : ["hp", "atk", "def", "spe"]) },
    { key: "5f", label: "5 IVs físico", hint: "sin At. Esp.", stats: () => ["hp", "atk", "def", "spd", "spe"] },
    { key: "5e", label: "5 IVs especial", hint: "sin Ataque", stats: () => ["hp", "def", "spa", "spd", "spe"] },
    { key: "6", label: "6 IVs", stats: () => ["hp", "atk", "def", "spa", "spd", "spe"] },
    { key: "trf", label: "Espacio Raro físico", hint: "Vel 0", trickRoom: true, stats: () => ["hp", "atk", "def", "spd"] },
    { key: "tre", label: "Espacio Raro especial", hint: "Vel 0", trickRoom: true, stats: () => ["hp", "def", "spa", "spd"] },
  ];
  // Pokémon competitivos de las generaciones 1 a 4 (que se pueden criar), con su papel habitual.
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
  ];
  const ROLE_COLORS = { Físico: "#f5ac78", Especial: "#9db7f5", Mixto: "#c9a6ff", Defensivo: "#a7db8d", Soporte: "#ffb3d6" };
  const TYPES = ["Normal", "Fuego", "Agua", "Planta", "Eléctrico", "Hielo", "Lucha", "Veneno", "Tierra", "Volador", "Psíquico", "Bicho", "Roca", "Fantasma", "Dragón", "Siniestro", "Acero", "Hada"];
  // Espera de crianza y slots según el rango (tienda de Diosesmon).
  const RANKS = [
    { key: "none", label: "Sin rango / Entrenador", minutes: 25, slots: 2 },
    { key: "as", label: "AS", minutes: 20, slots: 2 },
    { key: "lider", label: "Líder", minutes: 15, slots: 2 },
    { key: "maestro", label: "Maestro", minutes: 10, slots: 4 },
  ];
  const NIDORAN = new Set([29, 30, 31, 32, 33, 34]);
  const VOLBEAT_ILLUMISE = new Set([313, 314]);
  const RARITY = { common: "Común", uncommon: "Poco común", rare: "Raro", "ultra-rare": "Ultra raro" };
  const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, "ultra-rare": 3 };
  const DITTO = 132;

  const species = window.BREEDING_SPECIES ?? [];
  const byId = Object.fromEntries(species.map((entry) => [entry.id, entry]));
  const statByKey = Object.fromEntries(STATS.map((stat) => [stat.key, stat]));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const money = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const normalize = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const itemIcon = (stat) => `assets/img/items/cobblemon/${statByKey[stat].item}.png`;
  const canBreed = (entry) => entry && !entry.egg.includes("Desconocido");
  const genderLabel = (ratio) => (ratio < 0 ? "Sin género" : ratio === 1 ? "Solo macho" : ratio === 0 ? "Solo hembra" : `${Math.round(ratio * 100)}% ♂ · ${Math.round((1 - ratio) * 100)}% ♀`);
  const formatTime = (minutes) => (minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `${minutes} min`);

  // --- Línea evolutiva ---
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
  const spawnScore = (entry) => (entry.spawn ? RARITY_RANK[entry.spawn.rarity] * 100 + Number.parseInt(entry.spawn.level, 10) + entry.spawn.notes.length * 12 - entry.spawn.places.length * 3 : 1000);

  // --- Estado y guardado ---
  const state = { target: null, objective: null, custom: null, breeder: null, start: null, browse: "competitive", type: null, query: "", selected: null };
  const loadStore = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } };
  const saveStore = (store) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* sin almacenamiento */ } };
  // Por plan: cruces hechos, Pokémon que ya tienes y especies cambiadas a mano.
  const planData = (store, key) => {
    const value = store[key];
    if (Array.isArray(value)) return { done: value, owned: [], species: {} };
    return { done: value?.done ?? [], owned: value?.owned ?? [], species: value?.species ?? {} };
  };
  const loadRank = () => { try { return localStorage.getItem(RANK_KEY) || "none"; } catch { return "none"; } };

  // Análisis del Pokémon objetivo.
  function analyse(target) {
    const line = lineOf(target.id);
    const egg = line[0];
    const breedable = line.filter(canBreed);
    const parent = [...breedable].sort((a, b) => spawnScore(a) - spawnScore(b))[0] ?? null;
    const style = target.atk >= target.spa + 15 ? "physical" : target.spa >= target.atk + 15 ? "special" : "mixed";
    const ratio = (parent ?? target).male;
    const mode = !parent ? "blocked" : NIDORAN.has(target.id) ? "nidoran" : ratio < 0 || ratio === 1 ? "ditto" : "normal";
    const warnings = [];
    if (!parent) warnings.push({ tone: "bad", text: "Esta especie no puede criar (grupo huevo Desconocido): no se puede conseguir por crianza." });
    if (mode === "nidoran") warnings.push({ tone: "bad", text: "La crianza de Nidoran♂ y Nidoran♀ está bugeada en el servidor: te recomendamos no hacerla." });
    if (VOLBEAT_ILLUMISE.has(target.id)) warnings.push({ tone: "warn", text: "Volbeat e Illumise: la cría siempre sale 50/50 y no se puede elegir el sexo. Usa una Illumise como madre." });
    if (ratio < 0 && parent) warnings.push({ tone: "warn", text: `${parent.name} no tiene género: solo puede criar con Ditto. La cadena se hace cruzándolo con Dittos de buenos IVs (los Dittos no crían entre sí).` });
    if (ratio === 1 && parent) warnings.push({ tone: "warn", text: `${parent.name} es siempre macho: necesitas un Ditto como pareja en cada cruce de su rama.` });
    if (egg.egg.includes("Desconocido") && parent && egg.id !== parent.id) warnings.push({ tone: "info", text: `${egg.name} es una especie bebé y no puede criar: usa ${breedable.map((entry) => entry.name).join(" o ")} y del huevo saldrá ${egg.name}.` });
    return { line, egg, parent, style, mode, warnings };
  }

  // Especies que pueden cruzarse con la línea del objetivo (comparten grupo huevo).
  const compatibleWith = (info) => species.filter((entry) => canBreed(entry) && !NIDORAN.has(entry.id)
    && (entry.id === DITTO || entry.egg.some((group) => info.parent.egg.includes(group))));

  function breedersFor(info) {
    if (!info.parent) return [];
    return compatibleWith(info)
      .filter((entry) => entry.id !== DITTO && entry.male > 0 && entry.male < 1 && entry.spawn)
      .sort((a, b) => spawnScore(a) + (canBreed(rootOf(a.id)) ? 0 : 80) - spawnScore(b) - (canBreed(rootOf(b.id)) ? 0 : 80))
      .slice(0, 12);
  }

  // --- Árbol de la cadena ---
  // build(stats): un Pokémon con esos IVs a 31 sale de cruzar (stats − último) × (stats − penúltimo).
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

  // Cadena lineal para especies que solo crían con Ditto: objetivo × Ditto con una stat nueva en cada paso.
  function buildDittoChain(stats) {
    let node = { id: counter++, stats: [stats[0]], onPath: true };
    for (let index = 1; index < stats.length; index += 1) {
      const ditto = { id: counter++, stats: [stats[index]], ditto: true, item: stats[index] };
      node.item = node.stats[0];
      node = { id: counter++, stats: stats.slice(0, index + 1), onPath: true, left: ditto, right: node };
    }
    return node;
  }

  // Especie por defecto de una hoja (o de un Pokémon que ya tienes).
  const defaultSpecies = (node, info, breeder) => (node.ditto ? byId[DITTO] : node.onPath ? (VOLBEAT_ILLUMISE.has(state.target.id) ? byId[314] : info.parent) : breeder);

  // De cada cruce sale la especie base de la madre (o del padre si la pareja es Ditto).
  function assignRoles(node, info, breeder, sex, plan, isRoot = true) {
    node.sex = sex;
    const owned = !isRoot && plan.owned.includes(node.id);
    node.owned = owned;
    if (!node.left || owned) {
      node.species = byId[plan.species[node.id]] ?? defaultSpecies(node, info, breeder);
      if (node.species.id === DITTO || node.species.male < 0) node.sex = null;
      node.custom = Boolean(plan.species[node.id]);
      return;
    }
    const pathSex = info.mode === "ditto" ? (info.parent.male < 0 ? null : "male") : "female";
    assignRoles(node.left, info, breeder, info.mode === "ditto" ? null : "male", plan, false);
    assignRoles(node.right, info, breeder, node.onPath ? pathSex : "female", plan, false);
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
      if (b.male === 1 || b.male < 0) issues.push(`${b.name} no puede ir como hembra.`);
      if (a.male === 0 || a.male < 0) issues.push(`${a.name} no puede ir como macho.`);
    }
    if (!canBreed(a) || !canBreed(b)) issues.push("Uno de los padres no puede criar.");
    return issues;
  }

  // Cruces a hacer (los Pokémon que ya tienes no hace falta criarlos) y numeración.
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
  const els = {
    search: document.getElementById("br-search"),
    browseTabs: document.getElementById("br-browse-tabs"),
    types: document.getElementById("br-types"),
    picks: document.getElementById("br-picks"),
    target: document.getElementById("br-target"),
    objectives: document.getElementById("br-objectives"),
    custom: document.getElementById("br-custom"),
    breeders: document.getElementById("br-breeders"),
    breederSelect: document.getElementById("br-breeder-select"),
    tree: document.getElementById("br-tree"),
    treeWrap: document.getElementById("br-tree-wrap"),
    editor: document.getElementById("br-editor"),
    start: document.getElementById("br-start"),
    summary: document.getElementById("br-summary"),
    steps: document.getElementById("br-steps"),
    planner: document.getElementById("br-planner"),
  };

  const STAT_ORDER = STATS.map((stat) => stat.key);
  const statChips = (stats) => [...stats].sort((a, b) => STAT_ORDER.indexOf(a) - STAT_ORDER.indexOf(b)).map((stat) => `<span class="br-stat" style="--stat-color:${statByKey[stat].color}">${statByKey[stat].short}</span>`).join("");
  const sexIcon = (sex) => (sex === "male" ? '<span class="br-sex is-male" title="Macho">♂</span>' : sex === "female" ? '<span class="br-sex is-female" title="Hembra">♀</span>' : "");
  const sexText = (sex) => (sex === "male" ? " ♂" : sex === "female" ? " ♀" : "");

  // --- Selector de Pokémon objetivo ---
  const roleOf = Object.fromEntries(COMPETITIVE);
  const autoRole = (entry) => (entry.atk >= entry.spa + 15 ? "Físico" : entry.spa >= entry.atk + 15 ? "Especial" : "Mixto");
  els.types.innerHTML = TYPES.map((type) => `<button class="br-type" type="button" data-type="${type}" style="--type-color:${TYPE_COLORS[type]}">${type}</button>`).join("");

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
      return `<button class="br-pick${state.target?.id === entry.id ? " is-active" : ""}" type="button" data-target="${entry.id}">
        <img src="${SPRITES}/${entry.id}.png" alt="" width="64" height="64" loading="lazy">
        <strong>${escapeHtml(entry.name)}</strong>
        <small style="--role-color:${ROLE_COLORS[role]}">${role}</small>
      </button>`;
    }).join("") || '<p class="br-note">Ningún Pokémon coincide con la búsqueda.</p>';
    if (list.length > 160) els.picks.insertAdjacentHTML("beforeend", `<p class="br-note br-more">Y ${list.length - 160} más: escribe el nombre o filtra por tipo.</p>`);
  }

  // --- Pintado del objetivo, objetivos y breeders ---
  function currentStats(info) {
    if (state.objective === "custom") return STATS.map((stat) => stat.key).filter((key) => state.custom.includes(key));
    const objective = OBJECTIVES.find((entry) => entry.key === state.objective) ?? OBJECTIVES[1];
    return objective.stats(info.style);
  }

  function renderTarget(info) {
    const target = state.target;
    const styleText = { physical: "Atacante físico", special: "Atacante especial", mixed: "Mixto (ataca de las dos formas)" }[info.style];
    const recommendation = { physical: "5 IVs físico", special: "5 IVs especial", mixed: "6 IVs" }[info.style];
    const femaleTarget = info.mode === "ditto" ? `${info.egg.name}${info.parent.male < 0 ? "" : " ♂"}` : `${info.egg.name} ♀`;
    els.target.innerHTML = `
      <div class="br-target-card">
        <img class="br-target-sprite" src="${SPRITES}/${target.id}.png" alt="" width="120" height="120">
        <div class="br-target-info">
          <small>#${String(target.id).padStart(3, "0")} · ${target.types.join(" / ")}${roleOf[target.id] ? ` · ${roleOf[target.id]}` : ""}</small>
          <h3>${escapeHtml(target.name)}</h3>
          ${info.parent && info.mode !== "nidoran"
            ? `<p class="br-goal">Tu objetivo: <strong>${escapeHtml(femaleTarget)}</strong> con los IVs del plan${info.egg.id !== target.id ? `, y luego evolucionarlo a ${escapeHtml(target.name)}` : ""}.</p>`
            : `<p class="br-goal is-blocked">${info.parent ? "No recomendamos criar esta especie en el servidor." : "Esta especie no se puede criar."}</p>`}
          <ul class="br-facts">
            <li><span>Del huevo sale</span><strong><img src="${SPRITES}/${info.egg.id}.png" alt="" width="32" height="32">${escapeHtml(info.egg.name)}</strong></li>
            <li><span>Madre de la cadena</span><strong>${info.parent ? `<img src="${SPRITES}/${info.parent.id}.png" alt="" width="32" height="32">${escapeHtml(info.parent.name)}` : "—"}</strong></li>
            <li><span>Grupos huevo</span><strong>${(info.parent ?? target).egg.join(" · ")}</strong></li>
            <li><span>Género</span><strong>${genderLabel((info.parent ?? target).male)}</strong></li>
            <li><span>Estilo</span><strong>${styleText} <em>(Atq ${target.atk} · AtE ${target.spa})</em></strong></li>
            <li><span>Recomendado</span><strong>${recommendation}${target.spe <= 50 ? " o Espacio Raro" : ""}</strong></li>
          </ul>
        </div>
      </div>
      ${info.warnings.map((warning) => `<p class="br-warning is-${warning.tone}">${escapeHtml(warning.text)}</p>`).join("")}`;
  }

  function renderObjectives(info) {
    els.objectives.innerHTML = OBJECTIVES.map((objective) => `<button class="guide-chip" type="button" data-objective="${objective.key}" aria-pressed="${state.objective === objective.key}">${objective.label}${objective.hint ? ` <small>${objective.hint}</small>` : ""}</button>`).join("")
      + `<button class="guide-chip" type="button" data-objective="custom" aria-pressed="${state.objective === "custom"}">Personalizado</button>`;
    const stats = currentStats(info);
    els.custom.innerHTML = STATS.map((stat) => `<label class="br-toggle" style="--stat-color:${stat.color}"><input type="checkbox" data-stat="${stat.key}" ${stats.includes(stat.key) ? "checked" : ""}><span>${stat.short}</span></label>`).join("");
  }

  function renderBreeders(info, list) {
    if (info.mode === "ditto") {
      els.breeders.innerHTML = `<p class="br-note">Esta especie solo cría con <strong>Ditto</strong>: consigue Dittos con un 31 distinto cada uno (el Safari asegura 1 IV a 31) o mejóralos en la Tienda de IVs.</p>`;
      els.breederSelect.parentElement.hidden = true;
      return;
    }
    els.breederSelect.parentElement.hidden = false;
    const compatible = compatibleWith(info).filter((entry) => entry.id !== DITTO && entry.male > 0 && entry.male < 1);
    els.breederSelect.innerHTML = compatible.sort((a, b) => a.name.localeCompare(b.name, "es")).map((entry) => `<option value="${entry.id}" ${entry.id === state.breeder ? "selected" : ""}>${escapeHtml(entry.name)}</option>`).join("");
    els.breeders.innerHTML = list.map((entry) => `
      <button class="br-breeder${entry.id === state.breeder ? " is-active" : ""}" type="button" data-breeder="${entry.id}">
        <img src="${SPRITES}/${entry.id}.png" alt="" width="64" height="64" loading="lazy">
        <span><strong>${escapeHtml(entry.name)}</strong>
          <small><b class="rarity-${entry.spawn.rarity}">${RARITY[entry.spawn.rarity]}</b> · Nv. ${entry.spawn.level}</small>
          <small>${entry.spawn.places.slice(0, 3).map(escapeHtml).join(" · ")}</small>
          <em>${entry.egg.join(" · ")}</em></span>
      </button>`).join("") || '<p class="br-note">No hay breeders compatibles con spawn salvaje.</p>';
  }

  // --- Árbol ---
  function nodeHtml(node, plan) {
    const isBreed = node.left && !node.owned;
    const done = isBreed && plan.done.includes(node.step);
    const entry = node.species;
    const classes = ["br-node", isBreed ? "is-breed" : "is-leaf", node.onPath && "is-path", node.ditto && "is-ditto", done && "is-done",
      node === state.root && "is-root", node.owned && "is-owned", node.issues?.length && "has-issue", state.selected === node.id && "is-selected"].filter(Boolean).join(" ");
    const card = `
      <div class="${classes}" data-node="${node.id}" tabindex="0" role="button" aria-label="Editar ${escapeHtml(entry.name)}">
        ${isBreed ? `<label class="br-step" title="Marcar cruce como hecho"><input type="checkbox" data-step="${node.step}" ${done ? "checked" : ""}><span>${node.step}</span></label>` : ""}
        ${node.owned ? '<span class="br-owned" title="Ya lo tienes">★</span>' : ""}
        <img class="br-node-sprite" src="${SPRITES}/${entry.id}.png" alt="" width="48" height="48" loading="lazy">
        <div class="br-node-body">
          <strong>${escapeHtml(entry.name)} ${sexIcon(node.sex)}${node.issues?.length ? ' <span class="br-issue" title="Cruce no válido">⚠</span>' : ""}</strong>
          ${node.evolveTo ? `<small class="br-evolve">→ evoluciona a ${escapeHtml(node.evolveTo.name)}</small>` : ""}
          ${node.owned ? '<small class="br-evolve is-owned">Ya lo tienes</small>' : ""}
          <span class="br-node-stats">${statChips(node.stats)}</span>
        </div>
        ${node.item ? `<img class="br-node-item" src="${itemIcon(node.item)}" alt="${statByKey[node.item].itemName}" title="Lleva ${statByKey[node.item].itemName}" width="28" height="28">` : ""}
      </div>`;
    if (!isBreed) return `<div class="br-branch">${card}</div>`;
    return `<div class="br-branch"><div class="br-kids">${nodeHtml(node.left, plan)}${nodeHtml(node.right, plan)}</div>${card}</div>`;
  }

  // Editor del Pokémon seleccionado en el árbol.
  function renderEditor(info, plan) {
    const node = state.selected != null && state.root ? findNode(state.root, state.selected) : null;
    if (!node) {
      els.editor.innerHTML = '<p class="br-note">Toca cualquier Pokémon del árbol para cambiar su especie o marcar que <strong>ya lo tienes</strong> (la cadena empieza desde ahí).</p>';
      return;
    }
    const editable = isLeafLike(node);
    const isRoot = node === state.root;
    const options = compatibleWith(info)
      .filter((entry) => (node.sex === "female" ? entry.male < 1 : node.sex === "male" ? entry.male > 0 : true))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    const current = node.species.id;
    els.editor.innerHTML = `
      <div class="br-editor-card">
        <img src="${SPRITES}/${node.species.id}.png" alt="" width="72" height="72">
        <div class="br-editor-body">
          <strong>${escapeHtml(node.species.name)}${sexText(node.sex)} <span class="br-node-stats">${statChips(node.stats)}</span></strong>
          <small>${isRoot ? "Tu Pokémon final." : node.left && !node.owned ? `Sale del cruce ${node.step}: su especie la decide la madre.` : node.owned ? "Ya lo tienes: no hace falta criarlo ni sus padres." : `Pokémon base: atrápalo con 31 en ${statByKey[node.stats[0]].label}.`}</small>
          ${editable ? `<label class="guide-select"><span>Especie</span><select data-edit-species>${options.map((entry) => `<option value="${entry.id}" ${entry.id === current ? "selected" : ""}>${escapeHtml(entry.name)}${entry.id === DITTO ? " (Ditto)" : ""}</option>`).join("")}</select></label>` : ""}
          ${!isRoot ? `<label class="br-owned-toggle"><input type="checkbox" data-edit-owned ${node.owned ? "checked" : ""}> Ya tengo este Pokémon con estos IVs (empezar desde aquí)</label>` : ""}
          ${node.issues?.length ? `<p class="br-warning is-bad">${node.issues.map(escapeHtml).join(" ")}</p>` : ""}
          ${node.custom || node.owned ? '<button class="br-reset" type="button" data-edit-reset>Restablecer este Pokémon</button>' : ""}
        </div>
      </div>`;
  }

  // Elegir con qué IV a 31 empieza tu Pokémon objetivo (el de la rama dorada).
  function renderStart(info, stats, startStat) {
    const starter = VOLBEAT_ILLUMISE.has(state.target.id) ? byId[314] : info.parent;
    const sex = info.mode === "ditto" ? (starter.male < 0 ? "" : " ♂") : " ♀";
    els.start.innerHTML = `
      <img src="${SPRITES}/${starter.id}.png" alt="" width="56" height="56">
      <div>
        <strong>¿Con qué IV a 31 empieza tu ${escapeHtml(starter.name)}${sex}?</strong>
        <small>Elige el IV perfecto que ya tiene tu Pokémon de partida y la cadena se arma desde ahí.</small>
        <div class="br-start-chips">${stats.map((stat) => `<button type="button" class="br-start-chip" data-start="${stat}" aria-pressed="${stat === startStat}" style="--stat-color:${statByKey[stat].color}">${statByKey[stat].label}</button>`).join("")}</div>
      </div>`;
  }

  function renderPlan(info) {
    if (!info.parent || info.mode === "nidoran") {
      els.planner.hidden = true;
      return;
    }
    els.planner.hidden = false;
    const baseStats = currentStats(info);
    if (!baseStats.includes(state.start)) state.start = null;
    // La rama de tu especie empieza con el IV elegido: en el árbol, esa stat va al final (en la cadena con Ditto, al principio).
    const startStat = state.start ?? (info.mode === "ditto" ? baseStats[0] : baseStats[baseStats.length - 1]);
    const others = baseStats.filter((stat) => stat !== startStat);
    const stats = info.mode === "ditto" ? [startStat, ...others] : [...others, startStat];
    renderStart(info, baseStats, startStat);
    if (stats.length < 2) {
      els.tree.innerHTML = '<p class="br-note">Elige al menos 2 stats para armar una cadena.</p>';
      els.summary.innerHTML = "";
      els.steps.innerHTML = "";
      els.editor.innerHTML = "";
      return;
    }
    counter = 0;
    const breeder = byId[state.breeder] ?? info.parent;
    const planKey = `${state.target.id}:${stats.join(",")}:${info.mode === "ditto" ? DITTO : breeder.id}`;
    const plan = planData(loadStore(), planKey);
    const root = info.mode === "ditto" ? buildDittoChain(stats) : buildTree(stats, true);
    state.root = root;
    state.planKey = planKey;
    assignRoles(root, info, breeder, info.mode === "ditto" ? (info.parent.male < 0 ? null : "male") : "female", plan);
    const breeds = collectBreeds(root);
    els.tree.innerHTML = nodeHtml(root, plan);
    renderEditor(info, plan);

    // Compra y costes.
    const leaves = leavesOf(root);
    const toCatch = leaves.filter((leaf) => !leaf.owned);
    const owned = leaves.filter((leaf) => leaf.owned);
    const shopping = {};
    toCatch.forEach((leaf) => {
      const key = `${leaf.species.id}|${leaf.sex ?? ""}|${leaf.stats[0]}`;
      shopping[key] = (shopping[key] ?? 0) + 1;
    });
    const items = {};
    breeds.flatMap((node) => [node.left, node.right]).forEach((parent) => { if (parent.item) items[parent.item] = (items[parent.item] ?? 0) + 1; });
    const itemCount = Object.values(items).reduce((sum, value) => sum + value, 0);
    const genderCost = VOLBEAT_ILLUMISE.has(state.target.id) || info.mode === "ditto" ? 0 : breeds.length * GENDER_PRICE;
    const total = itemCount * ITEM_PRICE + genderCost;
    const shopCost = stats.length * ivShopCost(0, 31);
    const doneCount = breeds.filter((node) => plan.done.includes(node.step)).length;
    const objective = OBJECTIVES.find((entry) => entry.key === state.objective);
    const rank = RANKS.find((entry) => entry.key === loadRank()) ?? RANKS[0];
    // Los cruces de un mismo nivel se pueden hacer a la vez (tantos como slots tengas).
    const depthGroups = {};
    breeds.forEach((node) => { const depth = node.stats.length; depthGroups[depth] = (depthGroups[depth] ?? 0) + 1; });
    const rounds = Object.values(depthGroups).reduce((sum, count) => sum + Math.ceil(count / rank.slots), 0);
    els.summary.innerHTML = `
      <div class="br-kpis">
        <div><strong>${toCatch.length}</strong><span>Pokémon base de 1 IV a atrapar</span></div>
        <div><strong>${breeds.length}</strong><span>cruces (${doneCount} hechos)</span></div>
        <div><strong>${itemCount}</strong><span>pesas/brazales (se pierden)</span></div>
        <div class="is-money"><strong>$${money(total)}</strong><span>coste total aprox.</span></div>
      </div>
      <div class="br-progress"><i style="width:${breeds.length ? (doneCount / breeds.length) * 100 : 0}%"></i></div>
      <div class="br-time">
        <label class="guide-select"><span>Tu rango</span><select data-rank>${RANKS.map((entry) => `<option value="${entry.key}" ${entry.key === rank.key ? "selected" : ""}>${entry.label}</option>`).join("")}</select></label>
        <p>Cada crianza tarda <strong>${rank.minutes} min</strong> y tienes <strong>${rank.slots} slots</strong>: la cadena lleva unas <strong>${formatTime(rounds * rank.minutes)}</strong> de guardería (más el tiempo de eclosión de los huevos).</p>
      </div>
      <div class="br-shop">
        <div>
          <h4>Pokémon que necesitas atrapar</h4>
          <ul>${Object.entries(shopping).map(([key, count]) => {
            const [id, sex, stat] = key.split("|");
            return `<li><img src="${SPRITES}/${id}.png" alt="" width="40" height="40"><span><strong>${count}× ${escapeHtml(byId[id].name)} ${sexIcon(sex || null)}</strong><small>con 31 en ${statByKey[stat].label}</small></span></li>`;
          }).join("") || '<li><span><strong>Nada: ya tienes todo lo necesario.</strong></span></li>'}</ul>
          ${owned.length ? `<h4 class="br-owned-title">Ya los tienes</h4><ul>${owned.map((node) => `<li><img src="${SPRITES}/${node.species.id}.png" alt="" width="40" height="40"><span><strong>${escapeHtml(node.species.name)}${sexText(node.sex)}</strong><small>con ${node.stats.map((stat) => statByKey[stat].short).join(" · ")}</small></span></li>`).join("")}</ul>` : ""}
        </div>
        <div>
          <h4>Objetos y costes</h4>
          <ul>${Object.entries(items).map(([stat, count]) => `<li><img src="${itemIcon(stat)}" alt="" width="32" height="32"><span><strong>${count}× ${statByKey[stat].itemName}</strong><small>$${money(count * ITEM_PRICE)} (${ITEM_PRICE} cada una)</small></span></li>`).join("")}
            ${genderCost ? `<li><span class="br-sex-icon">⚥</span><span><strong>${breeds.length}× elegir sexo de la cría</strong><small>$${money(genderCost)} (${GENDER_PRICE} por cruce)</small></span></li>` : ""}
          </ul>
          <p class="br-compare">Comprar esos ${stats.length} IVs de 0 a 31 en la Tienda de IVs costaría <strong>$${money(shopCost)}</strong>.</p>
          ${objective?.trickRoom ? `<p class="br-compare is-tr">Espacio Raro: al terminar, baja la <strong>Velocidad a 0</strong> en la Tienda de IVs (cada punto hasta 10 cuesta $1.500; de 31 a 0 son $${money(ivShopCost(31, 0))}).</p>` : ""}
        </div>
      </div>`;

    // Paso a paso.
    const parentText = (parent) => `${escapeHtml((parent.evolveTo ?? parent.species).name)}${sexText(parent.sex)} (${parent.stats.map((stat) => statByKey[stat].short).join("·")}${parent.item ? `, con ${statByKey[parent.item].itemName}` : ""})`;
    els.steps.innerHTML = breeds.map((node) => {
      const gender = node.sex && genderCost ? ` Elige <strong>${node.sex === "female" ? "hembra" : "macho"}</strong> (500).` : "";
      const evolve = node.evolveTo ? ` Sale como bebé: <strong>evoluciónalo a ${escapeHtml(node.evolveTo.name)}</strong> antes del siguiente cruce.` : "";
      const issue = node.issues?.length ? ` <span class="br-issue-text">⚠ ${node.issues.map(escapeHtml).join(" ")}</span>` : "";
      return `<li class="${plan.done.includes(node.step) ? "is-done" : ""}"><span class="br-step-num">${node.step}</span><p>${parentText(node.left)} × ${parentText(node.right)} → <strong>${escapeHtml(node.species.name)}${sexText(node.sex)}</strong> con ${node.stats.map((stat) => statByKey[stat].short).join(" · ")}.${gender}${evolve}${node === root ? ' <em>¡Este es tu Pokémon final!</em>' : ""}${issue}</p></li>`;
    }).join("") || '<li><p>¡Ya tienes tu Pokémon final!</p></li>';
    fitTree();
  }

  function render() {
    if (!state.target) return;
    const info = analyse(state.target);
    const breeders = breedersFor(info);
    if (!state.breeder || !byId[state.breeder] || (info.parent && !byId[state.breeder].egg.some((group) => info.parent.egg.includes(group)))) state.breeder = breeders[0]?.id ?? info.parent?.id ?? null;
    if (!state.objective) state.objective = { physical: "5f", special: "5e", mixed: "6" }[info.style];
    renderTarget(info);
    renderObjectives(info);
    renderBreeders(info, breeders);
    renderPlan(info);
    renderBrowser();
    history.replaceState(null, "", `#${state.target.id}-${state.objective}${state.objective === "custom" ? `-${state.custom.join(".")}` : ""}${state.breeder ? `-b${state.breeder}` : ""}${state.start ? `-s${state.start}` : ""}`);
  }

  function selectTarget(id, scroll) {
    const target = byId[id];
    if (!target) return;
    state.target = target;
    state.objective = null;
    state.breeder = null;
    state.start = null;
    state.selected = null;
    render();
    if (scroll) els.target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Cambios en un plan guardado.
  function updatePlan(change) {
    const store = loadStore();
    const plan = planData(store, state.planKey);
    change(plan);
    store[state.planKey] = plan;
    saveStore(store);
    render();
  }

  // --- Zoom del árbol ---
  let zoom = 1;
  const applyZoom = () => { els.tree.style.setProperty("--zoom", zoom); els.tree.parentElement.style.height = `${els.tree.scrollHeight * zoom + 16}px`; };
  function fitTree() {
    els.tree.style.setProperty("--zoom", 1);
    zoom = Math.min(1, (els.treeWrap.clientWidth - 16) / els.tree.scrollWidth);
    applyZoom();
  }
  document.getElementById("br-zoom-in").addEventListener("click", () => { zoom = Math.min(1.6, zoom + 0.15); applyZoom(); });
  document.getElementById("br-zoom-out").addEventListener("click", () => { zoom = Math.max(0.3, zoom - 0.15); applyZoom(); });
  document.getElementById("br-zoom-fit").addEventListener("click", fitTree);
  window.addEventListener("resize", () => { if (state.target) fitTree(); });

  // --- Eventos ---
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
  els.breeders.addEventListener("click", (event) => {
    const button = event.target.closest("[data-breeder]");
    if (!button) return;
    state.breeder = Number(button.dataset.breeder);
    state.selected = null;
    render();
  });
  els.breederSelect.addEventListener("change", () => { state.breeder = Number(els.breederSelect.value); state.selected = null; render(); });
  els.tree.addEventListener("change", (event) => {
    const input = event.target.closest("[data-step]");
    if (!input) return;
    const step = Number(input.dataset.step);
    updatePlan((plan) => {
      const done = new Set(plan.done);
      if (input.checked) done.add(step); else done.delete(step);
      plan.done = [...done].sort((a, b) => a - b);
    });
  });
  const selectNode = (element) => {
    state.selected = Number(element.dataset.node);
    render();
    els.editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  els.tree.addEventListener("click", (event) => {
    if (event.target.closest(".br-step")) return;
    const element = event.target.closest("[data-node]");
    if (element) selectNode(element);
  });
  els.tree.addEventListener("keydown", (event) => {
    const element = event.target.closest("[data-node]");
    if (element && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); selectNode(element); }
  });
  els.editor.addEventListener("change", (event) => {
    const id = state.selected;
    if (event.target.matches("[data-edit-species]")) {
      const value = Number(event.target.value);
      updatePlan((plan) => { plan.species[id] = value; });
    } else if (event.target.matches("[data-edit-owned]")) {
      const checked = event.target.checked;
      updatePlan((plan) => { plan.owned = checked ? [...new Set([...plan.owned, id])] : plan.owned.filter((value) => value !== id); });
    }
  });
  els.editor.addEventListener("click", (event) => {
    if (!event.target.closest("[data-edit-reset]")) return;
    const id = state.selected;
    updatePlan((plan) => { delete plan.species[id]; plan.owned = plan.owned.filter((value) => value !== id); });
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
    try { localStorage.setItem(RANK_KEY, event.target.value); } catch { /* sin almacenamiento */ }
    render();
  });

  // Estado inicial desde el enlace (#468-5f-b21) o Togekiss por defecto.
  function fromHash() {
    const found = location.hash.match(/^#(\d+)(?:-(4|5f|5e|6|trf|tre|custom))?(?:-((?:hp|atk|def|spa|spd|spe)(?:\.(?:hp|atk|def|spa|spd|spe))*))?(?:-b(\d+))?(?:-s(hp|atk|def|spa|spd|spe))?$/);
    if (!found || !byId[found[1]]) return false;
    const objective = found[2] ?? null;
    if (Number(found[1]) === state.target?.id && (objective ?? state.objective) === state.objective && Number(found[4] ?? 0) === (state.breeder ?? 0) && (found[5] ?? null) === state.start) return true;
    state.target = byId[found[1]];
    state.objective = objective;
    if (objective === "custom") state.custom = (found[3] ?? "").split(".").filter((key) => statByKey[key]);
    state.breeder = found[4] ? Number(found[4]) : null;
    state.start = found[5] ?? null;
    state.selected = null;
    render();
    return true;
  }
  window.addEventListener("hashchange", fromHash);
  if (!fromHash()) selectTarget(468, false);
  renderIvShop(document.getElementById("iv-shop"));
})();
