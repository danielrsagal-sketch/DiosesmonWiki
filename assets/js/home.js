// Inicio: tarjetas de secciones (desde site-nav.js), progreso del jugador y botón de copiar IP.
const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";
const POKEDEX_KEY = "wiki-diosesmon-pokedex-state-v1";
const GYMS_KEY = "wiki-diosesmon-gyms-v1";
const AVAILABLE_SPECIES = 493;
const NATIONAL_SPECIES = 1025;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function slug(value) {
  return String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function renderCards() {
  const cards = SITE_SECTIONS.filter((section) => section.description);
  const ready = cards.filter((section) => section.ready);
  const soon = cards.filter((section) => !section.ready);
  const card = (section) => `<a class="home-card${section.ready ? "" : " is-soon"}" href="${section.href}" style="--card-color:${section.color}">
      <span class="home-card-icon"><img src="${SPRITE_BASE}/${section.icon}.png" alt="" loading="lazy"></span>
      <span class="home-card-text">
        <strong>${escapeHtml(section.label)}</strong>
        <small>${escapeHtml(section.description)}</small>
      </span>
      <span class="home-card-tag">${section.badge ?? (section.ready ? "Disponible" : "En construcción")}</span>
    </a>`;
  document.querySelector("#home-cards").innerHTML = `
    <div class="home-cards-grid is-main">${ready.map(card).join("")}</div>
    <h3 class="home-cards-subtitle">Próximamente</h3>
    <div class="home-cards-grid">${soon.map(card).join("")}</div>`;
}

function renderProgress() {
  const dex = readJson(POKEDEX_KEY);
  const gyms = readJson(GYMS_KEY);
  let seen = 0;
  let caught = 0;
  let nationalCaught = 0;
  for (let id = 1; id <= NATIONAL_SPECIES; id += 1) {
    const state = dex[`pokemon:${id}`];
    if (state?.caught) nationalCaught += 1;
    if (id > AVAILABLE_SPECIES) continue;
    if (state?.seen) seen += 1;
    if (state?.caught) caught += 1;
  }
  const fusionsCaught = Object.entries(dex).filter(([key, state]) => key.startsWith("fusion:") && state.caught).length;
  const generalTotal = NATIONAL_SPECIES + (window.FUSIONDEX_DATA ?? []).length;
  const generalPercent = ((nationalCaught + fusionsCaught) / generalTotal) * 100;
  const nextMilestone = [5, 10, 25, 50, 75, 100].find((percent) => generalPercent < percent);

  let levelCap = 15;
  let badges = 0;
  for (const region of window.GYM_REGIONS ?? []) {
    for (const battle of region.battles) {
      const done = gyms[`${region.id}:${battle.kind}:${slug(battle.name)}`];
      if (!done) continue;
      if (battle.kind === "leader") badges += 1;
      if (battle.capAfter) levelCap = Math.max(levelCap, battle.capAfter);
    }
  }

  const tiles = [
    { label: "Capturados", value: caught, detail: `de ${AVAILABLE_SPECIES} disponibles`, percent: (caught / AVAILABLE_SPECIES) * 100, icon: "items/poke-ball", color: "#43db95", href: "pokedex.html" },
    { label: "Vistos", value: seen, detail: `de ${AVAILABLE_SPECIES} disponibles`, percent: (seen / AVAILABLE_SPECIES) * 100, icon: "items/town-map", color: "#4bb6ff", href: "pokedex.html" },
    { label: "Pokédex General", value: `${Number(generalPercent.toFixed(1)).toLocaleString("es")} %`, detail: nextMilestone ? `Próxima recompensa al ${nextMilestone} %` : "¡Todas las recompensas!", percent: generalPercent, icon: "items/coupon-1", color: "#5ee1ff", href: "dexrewards.html" },
    { label: "Level cap", value: levelCap, detail: `${badges} ${badges === 1 ? "medalla" : "medallas"} marcadas`, percent: (badges / 32) * 100, icon: "badges/1", color: "#ffd442", href: "gimnasios.html" },
  ];
  document.querySelector("#home-progress").innerHTML = tiles.map((tile) => `<a class="home-stat" href="${tile.href}" style="--stat-color:${tile.color}">
      <img src="${SPRITE_BASE}/${tile.icon}.png" alt="" loading="lazy">
      <span class="home-stat-label">${tile.label}</span>
      <strong>${tile.value}</strong>
      <small>${tile.detail}</small>
      <i><b style="width:${Math.min(100, tile.percent)}%"></b></i>
    </a>`).join("");
}

// Portapapeles moderno y, si el navegador lo bloquea, el método clásico con un campo temporal.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  }
}

// Copiar la IP del servidor.
document.querySelectorAll("[data-copy-ip]").forEach((button) => button.addEventListener("click", async () => {
  const label = button.querySelector("span");
  const original = label.textContent;
  label.textContent = (await copyText("mc.diosesmon.net")) ? "¡Copiada!" : "Cópiala a mano";
  button.classList.add("is-copied");
  setTimeout(() => {
    label.textContent = original;
    button.classList.remove("is-copied");
  }, 1800);
}));

window.addEventListener("storage", (event) => {
  if (event.key === POKEDEX_KEY || event.key === GYMS_KEY) renderProgress();
});

renderCards();
renderProgress();
