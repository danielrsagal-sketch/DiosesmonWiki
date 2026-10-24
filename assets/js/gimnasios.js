// Gimnasios: regiones a la izquierda, combates de la región a la derecha.
// El jugador marca los combates que ya venció; con eso se calcula su level cap actual.
const GYM_PROGRESS_KEY = "wiki-diosesmon-gyms-v1";
const DEFAULT_LEVEL_CAP = 15;
const POKEMON_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const BADGE_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges";
const TRAINER_SPRITES = "https://play.pokemonshowdown.com/sprites/trainers";
const regions = window.GYM_REGIONS ?? [];
const speciesById = new Map((window.POKEDEX_SPECIES ?? []).map((pokemon) => [pokemon.id, pokemon]));
const modal = document.querySelector("#gym-modal");
const modalPanel = document.querySelector("#gym-modal-panel");
let modalOpener = null;
const list = document.querySelector("#gym-list");
const detail = document.querySelector("#gym-detail");
const kindLabels = { leader: "Gimnasio", elite: "Alto Mando", champion: "Campeón" };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function slug(value) {
  return String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function battleKey(region, battle) {
  return `${region.id}:${battle.kind}:${slug(battle.name)}`;
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(GYM_PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(GYM_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn("No se pudo guardar el progreso de gimnasios.", error);
  }
}

// Level cap actual: el más alto desbloqueado entre los combates vencidos (Kanto y Johto).
function currentLevelCap(progress) {
  let cap = DEFAULT_LEVEL_CAP;
  for (const region of regions) {
    for (const battle of region.battles) {
      if (battle.capAfter && progress[battleKey(region, battle)]) cap = Math.max(cap, battle.capAfter);
    }
  }
  return cap;
}

function regionStats(region, progress) {
  const done = region.battles.filter((battle) => progress[battleKey(region, battle)]).length;
  return { done, total: region.battles.length, percent: region.battles.length ? (done / region.battles.length) * 100 : 0 };
}

function renderList(currentId, progress) {
  list.innerHTML = regions.map((region) => {
    const stats = regionStats(region, progress);
    const art = region.available
      ? `<img src="${BADGE_SPRITES}/${region.badge}.png" alt="" class="gym-list-badge">`
      : '<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="">';
    const meta = region.available ? `${stats.done}/${stats.total} vencidos` : "Próximamente";
    return `<button class="dr-item${region.id === currentId ? " is-active" : ""}${region.available ? "" : " is-soon"}" type="button" data-region="${region.id}" style="--section-color:${region.color}" aria-current="${region.id === currentId}">
      <span class="dr-item-art">${art}</span>
      <span class="dr-item-text">
        <strong>${escapeHtml(region.name)} · Gen ${region.generation}</strong>
        <small>${meta}</small>
        <i class="dr-item-bar"><b style="width:${stats.percent}%"></b></i>
      </span>
    </button>`;
  }).join("");
}

// Etapas de un combate: los 2 entrenadores + el líder, o el Alto Mando + el Campeón.
function battleStages(region, battle) {
  if (battle.kind === "leader") {
    return [
      ...(battle.trainers ?? [{ name: "Entrenador 1", team: [] }, { name: "Entrenador 2", team: [] }]).map((trainer) => ({ label: trainer.name, team: trainer.team ?? [] })),
      { label: `Líder · ${battle.name}`, team: battle.team ?? [], trainer: battle.trainer, main: true },
    ];
  }
  const champion = region.battles.find((item) => item.kind === "champion");
  return [
    ...region.battles.filter((item) => item.kind === "elite").map((elite, index) => ({ label: `Alto Mando ${index + 1} · ${elite.name}`, team: elite.team ?? [], trainer: elite.trainer })),
    ...(champion ? [{ label: `${champion.title ?? "Campeón"} · ${champion.name}`, team: champion.team ?? [], trainer: champion.trainer, main: true }] : []),
  ];
}

// Gimnasios con varios líderes posibles (variants): un botón por líder; los que no tienen equipo aún salen sin información.
const variantBattle = (battle, variant) => ({ ...battle, ...variant, _base: battle });
function teamButton(region, battle) {
  if (battle.variants) {
    const index = region.battles.indexOf(battle);
    return `<div class="gym-variants">${battle.variants.map((variant, v) => (variant.team?.length
      ? `<button class="gym-team-btn" type="button" data-team="${region.id}:${index}:${v}" title="${escapeHtml(variant.note ?? "")}"><img src="${TRAINER_SPRITES}/${variant.trainer}.png" alt="" width="28" height="28">${escapeHtml(variant.name)} · ${escapeHtml(variant.type)}</button>`
      : `<span class="gym-team-btn is-empty" title="${escapeHtml(variant.note ?? "")} · aún sin información"><img src="${TRAINER_SPRITES}/${variant.trainer}.png" alt="" width="28" height="28">${escapeHtml(variant.name)} · ${escapeHtml(variant.type)}<small>Aún sin información</small></span>`)).join("")}</div>`;
  }
  const target = battle.kind === "elite" ? region.battles.find((item) => item.kind === "champion") : battle;
  const ready = battleStages(region, target).some((stage) => stage.team.length);
  const index = region.battles.indexOf(target);
  return ready
    ? `<button class="gym-team-btn" type="button" data-team="${region.id}:${index}"><img src="${REWARD_ITEM_SPRITES}/poke-ball.png" alt="" width="28" height="28">Ver equipo Pokémon</button>`
    : '<p class="gym-team-pending">Equipo por confirmar</p>';
}

const REGIONAL_LABELS = { alola: "Alola", galar: "Galar", hisui: "Hisui", paldea: "Paldea" };

// Megas y formas regionales usan su propio sprite de PokéAPI (campo sprite) y, si cambian, sus tipos.
function pokemonCard(member) {
  const pokemon = speciesById.get(member.id);
  const baseName = member.name ?? pokemon?.name ?? `#${member.id}`;
  const megaSuffix = typeof member.mega === "string" ? ` ${member.mega}` : "";
  const name = member.mega ? `Mega-${baseName}${megaSuffix}` : member.form ? `${baseName} de ${REGIONAL_LABELS[member.form] ?? member.form}` : baseName;
  const sprite = `${POKEMON_SPRITES}/${member.sprite ?? member.id}.png`;
  const types = (member.types ?? pokemon?.types ?? []).map((type) => `<span class="gym-type" style="--type-color:var(--type-${slug(type)}, #60718d)">${escapeHtml(type)}</span>`).join("");
  const link = `pokedex.html#pokemon/${member.id}${member.form ? `/${member.form}` : ""}`;
  const tag = member.mega ? "Mega" : member.form ? REGIONAL_LABELS[member.form] : "";
  // Especies de regiones no activas (p. ej. Annihilape) no tienen ficha abierta en la Pokédex: sin enlace.
  const linked = pokemon?.available !== false;
  const element = linked ? "a" : "div";
  const attributes = linked ? ` href="${link}" title="Ver ficha de ${escapeHtml(baseName)} en la Pokédex"` : ' title="Especie aún no disponible en la Pokédex del servidor"';
  return `<${element} class="gym-mon${member.mega ? " is-mega" : ""}"${attributes}>
      ${tag ? `<span class="gym-mon-tag">${escapeHtml(tag)}</span>` : ""}
      <img src="${sprite}" alt="" loading="lazy">
      <strong>${escapeHtml(name)}</strong>
      <span class="gym-mon-types">${types}</span>
      ${member.note ? `<small class="gym-mon-note">${escapeHtml(member.note)}</small>` : ""}
      ${member.level ? `<small>Nv. ${member.level}</small>` : ""}
    </${element}>`;
}


// ---------- Consejos automáticos (se calculan con los equipos de cada combate) ----------
// Tabla de tipos de Cobblemon 1.7.3 (atacante × defensor): 0 inmune, 1 = ½, 2 neutro, 3 = ×2.
const TYPE_ORDER = ["Normal", "Lucha", "Volador", "Veneno", "Tierra", "Roca", "Bicho", "Fantasma", "Acero", "Fuego", "Agua", "Planta", "Eléctrico", "Psíquico", "Hielo", "Dragón", "Siniestro", "Hada"];
const TYPE_CHART = "222221201222222222321123103222213231232221321223122222222111210223222223220323123321322222213212321322223222211122211123232231022222232222232212222223221112123223222221323113223122222233222311222122221133121131222122223202222231122122232322221222212202223232221113221322222222221222222320212222232222232211232122221122222332";
const TYPE_MULT = { 0: 0, 1: 0.5, 2: 1, 3: 2 };
const effect = (attack, defenders) => defenders.reduce((total, defender) => {
  const a = TYPE_ORDER.indexOf(attack);
  const d = TYPE_ORDER.indexOf(defender);
  return a < 0 || d < 0 ? total : total * TYPE_MULT[TYPE_CHART[a * 18 + d]];
}, 1);
const typesOf = (member) => member.types ?? speciesById.get(member.id)?.types ?? [];
const nameOf = (member) => {
  const base = member.name ?? speciesById.get(member.id)?.name ?? `#${member.id}`;
  return member.mega ? `Mega-${base}${typeof member.mega === "string" ? ` ${member.mega}` : ""}` : member.form ? `${base} de ${REGIONAL_LABELS[member.form] ?? member.form}` : base;
};
const typeChip = (type) => `<span class="gym-type" style="--type-color:var(--type-${slug(type)}, #60718d)">${escapeHtml(type)}</span>`;

// Pokémon que puedes usar en la región: totalmente evolucionados, disponibles y sin legendarios (total < 580).
const finalForms = () => {
  const parents = new Set((window.POKEDEX_SPECIES ?? []).map((pokemon) => pokemon.evolvesFrom).filter(Boolean));
  return (window.POKEDEX_SPECIES ?? []).filter((pokemon) => (pokemon.kind === "pokemon" || !pokemon.kind) && pokemon.available !== false && !parents.has(pokemon.id) && pokemon.total < 580);
};
function examplesFor(type, gens, used) {
  return finalForms().filter((pokemon) => pokemon.types.includes(type) && (!gens || gens.includes(pokemon.generation)) && !used.has(pokemon.id))
    .sort((a, b) => b.total - a.total).slice(0, 3);
}
function gymTips(stages, region) {
  const mons = stages.flatMap((stage) => stage.team);
  if (!mons.length) return "";
  const main = stages.filter((stage) => stage.main).flatMap((stage) => stage.team);
  // Ataque: tipos que pegan ×2 (o más) a más Pokémon rivales y que pocos resisten.
  const attack = TYPE_ORDER.map((type) => {
    const values = mons.map((member) => effect(type, typesOf(member)));
    return { type, strong: values.filter((v) => v > 1).length, weak: values.filter((v) => v < 1).length };
  }).filter((row) => row.strong).sort((a, b) => (b.strong - b.weak) - (a.strong - a.weak) || b.strong - a.strong).slice(0, 4);
  // Defensa: sus ataques suelen ser de sus propios tipos (STAB). Tipos que los resisten mejor.
  const stab = new Map();
  mons.forEach((member) => typesOf(member).forEach((type) => stab.set(type, (stab.get(type) ?? 0) + 1)));
  const defend = TYPE_ORDER.map((type) => {
    let score = 0;
    let hurt = 0;
    stab.forEach((count, attackType) => {
      const value = effect(attackType, [type]);
      if (value < 1) score += count;
      if (value > 1) { score -= count; hurt += count; }
    });
    return { type, score, hurt };
  }).filter((row) => row.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const common = [...stab.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  // Peligros: los del líder (o campeón) con menos debilidades, y las megas.
  const tough = main.map((member) => ({ member, weak: TYPE_ORDER.filter((type) => effect(type, typesOf(member)) > 1) }))
    .sort((a, b) => a.weak.length - b.weak.length);
  const toughest = tough[0];
  const megas = main.filter((member) => member.mega);
  const immunities = mons.map((member) => ({ member, immune: TYPE_ORDER.filter((type) => effect(type, typesOf(member)) === 0) })).filter((row) => row.immune.length);
  const items = [
    attack.length && `<li><strong>Ataca con</strong> ${attack.map((row) => typeChip(row.type)).join("")}<small>${attack.map((row) => `${row.type}: pega ×2 a ${row.strong} de ${mons.length}`).join(" · ")}</small></li>`,
    attack.length && (() => {
      const used = new Set();
      const picks = attack.slice(0, 3).map((row) => {
        const list = examplesFor(row.type, region.allowedGens, used);
        list.forEach((pokemon) => used.add(pokemon.id));
        return list.length ? `${row.type}: ${list.map((pokemon) => `<a href="pokedex.html#pokemon/${pokemon.id}">${escapeHtml(pokemon.name)}</a>`).join(", ")}` : "";
      }).filter(Boolean);
      return picks.length ? `<li><strong>Pokémon que te sirven</strong>${region.allowedGens ? `<span class="gym-gens">Solo gen ${region.allowedGens.join(" y ")}</span>` : ""}<small>${picks.join(" · ")}</small></li>` : "";
    })(),
    defend.length && `<li><strong>Aguantan bien sus ataques</strong> ${defend.map((row) => typeChip(row.type)).join("")}<small>Sus tipos más repetidos son ${common.map(([type, count]) => `${type} (${count})`).join(", ")}: lo normal es que ataquen con ellos.</small></li>`,
    toughest && toughest.weak.length && `<li><strong>Cuidado con ${escapeHtml(nameOf(toughest.member))}</strong><small>Es el más difícil de su equipo: solo le pega ×2 ${toughest.weak.join(", ")}.</small></li>`,
    megas.length && `<li><strong>Megaevolución</strong><small>${megas.map((member) => escapeHtml(nameOf(member))).join(", ")} megaevoluciona: sube mucho sus estadísticas y puede cambiar de tipo y de habilidad.</small></li>`,
    immunities.length && `<li><strong>Inmunidades</strong><small>${immunities.slice(0, 4).map(({ member, immune }) => `${escapeHtml(nameOf(member))} no recibe daño de ${immune.join(" ni ")}`).join(" · ")}.</small></li>`,
    '<li><strong>Prepárate</strong><small>Lleva un equipo variado y por encima del nivel si puedes; usa la <a href="competitivo.html">calculadora Competitivo</a> para revisar las debilidades de tu equipo contra estos tipos.</small></li>',
  ].filter(Boolean);
  return `<section class="gym-tips"><h3>💡 Consejos para este combate</h3><ul>${items.join("")}</ul><p class="gym-tips-note">Calculados con los tipos de sus Pokémon; sus movimientos pueden cubrir otras debilidades.</p></section>`;
}

function openTeam(region, battle, opener) {
  const stages = battleStages(region, battle);
  const step = battle.kind === "champion" ? battle.title ?? "Campeón" : `Gimnasio ${region.battles.filter((item) => item.kind === "leader").indexOf(battle._base ?? battle) + 1}`;
  const rules = [region.levelRule, region.allowed, battle.cap ? `Level cap ${battle.cap}` : ""].filter(Boolean);
  modal.style.setProperty("--section-color", region.color);
  modalPanel.innerHTML = `<button class="gym-modal-close" type="button" data-close-team aria-label="Cerrar" title="Cerrar (Esc)">×</button>
    <header class="gym-modal-head" style="--type-color:var(--type-${slug(battle.type ?? "normal")}, #60718d)">
      <div class="gym-trainer is-large"><img src="${TRAINER_SPRITES}/${battle.trainer}.png" alt=""></div>
      <div>
        <span class="gym-step">${escapeHtml(region.name)} · ${escapeHtml(step)}</span>
        <h2 id="gym-modal-title">${escapeHtml(battle.name)}</h2>
        <div class="gym-tags">
          ${battle.type ? `<span class="gym-type">${escapeHtml(battle.type)}</span>` : ""}
          ${battle.badge ? `<span class="gym-badge"><img src="${BADGE_SPRITES}/${battle.badge}.png" alt="">${escapeHtml(battle.badgeName)}</span>` : ""}
        </div>
        <ul class="gym-modal-rules">${rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>
      </div>
    </header>
    <p class="gym-shiny-note">✦ Cualquier Pokémon de estos equipos puede salir shiny: varía en cada combate.</p>
    <ol class="gym-stages">${stages.map((stage, index) => `<li class="gym-stage${stage.main ? " is-main" : ""}">
        <h3><span>${index + 1}</span>${escapeHtml(stage.label)}</h3>
        ${stage.team.length ? `<div class="gym-mon-grid">${stage.team.map(pokemonCard).join("")}</div>` : '<p class="gym-team-pending">Equipo por confirmar</p>'}
      </li>`).join("")}</ol>
    ${gymTips(stages, region)}`;
  modalOpener = opener;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  modalPanel.scrollTop = 0;
  modalPanel.focus({ preventScroll: true });
}

function closeTeam() {
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  modalPanel.innerHTML = "";
  if (modalOpener?.isConnected) modalOpener.focus({ preventScroll: true });
}

function renderBattle(region, battle, index, progress) {
  const key = battleKey(region, battle);
  const done = Boolean(progress[key]);
  const step = battle.kind === "champion" ? battle.title ?? "Campeón" : `${kindLabels[battle.kind]} ${index}`;
  const cap = battle.cap
    ? `<p class="gym-cap">Level cap <b>${battle.cap}</b>${battle.capAfter && battle.capAfter !== battle.cap ? ` <span aria-hidden="true">→</span> <b>${battle.capAfter}</b> al vencer` : ""}</p>`
    : "";
  return `<article class="gym-card kind-${battle.kind}${done ? " is-done" : ""}" style="--type-color:var(--type-${slug(battle.type ?? "normal")}, #60718d)">
    <div class="gym-trainer"><img src="${TRAINER_SPRITES}/${battle.trainer}.png" alt="" loading="lazy"></div>
    <div class="gym-info">
      <span class="gym-step">${escapeHtml(step)}${battle.unconfirmed ? ' <em title="Pendiente de confirmar en el servidor">por confirmar</em>' : ""}</span>
      <h4>${escapeHtml(battle.name)}</h4>
      <div class="gym-tags">
        ${battle.type ? `<span class="gym-type">${escapeHtml(battle.type)}</span>` : ""}
        ${battle.badge ? `<span class="gym-badge"><img src="${BADGE_SPRITES}/${battle.badge}.png" alt="">${escapeHtml(battle.badgeName)}</span>` : ""}
      </div>
      ${cap}
      ${battle.kind === "leader" ? '<p class="gym-note">Antes del líder: 2 entrenadores del gimnasio</p>' : ""}
      ${battle.note ? `<p class="gym-note">${escapeHtml(battle.note)}</p>` : ""}
    </div>
    <div class="gym-footer">
      ${battle.kind === "elite"
        ? '<p class="gym-elite-note">Sin recompensa propia: el Alto Mando es el camino hacia el Campeón</p>'
        : battle.rewards?.length ? `<div class="gym-rewards"><span>Recompensa</span>${rewardChips(battle.rewards, "gym-reward-list")}</div>` : '<p class="gym-team-pending">Recompensa por confirmar</p>'}
      ${teamButton(region, battle)}
      <label class="gym-done"><input type="checkbox" data-battle="${key}"${done ? " checked" : ""}><span>${done ? "Vencido" : "Marcar vencido"}</span></label>
    </div>
  </article>`;
}

function renderGroup(title, region, kind, progress) {
  const battles = region.battles.filter((battle) => battle.kind === kind);
  if (!battles.length) return "";
  return `<section class="gym-group">
    <h4 class="gym-group-title">${title}</h4>
    <div class="gym-grid${kind === "champion" ? " is-single" : ""}">${battles.map((battle, index) => renderBattle(region, battle, index + 1, progress)).join("")}</div>
  </section>`;
}

function renderDetail(region, progress) {
  detail.style.setProperty("--section-color", region.color);
  if (!region.available) {
    detail.innerHTML = `<header class="dr-detail-head"><div>
        <h3>${escapeHtml(region.name)}</h3>
        <p class="dr-count">Generación ${region.generation}</p>
        <p class="dr-description">Los gimnasios, el Alto Mando y el Campeón de ${escapeHtml(region.name)} llegarán cuando la región se active en el servidor.</p>
        <p class="dr-warning">Próximamente</p>
      </div></header>`;
    return;
  }
  const stats = regionStats(region, progress);
  const capsByBadge = region.battles.some((battle) => battle.capAfter);
  detail.innerHTML = `<header class="dr-detail-head">
      <div>
        <h3>${escapeHtml(region.name)}</h3>
        <p class="dr-count">${stats.done} / ${stats.total} combates vencidos</p>
        <ul class="gym-rules">
          <li><b>Nivel</b>${escapeHtml(region.levelRule)}</li>
          <li><b>Equipo</b>${escapeHtml(region.allowed)}</li>
          ${capsByBadge ? `<li class="is-cap"><b>Tu level cap</b>${currentLevelCap(progress)}</li>` : ""}
        </ul>
      </div>
      <div class="dr-ring" style="--percent:${stats.percent}" role="img" aria-label="${Math.round(stats.percent)} % completado"><span>${stats.done}/${stats.total}</span></div>
    </header>
    ${renderGroup("Líderes de gimnasio", region, "leader", progress)}
    ${renderGroup("Alto Mando", region, "elite", progress)}
    ${renderGroup("Campeón", region, "champion", progress)}`;
}

function currentRegion() {
  const id = location.hash.slice(1);
  return regions.find((region) => region.id === id) ?? regions[0];
}

function render() {
  const progress = loadProgress();
  const region = currentRegion();
  renderList(region.id, progress);
  renderDetail(region, progress);
  const active = list.querySelector(".dr-item.is-active");
  if (active && list.scrollWidth > list.clientWidth) list.scrollLeft = active.offsetLeft - list.offsetLeft;
}

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-region]");
  if (!button) return;
  history.replaceState(null, "", `#${button.dataset.region}`);
  render();
  if (matchMedia("(max-width: 860px)").matches) detail.scrollIntoView({ behavior: "smooth", block: "start" });
});
detail.addEventListener("click", (event) => {
  const button = event.target.closest("[data-team]");
  if (!button) return;
  const [regionId, index, variant] = button.dataset.team.split(":");
  const region = regions.find((item) => item.id === regionId);
  if (!region) return;
  const battle = region.battles[Number(index)];
  openTeam(region, variant !== undefined && battle.variants ? variantBattle(battle, battle.variants[Number(variant)]) : battle, button);
});
modal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-team]")) closeTeam();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeTeam();
});
detail.addEventListener("change", (event) => {
  const input = event.target.closest("[data-battle]");
  if (!input) return;
  const progress = loadProgress();
  if (input.checked) progress[input.dataset.battle] = true;
  else delete progress[input.dataset.battle];
  saveProgress(progress);
  const scroll = window.scrollY;
  render();
  window.scrollTo(0, scroll);
});
window.addEventListener("hashchange", render);
window.addEventListener("storage", (event) => {
  if (event.key === GYM_PROGRESS_KEY) render();
});

render();
