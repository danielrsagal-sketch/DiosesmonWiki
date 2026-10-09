const fusions = window.FUSIONDEX_DATA ?? [];
const statLabels = [
  ["hp", "PS"],
  ["attack", "Ataque"],
  ["defense", "Defensa"],
  ["specialAttack", "At. Esp."],
  ["specialDefense", "Def. Esp."],
  ["speed", "Velocidad"],
];
const statMaximum = 180;
const typeFilter = document.querySelector("#type-filter");
const sortSelect = document.querySelector("#sort-select");
const searchInput = document.querySelector("#search-input");
const moveSearch = document.querySelector("#move-search");
const profile = document.querySelector("#profile");
const catalogGrid = document.querySelector("#catalog-grid");
const movesContent = document.querySelector("#moves-content");
const emptyState = document.querySelector("#empty-state");
let selectedFusion = fusions[0];
let activeMoveKind = "level";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function slug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function typeChip(type) {
  return `<span class="type-chip type-${slug(type)}">${escapeHtml(type)}</span>`;
}

function renderProfile() {
  if (!selectedFusion) return;
  const fusion = selectedFusion;
  const statRows = statLabels.map(([key, label]) => {
    const value = fusion.stats[key];
    const width = Math.min(100, (value / statMaximum) * 100);
    return `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${value}</span><span class="stat-track"><span class="stat-fill" style="--stat-width:${width}%"></span></span></div>`;
  }).join("");
  const abilities = fusion.abilities.map((ability) => `<span class="ability">${escapeHtml(ability)}</span>`).join("");
  const shinyStatus = fusion.shinyAvailable
    ? `<div class="shiny-status is-available"><span>SHINY</span><strong>Disponible</strong></div>`
    : `<div class="shiny-status is-unavailable"><span>SHINY</span><strong>No disponible por el momento</strong></div>`;

  profile.innerHTML = `
    <div class="specimen">
      <div class="specimen-head"><span>ILUSTRACIÓN DE CAMPO</span><strong>F-${String(fusion.number).padStart(4, "0")}</strong></div>
      <figure class="art-frame">
        <img src="${escapeHtml(fusion.image)}" alt="Ilustración de ${escapeHtml(fusion.name)}" fetchpriority="high">
        <figcaption class="art-label">ARCHIVO VISUAL · ORIGINAL</figcaption>
      </figure>
      <div class="art-caption"><span>REGISTRO DE ESPECIE</span><strong>N.º ${String(fusion.number).padStart(4, "0")}</strong></div>
    </div>
    <article class="details">
      <div class="detail-topline"><span>FUSIÓN REGISTRADA</span><span class="dex-number">#${fusion.number}</span></div>
      <div class="name-row"><h2>${escapeHtml(fusion.name)}</h2><div class="type-list">${fusion.types.map(typeChip).join("")}</div></div>
      ${shinyStatus}
      <p class="bio-line">Una combinación excepcional del servidor.</p>
      <div class="measurements"><div class="measurement"><span>Altura</span><strong>${(fusion.height / 10).toFixed(1)} m</strong></div><div class="measurement"><span>Peso</span><strong>${(fusion.weight / 10).toFixed(1)} kg</strong></div></div>
      <div class="stats-heading"><h3>ESTADÍSTICAS BASE</h3><span class="stat-total">${fusion.total} <small>TOTAL</small></span></div>
      <div class="stat-list">${statRows}</div>
      <div class="abilities"><p class="ability-heading">HABILIDADES</p><div class="ability-list">${abilities}</div></div>
    </article>`;

  document.querySelector("#level-count").textContent = fusion.movesByLevel.length;
  document.querySelector("#tm-count").textContent = fusion.movesByTm.length;
  renderMoves();
}

function visibleFusions() {
  const term = searchInput.value.trim().toLocaleLowerCase("es");
  const chosenType = typeFilter.value;
  const result = fusions.filter((fusion) => {
    const matchesTerm = !term || [fusion.name, fusion.number, ...fusion.types, ...fusion.abilities]
      .join(" ").toLocaleLowerCase("es").includes(term);
    return matchesTerm && (!chosenType || fusion.types.includes(chosenType));
  });

  return result.sort((first, second) => {
    if (sortSelect.value === "total") return second.total - first.total;
    if (sortSelect.value === "name") return first.name.localeCompare(second.name, "es");
    return first.number - second.number;
  });
}

function renderCatalog() {
  const visible = visibleFusions();
  document.querySelector("#results-count").textContent = `${visible.length} ${visible.length === 1 ? "fusión" : "fusiones"}`;
  emptyState.hidden = visible.length > 0;
  catalogGrid.innerHTML = visible.map((fusion) => `
    <button class="fusion-card${fusion === selectedFusion ? " is-selected" : ""}" type="button" data-number="${fusion.number}" aria-current="${fusion === selectedFusion ? "true" : "false"}">
      <span class="card-art"><img src="${escapeHtml(fusion.image)}" alt="" loading="lazy">${fusion.shinyAvailable ? `<span class="shiny-star" title="Shiny disponible" aria-label="Shiny disponible">&#9733;</span>` : ""}</span>
      <span class="card-copy"><span class="card-number">#${fusion.number}</span><strong class="card-name">${escapeHtml(fusion.name)}</strong><span class="card-types">${fusion.types.map(typeChip).join("")}</span><span class="card-shiny ${fusion.shinyAvailable ? "is-available" : "is-unavailable"}">${fusion.shinyAvailable ? "Shiny disponible" : "Sin Shiny por ahora"}</span></span>
      <span class="card-total">${fusion.total}</span>
    </button>`).join("");
}

function renderMoves() {
  if (!selectedFusion) return;
  const term = moveSearch.value.trim().toLocaleLowerCase("es");
  if (activeMoveKind === "level") {
    const moves = selectedFusion.movesByLevel.filter((move) => move.name.toLocaleLowerCase("es").includes(term));
    movesContent.innerHTML = moves.length
      ? `<div class="level-move-list">${moves.map((move) => `<span class="level-move"><span class="level-pill">${move.level}</span><span>${escapeHtml(move.name)}</span></span>`).join("")}</div>`
      : `<p class="no-moves">No hay movimientos por nivel con ese nombre.</p>`;
  } else {
    const moves = selectedFusion.movesByTm.filter((move) => move.toLocaleLowerCase("es").includes(term));
    movesContent.innerHTML = moves.length
      ? `<div class="tm-list">${moves.map((move) => `<span class="tm-move">${escapeHtml(move)}</span>`).join("")}</div>`
      : `<p class="no-moves">No hay movimientos por MT con ese nombre.</p>`;
  }
}

function selectFusion(fusion, updateHash = true) {
  selectedFusion = fusion;
  renderProfile();
  renderCatalog();
  if (updateHash) history.replaceState(null, "", `#${slug(fusion.name)}`);
}

const allTypes = [...new Set(fusions.flatMap((fusion) => fusion.types))].sort((a, b) => a.localeCompare(b, "es"));
for (const type of allTypes) {
  const option = document.createElement("option");
  option.value = type;
  option.textContent = type;
  typeFilter.append(option);
}
document.querySelector("#fusion-total").textContent = String(fusions.length).padStart(2, "0");

searchInput.addEventListener("input", renderCatalog);
typeFilter.addEventListener("change", renderCatalog);
sortSelect.addEventListener("change", renderCatalog);
moveSearch.addEventListener("input", renderMoves);
catalogGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-number]");
  if (!card) return;
  const fusion = fusions.find((item) => String(item.number) === card.dataset.number);
  if (fusion) selectFusion(fusion);
});
document.querySelector("#reset-button").addEventListener("click", () => {
  searchInput.value = "";
  typeFilter.value = "";
  sortSelect.value = "number";
  renderCatalog();
  searchInput.focus();
});
document.querySelectorAll(".move-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeMoveKind = tab.dataset.kind;
    document.querySelectorAll(".move-tab").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    renderMoves();
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

const initialSlug = location.hash.slice(1);
const initialFusion = fusions.find((fusion) => slug(fusion.name) === initialSlug);
if (initialFusion) selectedFusion = initialFusion;
renderProfile();
renderCatalog();