// Filtro de selección múltiple: un botón que abre una lista de casillas.
// Dentro de un filtro las opciones se suman (Kanto o Sinnoh); entre filtros se combinan.
class MultiFilter {
  constructor(element) {
    this.element = element;
    this.placeholder = element.dataset.placeholder;
    this.selected = new Set();
    this.options = [];
    element.innerHTML = `<button class="multi-toggle" type="button" aria-haspopup="true" aria-expanded="false" aria-labelledby="${element.getAttribute("aria-labelledby")} ${element.id}-summary"><span class="multi-summary" id="${element.id}-summary"></span><i class="multi-count" hidden></i></button>
      <div class="multi-panel" hidden><button class="multi-clear" type="button">Quitar selección</button><div class="multi-options"></div></div>`;
    this.toggle = element.querySelector(".multi-toggle");
    this.panel = element.querySelector(".multi-panel");
    this.toggle.addEventListener("click", () => this.setOpen(this.panel.hidden));
    this.panel.querySelector(".multi-clear").addEventListener("click", () => {
      this.clear();
      this.emit();
    });
    this.panel.addEventListener("change", (event) => {
      const input = event.target.closest("input[type=checkbox]");
      if (!input) return;
      if (input.checked) this.selected.add(input.value);
      else this.selected.delete(input.value);
      this.update();
      this.emit();
    });
    this.update();
  }

  setOptions(options) {
    this.options = options;
    this.panel.querySelector(".multi-options").innerHTML = options.map(({ value, label }) => `<label class="multi-option"><input type="checkbox" value="${escapeHtml(value)}"${this.selected.has(value) ? " checked" : ""}><span>${escapeHtml(label)}</span></label>`).join("");
  }

  setOpen(open) {
    if (open) document.querySelectorAll(".multi-filter").forEach((other) => other !== this.element && other.multiFilter?.setOpen(false));
    this.panel.hidden = !open;
    this.toggle.setAttribute("aria-expanded", String(open));
    this.element.classList.toggle("is-open", open);
  }

  select(values) {
    values.filter((value) => this.options.some((option) => option.value === value)).forEach((value) => this.selected.add(value));
    this.panel.querySelectorAll("input[type=checkbox]").forEach((input) => { input.checked = this.selected.has(input.value); });
    this.update();
  }

  get isEmpty() { return this.selected.size === 0; }
  has(value) { return this.isEmpty || this.selected.has(value); }
  hasAny(values) { return this.isEmpty || values.some((value) => this.selected.has(value)); }

  clear() {
    this.selected.clear();
    this.panel.querySelectorAll("input[type=checkbox]").forEach((input) => { input.checked = false; });
    this.update();
  }

  update() {
    const labels = this.options.filter((option) => this.selected.has(option.value)).map((option) => option.label);
    const summary = this.element.querySelector(".multi-summary");
    const count = this.element.querySelector(".multi-count");
    summary.textContent = labels.length ? labels.join(", ") : this.placeholder;
    count.textContent = labels.length;
    count.hidden = labels.length < 2;
    this.element.classList.toggle("has-selection", labels.length > 0);
  }

  emit() {
    this.element.dispatchEvent(new Event("change"));
  }
}

function createMultiFilter(selector) {
  const element = document.querySelector(selector);
  element.multiFilter = new MultiFilter(element);
  return element.multiFilter;
}

const species = window.POKEDEX_SPECIES ?? [];
const fusionRecords = window.FUSIONDEX_DATA ?? [];
const generations = [
  { id: 1, name: "Kanto", start: 1, end: 151 },
  { id: 2, name: "Johto", start: 152, end: 251 },
  { id: 3, name: "Hoenn", start: 252, end: 386 },
  { id: 4, name: "Sinnoh", start: 387, end: 493 },
  { id: 5, name: "Teselia", start: 494, end: 649 },
  { id: 6, name: "Kalos", start: 650, end: 721 },
  { id: 7, name: "Alola", start: 722, end: 809 },
  { id: 8, name: "Galar", start: 810, end: 905 },
  { id: 9, name: "Paldea", start: 906, end: 1025 },
];
const progressStorageKey = "wiki-diosesmon-pokedex-state-v1";
const migrationStorageKey = "wiki-diosesmon-pokedex-migrated-v1";
const statLabels = [
  ["hp", "PS"], ["attack", "Ataque"], ["defense", "Defensa"],
  ["specialAttack", "At. Esp."], ["specialDefense", "Def. Esp."], ["speed", "Velocidad"],
];
const typeFilter = createMultiFilter("#type-filter");
const eggFilter = createMultiFilter("#egg-filter");
const formFilter = createMultiFilter("#form-filter");
const eggGroupsById = window.POKEDEX_EGG_GROUPS ?? {};
const regionalFormsById = new Map();
for (const form of window.POKEDEX_REGIONAL_FORMS ?? []) {
  regionalFormsById.set(form.id, [...(regionalFormsById.get(form.id) ?? []), form]);
}
const obtainMethods = { "evolución": "Se consigue por evolución" };
const regionFilter = createMultiFilter("#region-filter");
const statusFilter = createMultiFilter("#status-filter");
const searchInput = document.querySelector("#search-input");
const catalog = document.querySelector("#catalog");
const detail = document.querySelector("#detail");
const emptyState = document.querySelector("#empty-state");
let activeKind = "all";
let progress = loadProgress();
let detailRequest = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function slug(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function regionForNationalId(id) {
  return generations.find((generation) => id >= generation.start && id <= generation.end);
}

function pokemonKey(id) { return `pokemon:${id}`; }
function fusionKey(id) { return `fusion:${id}`; }

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
  } catch (error) {
    console.warn("No se pudo leer el progreso local de la Pokédex.", error);
    return {};
  }
}

function migrateLegacyProgress() {
  if (localStorage.getItem(migrationStorageKey) === "done") return;
  let migrated = false;
  for (const generation of generations) {
    const storageKey = `checkdex-caught-${generation.name.toLowerCase()}`;
    try {
      const regionalIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
      for (const regionalId of regionalIds) {
        const nationalId = generation.start + Number(regionalId) - 1;
        if (nationalId < generation.start || nationalId > generation.end) continue;
        progress[pokemonKey(nationalId)] = { seen: true, caught: true };
        migrated = true;
      }
    } catch (error) {
      console.warn(`No se pudo migrar el progreso de ${generation.name}.`, error);
    }
  }
  if (migrated) localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  localStorage.setItem(migrationStorageKey, "done");
}

function getProgress(record) {
  return progress[record.key] ?? { seen: false, caught: false };
}

function saveProgress() {
  localStorage.setItem(progressStorageKey, JSON.stringify(progress));
}

function regionalRecord(pokemon, base, form) {
  // "Paldea (Combatiente)" -> tarjeta "Tauros Combatiente" con insignia "Paldea".
  const [region, variant] = form.label.replace(")", "").split(" (");
  return {
    ...base,
    key: pokemonKey(`${pokemon.id}-${form.form}`),
    form: form.form,
    formLabel: form.label,
    regionBadge: region,
    name: `${pokemon.name} de ${form.label}`,
    cardName: variant ? `${pokemon.name} ${variant}` : pokemon.name,
    types: form.types,
    sprite: form.sprite,
    eggGroups: form.eggGroups,
    obtainable: form.obtainable,
    available: pokemon.available && Boolean(form.obtainable),
    searchTerms: [pokemon.name, pokemon.identifier, pokemon.id, form.label, "regional", ...form.types].join(" ").toLocaleLowerCase("es"),
  };
}

const records = [
  ...species.flatMap((pokemon) => {
    const base = {
      ...pokemon,
      key: pokemonKey(pokemon.id),
      recordKind: "pokemon",
      form: "",
      cardName: pokemon.name,
      displayNumber: `#${String(pokemon.id).padStart(4, "0")}`,
      region: regionForNationalId(pokemon.id)?.name ?? "",
      eggGroups: eggGroupsById[pokemon.id] ?? [],
      searchTerms: [pokemon.name, pokemon.identifier, pokemon.id, ...pokemon.types].join(" ").toLocaleLowerCase("es"),
    };
    return [base, ...(regionalFormsById.get(pokemon.id) ?? []).map((form) => regionalRecord(pokemon, base, form))];
  }),
  ...fusionRecords.map((fusion) => ({
    ...fusion,
    id: fusion.number,
    key: fusionKey(fusion.number),
    recordKind: "fusion",
    displayNumber: `F-${String(fusion.number).padStart(4, "0")}`,
    region: "Fusiones",
    available: true,
    sprite: fusion.image,
    genus: "Fusión",
    form: "",
    cardName: fusion.name,
    eggGroups: [],
    searchTerms: [fusion.name, fusion.number, ...fusion.types, ...fusion.abilities].join(" ").toLocaleLowerCase("es"),
  })),
];
const recordByKey = new Map(records.map((record) => [record.key, record]));

function typeClass(type) { return `type-${slug(type)}`; }
function typeTags(types = []) {
  return types.map((type) => `<span class="record-type ${typeClass(type)}">${escapeHtml(type)}</span>`).join("");
}

function iconEye() {
  return '<svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>';
}

function recordStatuses(record) {
  if (!record.available) return ["locked"];
  const state = getProgress(record);
  return [state.seen ? "seen" : "unseen", ...(state.caught ? ["caught"] : [])];
}

function visibleRecords({ ignoreStatus = false } = {}) {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  const kind = activeKind;
  return records.filter((record) => {
    if (kind === "regional" ? !record.form : kind !== "all" && record.recordKind !== kind) return false;
    if (!regionFilter.has(record.region)) return false;
    if (!typeFilter.hasAny(record.types)) return false;
    if (!eggFilter.hasAny(record.eggGroups)) return false;
    if (!formFilter.has(record.regionBadge)) return false;
    if (query && !record.searchTerms.includes(query)) return false;
    if (!ignoreStatus && !statusFilter.hasAny(recordStatuses(record))) return false;
    return true;
  });
}

function renderCard(record) {
  const state = getProgress(record);
  const isLocked = !record.available;
  const classes = ["dex-card", state.seen ? "is-seen" : "", state.caught ? "is-caught" : "", isLocked ? "is-locked" : ""].filter(Boolean).join(" ");
  const seenAria = state.seen ? "Quitar de vistos" : "Marcar como visto";
  const caughtAria = state.caught ? "Quitar de capturados" : "Marcar como capturado";
  const lockLabel = record.form ? `disponible cuando llegue ${record.regionBadge}` : "próximamente";
  return `<article class="${classes}" data-key="${record.key}"${isLocked && record.form ? ` title="Se activará cuando llegue ${escapeHtml(record.regionBadge)} al servidor"` : ""}>
    <div class="card-actions">
      <button class="card-action is-seen-action" type="button" data-action="seen" aria-label="${seenAria}" title="${seenAria}" aria-pressed="${state.seen}" ${isLocked ? "disabled" : ""}>${iconEye()}</button>
      <button class="card-action is-caught-action" type="button" data-action="caught" aria-label="${caughtAria}" title="${caughtAria}" aria-pressed="${state.caught}" ${isLocked ? "disabled" : ""}><i class="ball-icon" aria-hidden="true"></i></button>
    </div>
    <button class="record-open" type="button" data-action="open" ${isLocked ? `disabled aria-label="${escapeHtml(record.name)}, ${lockLabel}"` : `aria-label="Abrir ficha de ${escapeHtml(record.name)}"`}>
      <span class="card-art"><img src="${escapeHtml(record.sprite)}" alt="" loading="lazy">${isLocked ? '<span class="card-lock" aria-hidden="true">&#128274;</span>' : ""}<span class="card-number">${record.displayNumber}</span>${record.regionBadge ? `<span class="card-region" title="Forma de ${escapeHtml(record.formLabel)}">${escapeHtml(record.regionBadge)}</span>` : ""}</span>
      <strong class="record-name">${escapeHtml(record.cardName)}</strong>
      <span class="record-types">${typeTags(record.types)}</span>
    </button>
  </article>`;
}

// El progreso refleja los filtros activos salvo el de estado (si no, "Capturados" siempre daría 100 %).
function updateProgress() {
  const scope = visibleRecords({ ignoreStatus: true });
  const unlocked = scope.filter((record) => record.available);
  // Con el filtro Regionales el primer cuadro cuenta formas en vez de especies nacionales.
  const onlyForms = activeKind === "regional" || !formFilter.isEmpty;
  const scopedSpecies = scope.filter((record) => record.recordKind === "pokemon" && (onlyForms ? record.form : !record.form));
  document.querySelector("#available-label").textContent = onlyForms ? "Formas disponibles" : "Especies disponibles";
  const seenCount = unlocked.filter((record) => getProgress(record).seen).length;
  const caughtCount = unlocked.filter((record) => getProgress(record).caught).length;
  const percent = unlocked.length ? Math.round((caughtCount / unlocked.length) * 100) : 0;
  document.querySelector("#available-count").textContent = String(scopedSpecies.filter((pokemon) => pokemon.available).length);
  document.querySelector("#available-total").textContent = `de ${scopedSpecies.length.toLocaleString("es", { useGrouping: "always" })} ${onlyForms ? "regionales" : "nacionales"}`;
  document.querySelector("#seen-count").textContent = seenCount;
  document.querySelector("#caught-count").textContent = caughtCount;
  document.querySelector("#seen-total").textContent = `de ${unlocked.length}`;
  document.querySelector("#caught-total").textContent = `de ${unlocked.length}`;
  document.querySelector("#progress-percent").textContent = `${percent}%`;
  document.querySelector("#progress-fill").style.width = `${percent}%`;
}

function renderCatalog() {
  const visible = visibleRecords();
  catalog.innerHTML = visible.map(renderCard).join("");
  emptyState.hidden = visible.length > 0;
  document.querySelector("#result-count").textContent = `${visible.length.toLocaleString("es")} registros`;
  document.querySelector("#result-range").textContent = activeKind === "fusion" ? "FUSIONES" : "#001—#1025";
  document.querySelector("#kind-count-all").textContent = records.length;
  document.querySelector("#kind-count-pokemon").textContent = records.filter((record) => record.recordKind === "pokemon").length;
  document.querySelector("#kind-count-regional").textContent = records.filter((record) => record.form).length;
  document.querySelector("#kind-count-fusion").textContent = fusionRecords.length;
  document.querySelectorAll(".kind-filter").forEach((button) => {
    const active = button.dataset.kind === activeKind;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateProgress();
}

const detailModal = document.querySelector("#detail-modal");
const dropOverrides = window.DIOSESMON_DROP_OVERRIDES ?? {};
const speciesById = new Map(species.map((pokemon) => [pokemon.id, pokemon]));
const moveTabLabels = { level: "Por nivel", tm: "Por MT", egg: "Huevo", tutor: "Tutor" };
const SERVER_EGG_STEPS = 3000;
// Colores de hábitat por familia de bioma (la primera coincidencia gana).
const biomeTones = [
  [/nether\/is_warped/, "warped"], [/nether/, "nether"], [/is_end/, "end"], [/deep_dark/, "deepdark"],
  [/frozen|glacial|freezing|snowy|tundra|is_cold$/, "snow"], [/ocean|freshwater|river|coast/, "water"],
  [/badlands/, "badlands"], [/beach|desert|arid|sandy/, "sand"], [/savanna/, "savanna"],
  [/jungle|bamboo|tropical|lush|island/, "jungle"], [/forest|taiga/, "forest"],
  [/mountain|hills|peak|highlands|plateau/, "mountain"], [/dripstone|cave|infested/, "cave"],
  [/volcanic|thermal/, "volcanic"], [/swamp|mud/, "swamp"], [/floral|cherry|sunflower/, "floral"],
  [/magical/, "magical"], [/mushroom/, "mushroom"], [/spooky/, "spooky"], [/is_sky/, "sky"],
  [/plains|grassland|temperate|shrubland/, "plains"],
];
// Multiplicadores de Poké Ball de Cobblemon 1.7.3 (mismos que Catch Rate Display para versiones < 1.8.1).
const ballRules = [
  { balls: ["master_ball"], rule: () => ({ guaranteed: true, note: "Captura asegurada" }) },
  { balls: ["ultra_ball"], rule: () => ({ multiplier: 2 }) },
  { balls: ["great_ball"], rule: () => ({ multiplier: 1.5 }) },
  { balls: ["sport_ball"], rule: () => ({ multiplier: 1.5 }) },
  { balls: ["safari_ball"], rule: (ctx) => ctx.inBattle ? { multiplier: 1, note: "Solo sirve fuera de combate" } : { multiplier: 1.5 } },
  { balls: ["quick_ball"], rule: (ctx) => ctx.inBattle && ctx.turn === 1 ? { multiplier: 5, note: "Solo el primer turno" } : { multiplier: 1, note: "Solo el primer turno de combate" } },
  { balls: ["timer_ball"], rule: (ctx) => ctx.inBattle ? { multiplier: Math.min(4, ctx.turn * 1229 / 4096), note: `Turno ${ctx.turn}; antes de 1.8.1 el primer turno resta` } : { multiplier: 1, note: "Solo en combate" } },
  { balls: ["dusk_ball"], rule: () => ({ multiplier: 3, conditional: true, note: "Luz ≤ 7 (noche o cuevas); ×3,5 a oscuras total" }) },
  { balls: ["dive_ball"], rule: () => ({ multiplier: 3.5, conditional: true, note: "Pokémon bajo el agua" }) },
  { balls: ["net_ball"], rule: (ctx) => ctx.types.some((type) => type === "Agua" || type === "Bicho") ? { multiplier: 3, note: "Tipo Agua o Bicho" } : { multiplier: 1, note: "Solo tipo Agua o Bicho" } },
  { balls: ["nest_ball"], rule: (ctx) => ctx.level < 30 ? { multiplier: Math.max(1, (41 - ctx.level) / 10), note: "Mejor cuanto menor nivel" } : { multiplier: 1, note: "Solo nivel < 30" } },
  { balls: ["fast_ball"], rule: (ctx) => ctx.speed >= 100 ? { multiplier: 4, note: `Velocidad base ${ctx.speed}` } : { multiplier: 1, note: "Solo Velocidad base ≥ 100" } },
  { balls: ["heavy_ball"], rule: (ctx) => ({ multiplier: ctx.weight >= 3000 ? 4 : ctx.weight >= 2000 ? 2.5 : ctx.weight >= 1000 ? 1.5 : 1, note: `Peso ${(ctx.weight / 10).toLocaleString("es")} kg` }) },
  { balls: ["level_ball"], rule: (ctx) => {
    if (!ctx.inBattle) return { multiplier: 1, note: "Solo en combate" };
    const multiplier = ctx.yourLevel > ctx.level * 4 ? 4 : ctx.yourLevel > ctx.level * 2 ? 3 : ctx.yourLevel > ctx.level ? 2 : 1;
    return { multiplier, note: "Según el nivel de tu Pokémon" };
  } },
  { balls: ["love_ball"], rule: () => ({ multiplier: 8, conditional: true, note: "Tu Pokémon de la misma especie y sexo opuesto" }) },
  { balls: ["lure_ball"], rule: () => ({ multiplier: 4, conditional: true, note: "Pokémon pescado" }) },
  { balls: ["moon_ball"], rule: () => ({ multiplier: 4, conditional: true, note: "Luna llena; ×2,5 o ×1,5 en otras fases" }) },
  { balls: ["repeat_ball"], rule: () => ({ multiplier: 3.5, conditional: true, note: "Si ya lo capturaste antes" }) },
  { balls: ["park_ball"], rule: () => ({ multiplier: 2.5, conditional: true, note: "En bioma templado" }) },
  { balls: ["dream_ball"], rule: (ctx) => ctx.status === "sleep" ? { multiplier: 4, note: "Pokémon dormido" } : { multiplier: 1, note: "Solo si está dormido" } },
  { balls: ["beast_ball"], rule: () => ({ multiplier: 1, note: "Ultraentes ×5" }) },
  { balls: ["poke_ball", "premier_ball", "luxury_ball", "friend_ball", "heal_ball", "cherish_ball", "citrine_ball", "verdant_ball", "azure_ball", "roseate_ball", "slate_ball"], rule: () => ({ multiplier: 1 }) },
];
let detailsPromise = null;
let currentMoveTabs = {};
let currentCatch = null;
let lastFocused = null;

function loadDetails() {
  if (window.POKEDEX_DETAILS) return Promise.resolve();
  detailsPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "data/pokemon-details.js?v=4";
    script.onload = resolve;
    script.onerror = () => {
      detailsPromise = null;
      reject(new Error("No se pudo cargar pokemon-details.js"));
    };
    document.head.append(script);
  });
  return detailsPromise;
}

function formatNumber(value, digits = 1) {
  return Number(value.toFixed(digits)).toLocaleString("es");
}

function formatPercent(value) {
  return `${formatNumber(value)}%`;
}

function statRows(stats = {}) {
  return statLabels.map(([key, label]) => {
    const value = Number(stats[key] ?? 0);
    return `<div class="stat-line"><span>${label}</span><b>${value}</b><i><span style="width:${Math.min(100, value / 180 * 100)}%"></span></i></div>`;
  }).join("");
}

function statTotal(stats = {}) {
  return statLabels.reduce((total, [key]) => total + Number(stats[key] ?? 0), 0);
}

function statusControls(record) {
  const state = getProgress(record);
  return `<div class="detail-actions">
    <button class="detail-action is-seen-action" type="button" data-action="seen" aria-pressed="${state.seen}">${iconEye()} ${state.seen ? "Visto" : "Marcar visto"}</button>
    <button class="detail-action is-caught-action" type="button" data-action="caught" aria-pressed="${state.caught}"><i class="ball-icon" aria-hidden="true"></i> ${state.caught ? "Capturado" : "Capturar"}</button>
  </div>`;
}

function detailSection(title, body, extra = "") {
  return `<section class="detail-section"><h3>${title}${extra}</h3>${body}</section>`;
}

function infoList(rows) {
  return `<dl class="info-list">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
}

function detailHeader(record, { number, kind, sprite = record.sprite, types = record.types, intro = "", measures = [], extra = "" }) {
  return `<button class="detail-close" type="button" data-close-detail aria-label="Cerrar ficha" title="Cerrar (Esc)">×</button>
    <header class="detail-head">
      <div class="detail-art"><img src="${escapeHtml(sprite)}" alt="${escapeHtml(record.name)}"></div>
      <div class="detail-head-info">
        <span class="detail-number">${number}</span>
        <h2 class="detail-title" id="detail-title">${escapeHtml(record.name)}</h2>
        <span class="detail-kind">${escapeHtml(kind)}</span>
        <div class="detail-types">${typeTags(types)}</div>
        ${statusControls(record)}
        ${extra}
        ${intro ? `<p class="detail-intro">${escapeHtml(intro)}</p>` : ""}
        ${measures.length ? `<div class="detail-measures">${measures.map(([label, value]) => `<span>${label}<b>${value}</b></span>`).join("")}</div>` : ""}
      </div>
    </header>`;
}

function moveTabs(tabs) {
  currentMoveTabs = tabs;
  const keys = Object.keys(tabs);
  const first = keys.find((key) => tabs[key].length) ?? keys[0];
  return `<div class="move-tabs" role="tablist">${keys.map((key) => `<button class="move-tab${key === first ? " is-active" : ""}" type="button" role="tab" aria-selected="${key === first}" data-move-tab="${key}">${moveTabLabels[key]} <span>${tabs[key].length}</span></button>`).join("")}</div>
    <div class="detail-moves" data-moves>${renderMoves(first)}</div>`;
}

function renderMoves(key) {
  const moves = currentMoveTabs[key] ?? [];
  return moves.length
    ? moves.map((move) => `<span class="detail-move"><small>${escapeHtml(move.tag)}</small>${escapeHtml(move.name)}</span>`).join("")
    : '<span class="detail-empty">No aprende movimientos por este método.</span>';
}

function biomeTone(key) {
  return biomeTones.find(([pattern]) => pattern.test(key))?.[1] ?? "overworld";
}

function biomeTag(key) {
  const tag = (window.POKEDEX_BIOME_TAGS ?? {})[key];
  if (!tag) return "";
  const biomes = window.POKEDEX_BIOMES ?? {};
  const chips = tag.biomes.map((id) => {
    const biome = biomes[id] ?? { name: id, source: "vanilla" };
    return `<span class="biome-chip${biome.source === "terralith" ? " is-terralith" : ""}" title="${escapeHtml(id)}">${escapeHtml(biome.name)}</span>`;
  }).join("");
  return `<details class="biome-tag tone-${biomeTone(key)}"><summary>${escapeHtml(tag.name)}<small>${tag.biomes.length}</small></summary><div class="biome-list">${chips}</div></details>`;
}

// ---- Evoluciones y formas regionales ----

function nodeKey(id, form = "") {
  return form ? `${id}-${form}` : String(id);
}

function nodeInfo(key) {
  const node = (window.POKEDEX_EVOLUTION_NODES ?? {})[key];
  const id = node?.id ?? Number(key);
  const base = speciesById.get(id);
  return {
    key,
    id,
    form: node?.form ?? "",
    name: `${base?.name ?? `#${id}`}${node?.label ? ` de ${node.label}` : ""}`,
    sprite: node?.sprite || base?.sprite || "",
    available: Boolean(base?.available),
  };
}

function nodeChip(key, currentKey) {
  const node = nodeInfo(key);
  const label = `<img src="${escapeHtml(node.sprite)}" alt="" loading="lazy"><span>${escapeHtml(node.name)}</span>`;
  if (key === currentKey) return `<span class="evolution-link is-current" aria-current="true">${label}</span>`;
  if (!node.available) return `<span class="evolution-link is-locked" title="Próximamente">${label}</span>`;
  if (node.form && !recordByKey.get(pokemonKey(key))?.available) return `<a class="evolution-link is-locked" href="#pokemon/${node.id}/${node.form}" title="Aún no disponible en el servidor">${label}</a>`;
  return `<a class="evolution-link" href="#pokemon/${node.id}${node.form ? `/${node.form}` : ""}">${label}</a>`;
}

function requirementChips(requirements) {
  return requirements.map((requirement) => {
    if (requirement.text) return `<span class="evo-req">${escapeHtml(requirement.text)}</span>`;
    return `<span class="evo-biomes"><span class="evo-req-label">${requirement.negate ? "Fuera de" : "En"}</span>${requirement.biomes.map(biomeTag).join("")}</span>`;
  }).join("");
}

function familyEdges(pokemonId) {
  const edges = window.POKEDEX_EVOLUTIONS ?? [];
  const nodes = window.POKEDEX_EVOLUTION_NODES ?? {};
  const start = Object.keys(nodes).filter((key) => nodes[key].id === pokemonId);
  const seen = new Set(start);
  const queue = [...start];
  while (queue.length) {
    const key = queue.shift();
    for (const edge of edges) {
      const next = edge.from === key ? edge.to : edge.to === key ? edge.from : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  const family = edges.filter((edge) => seen.has(edge.from));
  const targets = new Set(family.map((edge) => edge.to));
  const roots = [...seen].filter((key) => !targets.has(key)).sort((first, second) => first.localeCompare(second, "es", { numeric: true }));
  const ordered = [];
  const visited = new Set();
  const walk = (key) => {
    for (const edge of family.filter((item) => item.from === key)) {
      if (visited.has(edge)) continue;
      visited.add(edge);
      ordered.push(edge);
      walk(edge.to);
    }
  };
  roots.forEach(walk);
  return { edges: ordered, members: seen, roots };
}

function wildBiomeTags(spawns = []) {
  return [...new Set(spawns.flatMap((spawn) => spawn.biomes))];
}

function renderFamily(pokemon, currentKey) {
  const { edges, members, roots } = familyEdges(pokemon.id);
  const rows = edges.map((edge) => `<div class="evo-row">
      <div class="evo-path">${nodeChip(edge.from, currentKey)}<span class="evo-arrow" aria-hidden="true">→</span>${nodeChip(edge.to, currentKey)}</div>
      <div class="evo-conditions"><span class="evo-method">${escapeHtml(edge.method)}</span>${requirementChips(edge.requirements)}</div>
      ${edge.moves.length ? `<p class="evo-moves">Aprende al evolucionar: ${edge.moves.map(escapeHtml).join(", ")}</p>` : ""}
    </div>`).join("");
  // Cómo conseguir las formas regionales que no vienen de una evolución.
  const details = window.POKEDEX_DETAILS ?? {};
  const regionalRoots = roots.map(nodeInfo).filter((node) => node.form);
  const origins = regionalRoots.map((node) => {
    const region = nodeInfo(node.key).name.split(" de ").pop().split(" (")[0];
    const how = `<span class="evo-req">No disponible aún: se activará cuando llegue ${escapeHtml(region)} al servidor</span>`;
    return `<div class="evo-row"><div class="evo-path">${nodeChip(node.key, currentKey)}</div><div class="evo-conditions">${how}</div></div>`;
  }).join("");
  const biasNotes = [...new Set([...members].map((key) => nodeInfo(key).id))].map((id) => details[id]?.biasNote ? [id, details[id].biasNote] : null).filter(Boolean).map(([id, note]) => {
    const exceptions = note.exceptions.map((exception) => `<span class="evo-req-label">En</span>${exception.biomes.map(biomeTag).join("")}<span class="evo-req-label">evoluciona a</span>${nodeChip(exception.to, currentKey)}`).join("");
    return `<div class="evo-row evo-bias"><p class="evo-note">Si ${escapeHtml(speciesById.get(id)?.name ?? "")} tiene origen de ${escapeHtml(note.region)} (cría de padres de ${escapeHtml(note.region)}), evoluciona a ${escapeHtml(nodeInfo(note.regionalTo).name)} en cualquier bioma${exceptions ? ", salvo:" : "."}</p>${exceptions ? `<div class="evo-conditions">${exceptions}</div>` : ""}</div>`;
  }).join("");
  if (!rows && !origins && !biasNotes) return "";
  return detailSection("Familia evolutiva", `<div class="evo-list">${rows}${origins}${biasNotes}</div>`);
}

function renderFormTabs(pokemon, data, formKey) {
  const forms = Object.entries(data.forms ?? {});
  if (!forms.length) return "";
  const tab = (key, label) => `<a class="form-tab${key === formKey ? " is-active" : ""}" href="#pokemon/${pokemon.id}${key ? `/${key}` : ""}"${key === formKey ? ' aria-current="true"' : ""}>${escapeHtml(label)}</a>`;
  return `<nav class="form-tabs" aria-label="Formas">${tab("", "Forma normal")}${forms.map(([key, form]) => tab(key, `Forma de ${form.label}`)).join("")}</nav>`;
}

// ---- Secciones ----

function renderBreeding(breeding) {
  const groups = breeding.eggGroups ?? [];
  const canBreed = groups.length && !groups.includes("Desconocido");
  const gender = breeding.maleRatio < 0
    ? "Sin género"
    : `${formatPercent(breeding.maleRatio * 100)} ♂ · ${formatPercent((1 - breeding.maleRatio) * 100)} ♀`;
  return infoList([
    ["Grupos huevo", `<span class="chip-row">${groups.map((group) => `<span class="info-chip">${escapeHtml(group)}</span>`).join("") || "—"}</span>`],
    ["Crianza", canBreed ? "Puede criar" : '<span class="muted-text">No puede criar</span>'],
    ["Pasos para eclosionar", canBreed ? `${SERVER_EGG_STEPS.toLocaleString("es", { useGrouping: "always" })} <span class="muted-text">(todos los huevos en Diosesmon)</span>` : "—"],
    ["Género", gender],
  ]);
}

function renderTraining(data) {
  return infoList([
    ["Ratio de captura", data.catchRate ?? "—"],
    ["Amistad base", data.baseFriendship ?? "—"],
    ["Grupo de experiencia", escapeHtml(data.experienceGroup ?? "—")],
  ]);
}

function renderRiding(riding) {
  if (!riding) return '<p class="ride-status"><span class="ride-badge">No montable</span></p>';
  const modes = riding.modes.map((mode) => `<span class="info-chip">${escapeHtml(mode.environment)} · ${escapeHtml(mode.style)}</span>`).join("");
  return `<p class="ride-status"><span class="ride-badge is-yes">Montable</span><span class="muted-text">${riding.seats} ${riding.seats === 1 ? "asiento" : "asientos"}</span></p><div class="chip-row">${modes}</div>`;
}

function renderDrops(pokemon, drops) {
  const override = dropOverrides[pokemon.identifier] ?? {};
  const disabled = new Set(override.disabled ?? []);
  if (!drops?.entries?.length) return '<p class="detail-empty">No suelta objetos.</p>';
  const rows = drops.entries.map((entry) => {
    const off = disabled.has(entry.item);
    const rate = [
      entry.chance !== undefined ? formatPercent(entry.chance) : "",
      entry.quantity !== undefined ? `Cant. ${entry.quantity}` : "",
    ].filter(Boolean).join(" · ") || "Cant. 1";
    return `<li class="drop-row${off ? " is-disabled" : ""}"><span class="drop-name">${escapeHtml(entry.name)}</span><span class="drop-rate">${rate}</span>${off ? '<em class="drop-off">Desactivado en Diosesmon</em>' : ""}</li>`;
  }).join("");
  const rolls = drops.rolls === 1 ? "1 tirada" : `${drops.rolls} tiradas`;
  return `<ul class="drop-list">${rows}</ul><p class="detail-footnote">${rolls} al derrotarlo; los porcentajes son por tirada.${override.note ? ` ${escapeHtml(override.note)}` : ""}</p>`;
}

function renderSpawns(spawns) {
  if (!spawns?.length) return '<p class="detail-empty">No aparece en estado salvaje; se obtiene por evolución u otros métodos.</p>';
  const entries = spawns.map((spawn) => `<article class="spawn-entry">
      <div class="spawn-meta">
        <span class="spawn-rarity rarity-${escapeHtml(spawn.rarity)}">${escapeHtml(spawn.bucket)}</span>
        <span class="spawn-fact">Nv. ${escapeHtml(spawn.level)}</span>
        <span class="spawn-fact">${escapeHtml(spawn.position)}</span>
        ${spawn.notes.map((note) => `<span class="spawn-note">${escapeHtml(note)}</span>`).join("")}
      </div>
      <div class="biome-tags">${spawn.biomes.map(biomeTag).join("")}</div>
      ${spawn.excluded.length ? `<div class="biome-tags is-excluded"><span class="biome-except">Excepto</span>${spawn.excluded.map(biomeTag).join("")}</div>` : ""}
    </article>`).join("");
  return `<p class="detail-footnote">Pulsa un hábitat para ver sus biomas. <span class="biome-chip is-terralith is-legend">Terralith</span> marca biomas del mod.</p><div class="spawn-list">${entries}</div>`;
}

// ---- Captura (fórmula de Cobblemon 1.7.3) ----

function catchChance(ctx, multiplier) {
  const hpFactor = ctx.inBattle ? 1 - (2 * ctx.hp) / 3 : 1 / 3;
  const battleModifier = ctx.inBattle ? 1 : 0.5;
  const statusBonus = !ctx.inBattle ? 1 : ctx.status === "sleep" ? 2.5 : ctx.status === "minor" ? 1.5 : 1;
  const levelBonus = ctx.level < 13 ? Math.max(Math.trunc((36 - 2 * ctx.level) / 10), 1) : 1;
  // En combate, si el salvaje te supera en 50+ niveles la captura cae al 10 %.
  const levelPenalty = ctx.inBattle && ctx.level - ctx.yourLevel >= 50 ? 0.1 : 1;
  const modified = hpFactor * ctx.catchRate * battleModifier * multiplier * statusBonus * levelBonus * levelPenalty;
  if (modified <= 0) return 0;
  const shake = Math.round(65536 / Math.pow(255 / modified, 0.1875));
  if (shake >= 65537) return 100;
  return Math.pow(shake / 65537, 4) * 100;
}

function catchContext() {
  const value = (name) => detail.querySelector(`[data-catch="${name}"]`);
  const clamp = (number, min, max) => Math.min(max, Math.max(min, Number.isFinite(number) ? number : min));
  return {
    ...currentCatch,
    inBattle: detail.querySelector('[data-catch-mode="battle"]')?.getAttribute("aria-pressed") === "true",
    level: clamp(Number(value("level")?.value), 1, 100),
    yourLevel: clamp(Number(value("your-level")?.value), 1, 100),
    hp: Number(value("hp")?.value ?? 1),
    status: value("status")?.value ?? "none",
    turn: clamp(Number(value("turn")?.value), 1, 99),
  };
}

function renderCatchTable() {
  const target = detail.querySelector("[data-catch-table]");
  if (!target || !currentCatch) return;
  const ctx = catchContext();
  detail.querySelectorAll("[data-battle-only]").forEach((field) => field.classList.toggle("is-disabled", !ctx.inBattle));
  const names = window.POKEDEX_BALL_NAMES ?? {};
  const rows = ballRules.map(({ balls, rule }) => {
    const result = rule(ctx);
    const chance = result.guaranteed ? 100 : catchChance(ctx, result.multiplier);
    const label = balls.length > 3 ? `${names[balls[0]] ?? balls[0]} <small>y similares (Honor, Lujo, Amigo, Sana, Gloria, bonguri)</small>` : balls.map((ball) => names[ball] ?? ball).join(" / ");
    const multiplier = result.guaranteed ? "—" : `×${formatNumber(result.multiplier, 2)}`;
    return { chance, conditional: Boolean(result.conditional), guaranteed: Boolean(result.guaranteed), html: `<tr class="${result.conditional ? "is-conditional" : ""}">
        <th scope="row">${label}${result.note ? `<small>${escapeHtml(result.note)}</small>` : ""}</th>
        <td class="catch-mult">${multiplier}</td>
        <td class="catch-chance"><span class="catch-bar"><i style="width:${Math.min(100, chance)}%"></i></span><b>${chance >= 100 ? "100" : formatNumber(chance)}%</b></td>
      </tr>` };
  }).sort((first, second) => second.guaranteed - first.guaranteed || second.chance - first.chance);
  const always = rows.filter((row) => !row.conditional).map((row) => row.html).join("");
  const conditional = rows.filter((row) => row.conditional).map((row) => row.html).join("");
  target.innerHTML = `${always}<tr class="catch-group"><th colspan="3">Con condición especial (si se cumple)</th></tr>${conditional}`;
}

function renderCatch(data, spawns) {
  const minLevel = Number(String(spawns?.[0]?.level ?? "").split("-")[0]) || 20;
  currentCatch = {
    catchRate: data.catchRate ?? 45,
    types: data.types ?? [],
    speed: data.stats.speed,
    weight: data.weight ?? 0,
  };
  return `<div class="catch-controls">
      <div class="segmented" role="group" aria-label="Situación">
        <button type="button" data-catch-mode="battle" aria-pressed="true">En combate</button>
        <button type="button" data-catch-mode="wild" aria-pressed="false">Fuera de combate</button>
      </div>
      <label>Nivel del salvaje<input type="number" min="1" max="100" value="${minLevel}" data-catch="level"></label>
      <label data-battle-only>Nivel de tu Pokémon<input type="number" min="1" max="100" value="${Math.min(100, minLevel + 5)}" data-catch="your-level"></label>
      <label data-battle-only>PS restantes<select data-catch="hp"><option value="1">100 %</option><option value="0.5">50 %</option><option value="0.25">25 %</option><option value="0.01">1 PS</option></select></label>
      <label data-battle-only>Estado<select data-catch="status"><option value="none">Ninguno</option><option value="sleep">Dormido / Congelado</option><option value="minor">Paralizado / Quemado / Envenenado</option></select></label>
      <label data-battle-only>Turno<input type="number" min="1" max="99" value="1" data-catch="turn"></label>
    </div>
    <div class="catch-table-wrap"><table class="catch-table"><thead><tr><th scope="col">Poké Ball</th><th scope="col">Bonus</th><th scope="col">Probabilidad</th></tr></thead><tbody data-catch-table></tbody></table></div>`;
}

// ---- Fichas ----

function renderFusionDetail(fusion) {
  currentCatch = null;
  const abilities = fusion.abilities.map((ability) => `<span class="ability-chip">${escapeHtml(ability)}</span>`).join("");
  const shiny = fusion.shinyAvailable ? "Disponible" : "No disponible por el momento";
  const tabs = moveTabs({
    level: fusion.movesByLevel.map((move) => ({ tag: `Nv. ${move.level}`, name: move.name })),
    tm: fusion.movesByTm.map((name) => ({ tag: "MT", name })),
  });
  detail.innerHTML = `${detailHeader(fusion, {
      number: `F-${fusion.number}`,
      kind: `Fusión · #${fusion.number}`,
      extra: `<p class="fusion-shiny">Shiny: ${shiny}</p>`,
      measures: [["Altura", `${(fusion.height / 10).toFixed(1)} m`], ["Peso", `${(fusion.weight / 10).toFixed(1)} kg`]],
    })}
    <div class="detail-grid">
      ${detailSection("Estadísticas base", `<div class="stats-grid">${statRows(fusion.stats)}</div>`, ` <span class="detail-number">Total ${fusion.total}</span>`)}
      ${detailSection("Habilidades", `<div class="ability-list">${abilities}</div>`)}
    </div>
    ${detailSection("Movimientos", tabs)}`;
}

function renderBasicPokemon(pokemon, message) {
  currentCatch = null;
  detail.innerHTML = `${detailHeader(pokemon, {
      number: `#${String(pokemon.id).padStart(4, "0")}`,
      kind: `${pokemon.genus} · Gen ${pokemon.generation}`,
      measures: [["Altura", `${(pokemon.height / 10).toFixed(1)} m`], ["Peso", `${(pokemon.weight / 10).toFixed(1)} kg`]],
    })}
    <p class="detail-error">${escapeHtml(message)}</p>
    ${detailSection("Estadísticas base", `<div class="stats-grid">${statRows(pokemon.stats)}</div>`, ` <span class="detail-number">Total ${pokemon.total}</span>`)}`;
}

async function renderPokemonDetail(pokemon, requestId, formKey = "") {
  detail.innerHTML = `<button class="detail-close" type="button" data-close-detail aria-label="Cerrar ficha">×</button><p class="detail-loading">Cargando ficha de ${escapeHtml(pokemon.name)}...</p>`;
  try {
    await loadDetails();
  } catch (error) {
    console.warn(error);
    if (requestId === detailRequest) renderBasicPokemon(pokemon, "No se pudieron cargar los datos de Cobblemon. Se muestran los datos base.");
    return;
  }
  if (requestId !== detailRequest) return;
  const baseData = window.POKEDEX_DETAILS?.[pokemon.id];
  if (!baseData) {
    renderBasicPokemon(pokemon, "Esta especie aún no tiene ficha de Cobblemon.");
    return;
  }
  const form = baseData.forms?.[formKey];
  const data = form ?? baseData;
  const moveNamesList = window.POKEDEX_DETAIL_MOVES ?? [];
  const named = (index) => moveNamesList[index] ?? "?";
  const tabs = moveTabs({
    level: data.moves.level.map(([level, index]) => ({ tag: level ? `Nv. ${level}` : "Evolución", name: named(index) })),
    tm: data.moves.tm.map((index) => ({ tag: "MT", name: named(index) })),
    egg: data.moves.egg.map((index) => ({ tag: "Huevo", name: named(index) })),
    tutor: data.moves.tutor.map((index) => ({ tag: "Tutor", name: named(index) })),
  });
  const abilities = data.abilities.map((ability) => `<span class="ability-chip">${escapeHtml(ability.name)}${ability.hidden ? " · oculta" : ""}</span>`).join("");
  detail.innerHTML = `${detailHeader(pokemon, {
      number: `#${String(pokemon.id).padStart(4, "0")}`,
      kind: form ? `Forma de ${form.label} · Gen ${pokemon.generation}` : `${pokemon.genus} · Gen ${pokemon.generation}`,
      sprite: form?.sprite ?? pokemon.sprite,
      types: data.types,
      intro: data.description,
      extra: renderFormTabs(pokemon, baseData, form ? formKey : "") + (pokemon.form ? (pokemon.obtainable
        ? `<p class="form-obtain">${escapeHtml(obtainMethods[pokemon.obtainable] ?? "")} en el servidor</p>`
        : `<p class="form-obtain is-unavailable">No disponible aún: se activará cuando llegue ${escapeHtml(pokemon.regionBadge)} al servidor</p>`) : ""),
      measures: [
        ["Altura", `${(data.height / 10).toFixed(1)} m`],
        ["Peso", `${(data.weight / 10).toFixed(1)} kg`],
        ["Experiencia base", data.baseExperience ?? "—"],
      ],
    })}
    <div class="detail-grid">
      ${detailSection("Estadísticas base", `<div class="stats-grid">${statRows(data.stats)}</div>`, ` <span class="detail-number">Total ${statTotal(data.stats)}</span>`)}
      <div>
        ${detailSection("Habilidades", `<div class="ability-list">${abilities}</div>`)}
        ${detailSection("Montura", renderRiding(data.riding))}
      </div>
      <div>
        ${detailSection("Crianza", renderBreeding(data.breeding))}
        ${detailSection("Entrenamiento", renderTraining(data))}
      </div>
      ${detailSection("Drops", renderDrops(pokemon, data.drops))}
    </div>
    ${renderFamily(pokemon, nodeKey(pokemon.id, form ? formKey : ""))}
    ${detailSection("Hábitat", pokemon.form && !pokemon.obtainable ? `<p class="detail-empty">Aún no aparece en el servidor; sus spawns se activarán cuando llegue ${escapeHtml(pokemon.regionBadge)}.</p>` : pokemon.form ? '<p class="detail-empty">No aparece salvaje en el servidor; se consigue evolucionando su forma normal.</p>' : renderSpawns(data.spawns))}
    ${detailSection("Movimientos", tabs)}
    ${detailSection("Captura", renderCatch(data, data.spawns))}
    <p class="detail-source">Datos de Diosesmon</p>`;
  renderCatchTable();
}

function openModal() {
  if (detailModal.hidden && !lastFocused) lastFocused = document.activeElement;
  detailModal.hidden = false;
  document.body.classList.add("modal-open");
  detail.scrollTop = 0;
  detail.focus({ preventScroll: true });
}

function closeDetail() {
  detailRequest += 1;
  if (detailModal.hidden) return;
  detailModal.hidden = true;
  document.body.classList.remove("modal-open");
  detail.innerHTML = "";
  detail.removeAttribute("data-key");
  detail.removeAttribute("data-form");
  currentCatch = null;
  if (lastFocused?.isConnected) lastFocused.focus({ preventScroll: true });
  lastFocused = null;
}

function requestClose() {
  if (history.state?.fromCatalog) {
    history.back();
    return;
  }
  history.replaceState(null, "", location.pathname + location.search);
  closeDetail();
}

function showRecord(record, formKey = "") {
  detailRequest += 1;
  const requestId = detailRequest;
  detail.dataset.key = record.key;
  detail.dataset.form = formKey;
  openModal();
  if (record.recordKind === "fusion") renderFusionDetail(record);
  else renderPokemonDetail(record, requestId, formKey);
}

function openRecord(record) {
  if (!record?.available) return;
  lastFocused = document.activeElement;
  history.pushState({ fromCatalog: true }, "", `#${record.recordKind}/${record.id}${record.form ? `/${record.form}` : ""}`);
  showRecord(record, record.form);
}

function handleHashChange() {
  const match = location.hash.match(/^#(pokemon|fusion)\/(\d+)(?:\/([a-z-]+))?$/);
  if (!match) {
    closeDetail();
    return;
  }
  const formKey = match[1] === "pokemon" ? match[3] ?? "" : "";
  const key = match[1] === "pokemon" ? pokemonKey(formKey ? `${match[2]}-${formKey}` : Number(match[2])) : fusionKey(Number(match[2]));
  const record = recordByKey.get(key);
  // Las formas no conseguibles se pueden consultar desde la ficha de su especie, aunque su tarjeta esté bloqueada.
  const viewable = record?.available || (record?.form && recordByKey.get(pokemonKey(Number(match[2])))?.available);
  if (!viewable) {
    history.replaceState(null, "", location.pathname + location.search);
    closeDetail();
    return;
  }
  if (detail.dataset.key !== key || detail.dataset.form !== formKey || detailModal.hidden) showRecord(record, formKey);
}

function setRecordState(record, action) {
  const current = { ...getProgress(record) };
  if (action === "caught") {
    current.caught = !current.caught;
    if (current.caught) current.seen = true;
  } else if (action === "seen") {
    current.seen = !current.seen;
    if (!current.seen) current.caught = false;
  }
  progress[record.key] = current;
  saveProgress();
  renderCatalog();
  if (!detailModal.hidden && detail.dataset.key === record.key) {
    detail.querySelector(".detail-actions")?.replaceWith(document.createRange().createContextualFragment(statusControls(record)));
  }
}

statusFilter.setOptions([
  { value: "unseen", label: "Sin ver" },
  { value: "seen", label: "Vistos" },
  { value: "caught", label: "Capturados" },
  { value: "locked", label: "Próximamente" },
]);
regionFilter.setOptions(generations.map((generation) => ({ value: generation.name, label: generation.name })));
typeFilter.setOptions([...new Set(records.flatMap((record) => record.types))]
  .sort((first, second) => first.localeCompare(second, "es"))
  .map((type) => ({ value: type, label: type })));
formFilter.setOptions([...new Set(records.map((record) => record.regionBadge).filter(Boolean))]
  .map((region) => ({ value: region, label: `Formas de ${region}` })));
eggFilter.setOptions([...new Set(records.flatMap((record) => record.eggGroups))]
  .sort((first, second) => first.localeCompare(second, "es", { numeric: true }))
  .map((group) => ({ value: group, label: group })));
document.addEventListener("click", (event) => {
  if (!event.target.closest(".multi-filter")) document.querySelectorAll(".multi-filter").forEach((element) => element.multiFilter.setOpen(false));
});

function initializeFilters() {
  const params = new URLSearchParams(location.search);
  const requestedKind = params.get("kind");
  if (requestedKind === "pokemon" || requestedKind === "fusion") activeKind = requestedKind;
  // ?region=Kanto,Johto abre la Pokédex filtrada (lo usa DexRewards).
  const regions = (params.get("region") ?? "").split(",").filter(Boolean);
  if (regions.length) {
    regionFilter.select(regions);
    activeKind = "pokemon";
  }
}

catalog.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  const card = event.target.closest(".dex-card");
  if (!card) return;
  const record = recordByKey.get(card.dataset.key);
  if (!record) return;
  if (actionButton?.dataset.action === "seen" || actionButton?.dataset.action === "caught") {
    event.stopPropagation();
    setRecordState(record, actionButton.dataset.action);
  } else if (actionButton?.dataset.action === "open") {
    openRecord(record);
  }
});
detail.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-detail]")) {
    requestClose();
    return;
  }
  const mode = event.target.closest("[data-catch-mode]");
  if (mode) {
    detail.querySelectorAll("[data-catch-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button === mode)));
    renderCatchTable();
    return;
  }
  const tab = event.target.closest("[data-move-tab]");
  if (tab) {
    detail.querySelectorAll("[data-move-tab]").forEach((button) => {
      button.classList.toggle("is-active", button === tab);
      button.setAttribute("aria-selected", String(button === tab));
    });
    detail.querySelector("[data-moves]").innerHTML = renderMoves(tab.dataset.moveTab);
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action !== "seen" && action !== "caught") return;
  const record = recordByKey.get(detail.dataset.key);
  if (record) setRecordState(record, action);
});
detailModal.querySelector(".detail-backdrop").addEventListener("click", requestClose);
detail.addEventListener("input", (event) => {
  if (event.target.closest("[data-catch]")) renderCatchTable();
});
document.querySelectorAll(".kind-filter").forEach((button) => button.addEventListener("click", () => {
  activeKind = button.dataset.kind;
  if (activeKind === "fusion") regionFilter.clear();
  renderCatalog();
}));
searchInput.addEventListener("input", renderCatalog);
regionFilter.element.addEventListener("change", () => {
  if (!regionFilter.isEmpty && activeKind === "fusion") activeKind = "pokemon";
  renderCatalog();
});
typeFilter.element.addEventListener("change", renderCatalog);
formFilter.element.addEventListener("change", renderCatalog);
eggFilter.element.addEventListener("change", () => {
  if (!eggFilter.isEmpty && activeKind === "fusion") activeKind = "pokemon";
  renderCatalog();
});
statusFilter.element.addEventListener("change", renderCatalog);
document.querySelector("#clear-filters").addEventListener("click", () => {
  searchInput.value = "";
  activeKind = "all";
  [regionFilter, typeFilter, eggFilter, formFilter, statusFilter].forEach((filter) => filter.clear());
  renderCatalog();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector(".multi-filter.is-open")) {
    document.querySelector(".multi-filter.is-open").multiFilter.setOpen(false);
    return;
  }
  if (!detailModal.hidden) {
    if (event.key === "Escape") requestClose();
    else if (event.key === "Tab") {
      const focusable = [...detail.querySelectorAll("a[href], button:not([disabled]), summary")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === detail)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});
window.addEventListener("hashchange", handleHashChange);

migrateLegacyProgress();
initializeFilters();
renderCatalog();
handleHashChange();
