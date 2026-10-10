// Fósiles: guía de reanimación, fósiles revivibles y yacimientos (datos en data/fosiles-data.js).
(function renderFossils() {
  const POKEMON_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const GENERATION_REGIONS = { 1: "Kanto", 2: "Johto", 3: "Hoenn", 4: "Sinnoh", 5: "Teselia", 6: "Kalos", 7: "Alola", 8: "Galar" };
  const LAYERS = [
    { key: "all", label: "Todos" },
    { key: "surface", label: "Superficie", icon: "assets/img/items/minecraft/suspicious_gravel.png" },
    { key: "cave", label: "Cuevas", icon: "assets/img/items/cobblemon/damp_rock.png" },
    { key: "ocean", label: "Fondo marino", icon: "assets/img/items/minecraft/suspicious_sand.png" },
  ];
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const fossilById = Object.fromEntries(window.FOSSILS.map((fossil) => [fossil.id, fossil]));
  const siteById = Object.fromEntries(window.FOSSIL_SITES.map((site) => [site.id, site]));
  const icons = window.FOSSIL_GUIDE_ICONS;

  // Pasos para revivir un fósil.
  const steps = [
    {
      icon: icons.suspicious_gravel, title: "Encuentra un yacimiento",
      text: "Busca los <strong>yacimientos prehistóricos</strong> de la lista de abajo: árboles caídos, pilares, estanques helados, fumarolas en el fondo del mar… Cada uno esconde bloques de <strong>arena o grava sospechosa</strong>.",
    },
    {
      icon: icons.brush, title: "Límpialo con un pincel",
      text: "Fabrica un <strong>Pincel</strong> (pluma, lingote de cobre y palo) y mantén clic derecho sobre el bloque sospechoso. <em>Si lo rompes con otra herramienta, pierdes lo que guarda.</em>",
    },
    {
      icon: "assets/img/items/cobblemon/helix_fossil.png", title: "Monta la Máquina Restauradora",
      text: "Necesitas tres bloques. Pon el <strong>Monitor de Datos</strong> encima del <strong>Analizador de Fósiles</strong> y el <strong>Tanque de Restauración</strong> a su lado: oirás un zumbido eléctrico cuando quede montada.",
      parts: [
        ["Analizador de Fósiles", "4 pizarra profunda labrada, 2 lingotes de hierro, 1 fragmento de amatista, 1 vidrio y 1 polvo de redstone"],
        ["Tanque de Restauración", "3 lingotes de hierro, 4 vidrios, 1 Revivir y 1 compostador"],
        ["Monitor de Datos", "5 lingotes de hierro, 2 lingotes de cobre, 1 vidrio y 1 antorcha de redstone"],
      ],
    },
    {
      icon: "assets/img/items/cobblemon/vivichoke_seeds.png", title: "Llena el tanque y espera",
      text: "Echa <strong>materia orgánica</strong> al tanque hasta sumar <strong>64 puntos</strong> (semillas 1, bayas 2, pan 4, Raíz Energía 4, hierbas 8…) y mete el fósil en el analizador. En <strong>12 minutos</strong> el embrión estará listo: haz clic derecho en el tanque con una <strong>Poké Ball</strong> en la mano para quedártelo. Mientras tanto, nadie más puede reclamarlo.",
    },
  ];
  document.getElementById("fossil-steps").innerHTML = steps.map((step, index) => `
    <li class="guide-step">
      <span class="guide-step-num">${index + 1}</span>
      <img class="guide-step-icon" src="${step.icon}" alt="" width="48" height="48">
      <h3>${step.title}</h3>
      <p>${step.text}</p>
      ${step.parts ? `<ul class="guide-parts">${step.parts.map(([name, recipe]) => `<li><strong>${name}</strong><span>${recipe}</span></li>`).join("")}</ul>` : ""}
    </li>`).join("");

  const siteChip = (siteId, guaranteed) => `<button class="site-chip${guaranteed ? " is-guaranteed" : ""}" type="button" data-site="${siteId}">${guaranteed ? '<span class="guide-star" aria-label="garantizado">★</span>' : ""}${escapeHtml(siteById[siteId].name.replace(/ prehistóric[oa]s?$/, ""))}</button>`;

  const fossilCard = (fossil) => {
    const pokemon = fossil.pokemon[0];
    return `
      <article class="fossil-card" id="fosil-${fossil.id}" style="--type-color:${TYPE_COLORS[pokemon.types[0]]}">
        <div class="fossil-revive">
          <span class="fossil-item"><img src="${fossil.icon}" alt="" width="48" height="48"></span>
          <span class="fossil-arrow" aria-hidden="true">➜</span>
          <a class="fossil-mon" href="pokedex.html#pokemon/${pokemon.id}" title="Ver ${escapeHtml(pokemon.name)} en la Pokédex"><img src="${POKEMON_SPRITES}/${pokemon.id}.png" alt="" width="96" height="96" loading="lazy"></a>
        </div>
        <div class="fossil-info">
          <h3>${escapeHtml(fossil.name)}</h3>
          <p class="fossil-result">Revive a <a href="pokedex.html#pokemon/${pokemon.id}">${escapeHtml(pokemon.name)}</a> <small>#${String(pokemon.id).padStart(3, "0")} · ${GENERATION_REGIONS[pokemon.generation]}</small></p>
          <div class="fossil-types">${pokemon.types.map((type) => typeChip(type)).join("")}</div>
        </div>
        <div class="fossil-where">
          <span>Dónde buscarlo</span>
          <div class="site-chips">${fossil.guaranteed.map((site) => siteChip(site, true)).join("")}${fossil.possible.map((site) => siteChip(site, false)).join("")}</div>
        </div>
      </article>`;
  };

  document.getElementById("fossil-available").innerHTML = window.FOSSILS.filter((fossil) => fossil.available).map(fossilCard).join("");
  document.getElementById("fossil-locked").innerHTML = window.FOSSILS.filter((fossil) => !fossil.available).map((fossil) => `
    <div class="fossil-off" id="fosil-${fossil.id}">
      <img src="${fossil.icon}" alt="" width="36" height="36">
      <div><strong>${escapeHtml(fossil.name)}</strong><small>${fossil.pokemon.map((pokemon) => escapeHtml(pokemon.name)).join(" / ")} · Gen ${fossil.pokemon[0].generation}${fossil.galar ? " · se combina con otro fósil" : ""}</small></div>
      <span class="fossil-off-tag">No revivible</span>
    </div>`).join("");

  // Yacimientos con filtros.
  const state = { layer: "all", fossil: "" };
  const layerFilter = document.getElementById("site-layer-filter");
  const fossilFilter = document.getElementById("site-fossil-filter");
  layerFilter.innerHTML = LAYERS.map((layer) => `<button class="guide-chip" type="button" data-layer="${layer.key}" aria-pressed="${layer.key === state.layer}">${layer.icon ? `<img src="${layer.icon}" alt="" width="20" height="20">` : ""}${layer.label}</button>`).join("");
  fossilFilter.innerHTML = `<option value="">Todos los fósiles</option>
    <optgroup label="Revivibles">${window.FOSSILS.filter((fossil) => fossil.available).map((fossil) => `<option value="${fossil.id}">${escapeHtml(fossil.name)} (${escapeHtml(fossil.pokemon[0].name)})</option>`).join("")}</optgroup>
    <optgroup label="No revivibles">${window.FOSSILS.filter((fossil) => !fossil.available).map((fossil) => `<option value="${fossil.id}">${escapeHtml(fossil.name)}</option>`).join("")}</optgroup>`;

  const fossilBadge = (fossilId, site) => {
    const fossil = fossilById[fossilId];
    const guaranteed = site.guaranteed.includes(fossilId);
    return `<li class="site-fossil${fossil.available ? "" : " is-off"}${guaranteed ? " is-guaranteed" : ""}" title="${escapeHtml(fossil.name)}${fossil.available ? ` → ${escapeHtml(fossil.pokemon[0].name)}` : " (no revivible)"}${guaranteed ? " · garantizado" : ""}">
      <img src="${fossil.icon}" alt="" width="28" height="28">${guaranteed ? '<span class="guide-star" aria-hidden="true">★</span>' : ""}
      <span>${fossil.available ? escapeHtml(fossil.pokemon[0].name) : escapeHtml(fossil.name)}</span>
    </li>`;
  };

  const lootTable = (site) => {
    const totals = {};
    site.loot.forEach((entry) => { totals[entry.rarity] = (totals[entry.rarity] ?? 0) + entry.weight; });
    return `<table class="site-loot">
      <thead><tr><th>Objeto</th><th>Tabla</th><th>Prob.</th></tr></thead>
      <tbody>${site.loot.map((entry) => `<tr class="${entry.fossil ? `is-fossil${fossilById[entry.fossil].available ? "" : " is-off"}` : ""}">
        <td>${entry.icon ? `<img src="${entry.icon}" alt="" width="24" height="24">` : ""}${escapeHtml(entry.name)}</td>
        <td>${entry.rarity}</td>
        <td>${Math.round((entry.weight / totals[entry.rarity]) * 100)}%</td>
      </tr>`).join("")}</tbody>
    </table>`;
  };

  const siteCard = (site) => {
    const fossils = [...new Set([...site.guaranteed, ...site.fossils])];
    return `
      <article class="site-card theme-${site.theme}" id="yacimiento-${site.id}">
        <button class="site-render" type="button" data-zoom="${site.id}" aria-label="Ver en grande: ${escapeHtml(site.name)}">
          <img src="assets/img/fosiles/${site.id}.webp" alt="Estructura: ${escapeHtml(site.name)}" width="480" height="480" loading="lazy">
        </button>
        <header>
          <span class="site-layer">${escapeHtml(site.layer)}</span>
          <h3>${escapeHtml(site.name)}</h3>
          <p class="site-biome"><img src="assets/img/items/minecraft/${site.theme === "ocean" || site.loot.some((entry) => entry.name === "Arena sospechosa") ? "suspicious_sand" : "suspicious_gravel"}.png" alt="" width="18" height="18">${escapeHtml(site.biome)}</p>
        </header>
        <p class="site-desc">${escapeHtml(site.description)}</p>
        <ul class="site-fossils">${fossils.map((fossilId) => fossilBadge(fossilId, site)).join("")}</ul>
        <details class="site-more">
          <summary>Ver todo el botín (${site.loot.length})</summary>
          ${lootTable(site)}
          <p class="site-note">Además del fósil garantizado, cada bloque sospechoso sale de una de las dos tablas. La probabilidad es dentro de su tabla.</p>
        </details>
      </article>`;
  };

  const grid = document.getElementById("site-grid");
  const empty = document.getElementById("site-empty");
  function renderSites() {
    const sites = window.FOSSIL_SITES.filter((site) => (state.layer === "all" || site.theme === state.layer)
      && (!state.fossil || site.guaranteed.includes(state.fossil) || site.fossils.includes(state.fossil)));
    // Con un fósil elegido, primero los yacimientos que lo garantizan.
    if (state.fossil) sites.sort((a, b) => b.guaranteed.includes(state.fossil) - a.guaranteed.includes(state.fossil));
    grid.innerHTML = sites.map(siteCard).join("");
    empty.hidden = sites.length > 0;
    layerFilter.querySelectorAll("[data-layer]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.layer === state.layer)));
  }
  layerFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layer]");
    if (!button) return;
    state.layer = button.dataset.layer;
    renderSites();
  });
  fossilFilter.addEventListener("change", () => { state.fossil = fossilFilter.value; renderSites(); });

  // Pulsar un yacimiento en una tarjeta de fósil: limpia filtros, baja hasta él y lo resalta.
  document.addEventListener("click", (event) => {
    const chip = event.target.closest(".site-chip[data-site]");
    if (!chip) return;
    state.layer = "all";
    state.fossil = "";
    fossilFilter.value = "";
    renderSites();
    const card = document.getElementById(`yacimiento-${chip.dataset.site}`);
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("is-flash");
    void card.offsetWidth;
    card.classList.add("is-flash");
  });

  // Ver la estructura en grande.
  const viewer = document.getElementById("site-viewer");
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zoom]");
    if (!button) return;
    const site = siteById[button.dataset.zoom];
    viewer.querySelector("img").src = `assets/img/fosiles/${site.id}.webp`;
    viewer.querySelector("img").alt = `Estructura: ${site.name}`;
    viewer.querySelector("h3").textContent = site.name;
    viewer.querySelector("p").textContent = site.biome;
    viewer.className = `site-viewer theme-${site.theme}`;
    viewer.showModal();
  });
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer || event.target.closest("[data-close]")) viewer.close();
  });

  renderSites();
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView();
})();
