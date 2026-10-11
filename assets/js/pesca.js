// Pesca: cebos con sus efectos, Pokémon que se pescan, tesoros y Poké Cañas (datos en data/pesca-data.js).
(function renderFishing() {
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const RARITY = { common: "Común", uncommon: "Poco común", rare: "Raro", "ultra-rare": "Ultra raro" };
  const RARITY_ORDER = ["common", "uncommon", "rare", "ultra-rare"];
  const CATEGORY_COLORS = {
    "Pican antes": "#4bb6ff", Naturaleza: "#b38cff", IVs: "#6cf0b2", EVs: "#ff8a3d", "Grupo huevo": "#ff6fb1", Tipo: "#ffd442",
    Shiny: "#fff27a", Rareza: "#c9a6ff", Nivel: "#86cfff", "Habilidad oculta": "#ff9fb2", Sexo: "#ffb3d6", Amistad: "#a7db8d",
    "Solo Pokémon": "#5ee1ff", Objeto: "#e8c45a",
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const normalize = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const baits = window.FISHING_BAITS ?? [];
  const fish = window.FISHING_POKEMON ?? [];

  // --- Cebos ---
  const baitState = { category: null, query: "" };
  const categories = [...new Set(baits.flatMap((bait) => bait.effects.map((effect) => effect.category)))];
  const baitFilter = document.getElementById("bait-filter");
  baitFilter.innerHTML = `<button class="guide-chip" type="button" data-category="" aria-pressed="true">Todos</button>${categories.map((category) => `<button class="guide-chip bait-chip" type="button" data-category="${category}" aria-pressed="false" style="--chip-color:${CATEGORY_COLORS[category] ?? "#9fb0cc"}">${category}</button>`).join("")}`;
  const baitGrid = document.getElementById("bait-grid");
  function renderBaits() {
    const query = normalize(baitState.query);
    const list = baits.filter((bait) => (!baitState.category || bait.effects.some((effect) => effect.category === baitState.category))
      && (!query || normalize(bait.name).includes(query) || bait.effects.some((effect) => normalize(effect.text).includes(query))));
    baitGrid.innerHTML = list.map((bait) => `
      <article class="bait-card${bait.fruit ? " is-fruit" : ""}">
        <span class="bait-icon"><img src="${bait.icon}" alt="" width="40" height="40" loading="lazy"></span>
        <div>
          <strong>${escapeHtml(bait.name)}</strong>
          <ul>${bait.effects.map((effect) => `<li><b style="--chip-color:${CATEGORY_COLORS[effect.category] ?? "#9fb0cc"}">${effect.category}</b>${escapeHtml(effect.text)}</li>`).join("")}</ul>
        </div>
      </article>`).join("") || '<p class="guide-empty">Ningún cebo coincide con el filtro.</p>';
    baitFilter.querySelectorAll("[data-category]").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.category === (baitState.category ?? ""))));
    document.getElementById("bait-count").textContent = `${list.length} cebos`;
  }
  baitFilter.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-category]");
    if (!chip) return;
    baitState.category = chip.dataset.category || null;
    renderBaits();
  });
  document.getElementById("bait-search").addEventListener("input", (event) => { baitState.query = event.target.value; renderBaits(); });
  renderBaits();

  // --- Pokémon que se pescan ---
  const fishState = { rarity: null, lure: false, query: "" };
  const fishFilter = document.getElementById("fish-filter");
  fishFilter.innerHTML = `<button class="guide-chip" type="button" data-rarity="" aria-pressed="true">Todos</button>${RARITY_ORDER.map((rarity) => `<button class="guide-chip" type="button" data-rarity="${rarity}" aria-pressed="false">${RARITY[rarity]}</button>`).join("")}`;
  const fishGrid = document.getElementById("fish-grid");
  const rarityTag = (rarity) => `<b class="rarity-${rarity}">${RARITY[rarity]}</b>`;
  function renderFish() {
    const query = normalize(fishState.query);
    const list = fish.filter((entry) => (!fishState.rarity || entry.rarity === fishState.rarity || entry.plain === fishState.rarity || entry.lured === fishState.rarity)
      && (!fishState.lure || entry.lure > 0)
      && (!query || normalize(entry.name).includes(query) || entry.places.some((place) => normalize(place).includes(query))))
      .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || a.id - b.id);
    fishGrid.innerHTML = list.map((entry) => `
      <a class="fish-card" href="pokedex.html#pokemon/${entry.id}">
        <img src="${SPRITES}/${entry.id}.png" alt="" width="72" height="72" loading="lazy">
        <div class="fish-body">
          <strong>${escapeHtml(entry.name)} <small>#${String(entry.id).padStart(3, "0")}</small></strong>
          <span class="fish-types">${entry.types.map((type) => typeChip(type)).join("")}</span>
          <span class="fish-rarity">${entry.plain ? rarityTag(entry.plain) : '<em>Solo con Atracción</em>'}${entry.lure ? ` <span class="fish-lure" title="Con Atracción ${entry.lure} o más">Atracción ${"I".repeat(entry.lure)}+: ${rarityTag(entry.lured)}</span>` : ""} · Nv. ${entry.level}</span>
          <span class="ev-places">${entry.places.slice(0, 4).map((place) => `<i>${escapeHtml(place)}</i>`).join("")}${entry.places.length > 4 ? `<i>+${entry.places.length - 4}</i>` : ""}</span>
          ${entry.notes.length ? `<span class="ev-notes">${entry.notes.map(escapeHtml).join(" · ")}</span>` : ""}
        </div>
      </a>`).join("") || '<p class="guide-empty">Ningún Pokémon coincide con el filtro.</p>';
    fishFilter.querySelectorAll("[data-rarity]").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.rarity === (fishState.rarity ?? ""))));
    document.getElementById("fish-count").textContent = `${list.length} Pokémon`;
  }
  fishFilter.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-rarity]");
    if (!chip) return;
    fishState.rarity = chip.dataset.rarity || null;
    renderFish();
  });
  document.getElementById("fish-lure").addEventListener("change", (event) => { fishState.lure = event.target.checked; renderFish(); });
  document.getElementById("fish-search").addEventListener("input", (event) => { fishState.query = event.target.value; renderFish(); });
  renderFish();

  // --- Tesoros y cañas ---
  document.getElementById("fish-treasure").innerHTML = (window.FISHING_TREASURE ?? []).map((item) => `
    <li><span class="bait-icon"><img src="${item.icon}" alt="" width="36" height="36"></span>${escapeHtml(item.name)}</li>`).join("");
  document.getElementById("fish-rods").innerHTML = (window.FISHING_RODS ?? []).map((rod) => `
    <li title="Poké Caña con ${escapeHtml(rod.ball)}"><img src="${rod.icon}" alt="" width="40" height="40" loading="lazy"><span>${escapeHtml(rod.ball)}</span></li>`).join("");
})();
