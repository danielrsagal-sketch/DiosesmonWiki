// Pokémon de cada zona del Safari (data/safari-pokemon.js) con filtro por grupo huevo, para ir a por breeders.
(function renderSafariPokemon() {
  const zones = window.SAFARI_POKEMON ?? [];
  const species = Object.fromEntries((window.BREEDING_SPECIES ?? []).map((entry) => [entry.id, entry]));
  const root = document.getElementById("sp-zones");
  if (!root || !zones.length) return;
  const tabs = document.getElementById("sp-tabs");
  const eggSelect = document.getElementById("sp-egg");
  const search = document.getElementById("sp-search");
  const count = document.getElementById("sp-count");
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const fold = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const typeChip = window.typeChip ?? ((type) => `<span class="sp-type">${escapeHtml(type)}</span>`);
  let active = "todas";

  const eggGroups = [...new Set(zones.flatMap((zone) => zone.pokemon.flatMap(({ id }) => species[id]?.egg ?? [])))].sort((a, b) => a.localeCompare(b, "es"));
  eggSelect.innerHTML = `<option value="">Todos los grupos huevo</option>${eggGroups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("")}`;
  tabs.innerHTML = [`<button class="sp-tab" type="button" data-zone="todas" aria-pressed="true">Todas</button>`,
    ...zones.map((zone) => `<button class="sp-tab" type="button" data-zone="${zone.id}" aria-pressed="false" style="--zone-color:${zone.color}">${escapeHtml(zone.name)}</button>`)].join("");

  const card = ({ id, rare, family }) => {
    const entry = species[id];
    if (!entry) return "";
    const noBreed = entry.egg.includes("Desconocido");
    return `<a class="sp-mon${rare ? " is-rare" : ""}" href="pokedex.html#pokemon/${id}" title="${family ? "Aparece por su familia evolutiva" : "Visto en esta zona"}">
      ${rare ? '<span class="sp-badge">Raro</span>' : ""}
      <img src="${SPRITES}/${id}.png" alt="" width="72" height="72" loading="lazy">
      <strong>${escapeHtml(entry.name)}</strong>
      <span class="sp-types">${entry.types.map((type) => typeChip(type)).join("")}</span>
      <small class="${noBreed ? "is-off" : ""}">${noBreed ? "No cría" : entry.egg.map(escapeHtml).join(" · ")}</small>
    </a>`;
  };

  const draw = () => {
    const egg = eggSelect.value;
    const query = fold(search.value.trim());
    let total = 0;
    root.innerHTML = zones.filter((zone) => active === "todas" || zone.id === active).map((zone) => {
      const list = zone.pokemon.filter(({ id }) => {
        const entry = species[id];
        if (!entry) return false;
        if (egg && !entry.egg.includes(egg)) return false;
        return !query || fold(entry.name).includes(query);
      });
      total += list.length;
      if (!list.length) return "";
      return `<section class="sp-zone" id="pokemon-${zone.id}" style="--zone-color:${zone.color}">
        <h3>${escapeHtml(zone.name)} <span>${list.length}</span></h3>
        ${zone.note ? `<p class="sp-note">${escapeHtml(zone.note)}</p>` : ""}
        <div class="sp-grid">${list.map(card).join("")}</div>
      </section>`;
    }).join("") || '<p class="sp-empty">Ningún Pokémon coincide con el filtro.</p>';
    count.textContent = `${total} ${total === 1 ? "Pokémon" : "Pokémon"}`;
  };

  tabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zone]");
    if (!button) return;
    active = button.dataset.zone;
    tabs.querySelectorAll("[data-zone]").forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button)));
    draw();
  });
  eggSelect.addEventListener("change", draw);
  search.addEventListener("input", draw);

  // safari.html#pokemon-jardin abre esa zona; ?huevo=Hada filtra por grupo huevo (lo usa Crianza).
  const params = new URLSearchParams(location.search);
  if (params.get("huevo") && eggGroups.includes(params.get("huevo"))) eggSelect.value = params.get("huevo");
  const fromHash = location.hash.match(/^#pokemon-(\w+)/)?.[1];
  if (zones.some((zone) => zone.id === fromHash)) {
    active = fromHash;
    tabs.querySelectorAll("[data-zone]").forEach((tab) => tab.setAttribute("aria-pressed", String(tab.dataset.zone === active)));
  }
  draw();
  if (fromHash || params.get("huevo")) document.getElementById("sp-title")?.scrollIntoView({ block: "start" });
})();

// Calculadora de shiny del Safari: 1/8192 base y bonus que se suman (evento, ticket premium, armadura).
(function shinyCalculator() {
  const root = document.getElementById("sf-calc");
  if (!root) return;
  const BASE = 8192;
  const odds = document.getElementById("sf-calc-odds");
  const detail = document.getElementById("sf-calc-detail");
  const percentBox = document.getElementById("sf-calc-percent");
  const inputs = [...root.querySelectorAll("[data-boost]")];
  // El evento viene marcado mientras está activo.
  const now = Date.now();
  if (now >= Date.parse(root.dataset.eventFrom) && now < Date.parse(root.dataset.eventTo)) inputs[0].checked = true;
  const draw = () => {
    const bonus = inputs.filter((input) => input.checked).reduce((sum, input) => sum + Number(input.dataset.boost), 0);
    odds.textContent = `1/${Math.round(BASE / (1 + bonus / 100)).toLocaleString("es")}`;
    const percent = ((1 + bonus / 100) / BASE * 100).toLocaleString("es", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    percentBox.textContent = `${percent} % por Pokémon`;
    detail.textContent = bonus ? `+${bonus} % de bonus en total` : "Sin bonus";
  };
  inputs.forEach((input) => input.addEventListener("change", draw));
  draw();
})();
