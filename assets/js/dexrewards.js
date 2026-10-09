// DexRewards: progreso por sección calculado con las capturas marcadas en la Pokédex de la wiki.
const PROGRESS_KEY = "wiki-diosesmon-pokedex-state-v1";
const AVAILABLE_THROUGH = 493;
const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const sections = (window.DEXREWARDS ?? []).map((section) => ({
  ...section,
  milestones: section.milestones.map((milestone) => typeof milestone === "number" ? { percent: milestone, rewards: [] } : milestone),
}));
const fusionCount = (window.FUSIONDEX_DATA ?? []).length;
const list = document.querySelector("#dr-list");
const detail = document.querySelector("#dr-detail");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

// Igual que el juego: cada especie nacional cuenta una vez; las formas regionales no suman aparte.
function sectionProgress(section, progress) {
  if (section.shiny) return null;
  const [start, end] = section.range;
  let caught = 0;
  for (let id = start; id <= end; id += 1) if (progress[`pokemon:${id}`]?.caught) caught += 1;
  let total = end - start + 1;
  if (section.includeFusions) {
    total += fusionCount;
    caught += Object.entries(progress).filter(([key, state]) => key.startsWith("fusion:") && state.caught).length;
  }
  return { caught, total, percent: total ? (caught / total) * 100 : 0 };
}

function formatPercent(value) {
  return `${Number(value.toFixed(1)).toLocaleString("es")} %`;
}

function sectionAvailable(section) {
  return section.shiny || section.range[0] <= AVAILABLE_THROUGH;
}

function renderList(currentId, progress) {
  list.innerHTML = sections.map((section) => {
    const stats = sectionProgress(section, progress);
    const meta = stats ? `${stats.caught}/${stats.total} · ${formatPercent(stats.percent)}` : "Próximamente";
    return `<button class="dr-item${section.id === currentId ? " is-active" : ""}" type="button" data-section="${section.id}" style="--section-color:${section.color}" aria-current="${section.id === currentId}">
      <span class="dr-item-art"><img src="${SPRITES}/${section.shiny ? "shiny/" : ""}${section.sprite}.png" alt="" loading="lazy"></span>
      <span class="dr-item-text">
        <strong>${escapeHtml(section.title)}</strong>
        <small>${meta}${sectionAvailable(section) ? "" : ' · <em>Región no activa</em>'}</small>
        <i class="dr-item-bar"><b style="width:${stats ? Math.min(100, stats.percent) : 0}%"></b></i>
      </span>
    </button>`;
  }).join("");
}

function renderMilestone(section, milestone, stats) {
  const required = stats ? Math.ceil((stats.total * milestone.percent) / 100) : null;
  const reached = stats ? stats.percent >= milestone.percent : false;
  const missing = stats ? Math.max(0, required - stats.caught) : null;
  const rewards = milestone.rewards.length
    ? `<ul class="dr-rewards">${milestone.rewards.map((reward) => `<li><img src="${rewardIcon(reward)}" alt="" width="30" height="30">${escapeHtml(reward)}</li>`).join("")}</ul>`
    : '<p class="dr-reward-pending">Recompensa por confirmar</p>';
  const status = reached
    ? '<span class="dr-status is-ready">Lista para reclamar</span>'
    : `<span class="dr-status">Bloqueada${missing !== null ? `<small>Faltan ${missing}</small>` : ""}</span>`;
  return `<li class="dr-milestone${reached ? " is-reached" : ""}" style="--milestone-color:${milestoneColor(milestone.percent)}">
    <div class="dr-milestone-head">
      <div>
        <h4>${milestone.percent}% completado</h4>
        <p>Requiere ${milestone.percent}%${required !== null ? ` · ${required} capturas` : ""}</p>
      </div>
      ${status}
    </div>
    ${rewards}
  </li>`;
}

function milestoneColor(percent) {
  if (percent >= 100) return "#ff6fb1";
  if (percent >= 75) return "#b38cff";
  if (percent >= 50) return "#ffa64d";
  if (percent >= 25) return "#ffd442";
  return "#6cf0b2";
}

function renderDetail(section, progress) {
  const stats = sectionProgress(section, progress);
  const percent = stats ? Math.min(100, stats.percent) : 0;
  const description = section.description ?? `Recompensas por capturar los Pokémon de ${section.title.split("– ")[1] ?? section.title}.`;
  const milestones = section.milestones.length
    ? `<ol class="dr-milestones">${section.milestones.map((milestone) => renderMilestone(section, milestone, stats)).join("")}</ol>`
    : '<p class="dr-empty">Los hitos de esta sección se publicarán pronto.</p>';
  const pokedexLink = section.range && !section.includeFusions
    ? `pokedex.html?region=${encodeURIComponent(section.title.split("– ")[1] ?? "")}`
    : "pokedex.html";
  detail.style.setProperty("--section-color", section.color);
  detail.innerHTML = `<header class="dr-detail-head">
      <div>
        <h3>${escapeHtml(section.title)}</h3>
        <p class="dr-count">${stats ? `${stats.caught} / ${stats.total} capturados` : "Progreso shiny no registrado en la wiki"}</p>
        <p class="dr-description">${escapeHtml(description)}</p>
        ${sectionAvailable(section) ? "" : '<p class="dr-warning">Esta región aún no está activa en el servidor: por ahora no se pueden capturar sus Pokémon.</p>'}
        ${stats ? `<a class="dr-link" href="${pokedexLink}">Marcar capturas en la Pokédex →</a>` : ""}
      </div>
      <div class="dr-ring" style="--percent:${percent}" role="img" aria-label="${stats ? formatPercent(stats.percent) : "Sin datos"} completado"><span>${stats ? formatPercent(stats.percent) : "—"}</span></div>
    </header>
    ${milestones}`;
}

function currentSection() {
  const id = location.hash.slice(1);
  return sections.find((section) => section.id === id) ?? sections[0];
}

function render() {
  const progress = loadProgress();
  const section = currentSection();
  renderList(section.id, progress);
  renderDetail(section, progress);
  // En móvil la lista es un carrusel: se lleva la sección elegida a la vista.
  const active = list.querySelector(".dr-item.is-active");
  if (active && list.scrollWidth > list.clientWidth) list.scrollLeft = active.offsetLeft - list.offsetLeft;
}

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-section]");
  if (!button) return;
  history.replaceState(null, "", `#${button.dataset.section}`);
  render();
  if (matchMedia("(max-width: 860px)").matches) detail.scrollIntoView({ behavior: "smooth", block: "start" });
});
window.addEventListener("hashchange", render);
// Si se marcan capturas en otra pestaña con la Pokédex abierta, se actualiza solo.
window.addEventListener("storage", (event) => {
  if (event.key === PROGRESS_KEY) render();
});

render();
