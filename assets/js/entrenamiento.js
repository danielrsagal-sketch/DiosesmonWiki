// Entrenamiento EV: métodos, calculadora, recomendados y tabla (datos en data/entrenamiento-data.js).
(function renderTraining() {
  const POKEMON_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const icon = (item) => window.EV_ICONS[item];
  // Orden igual que en los datos: PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad.
  const STATS = [
    { key: "hp", label: "PS", short: "PS", color: "#ff5959", item: "power_weight", itemName: "Pesa Recia", vitamin: "hp_up", vitaminName: "Más PS", mochi: "health_mochi", mochiName: "Mochi vigor", feather: "health_feather", featherName: "Pluma vigor", berry: "pomeg_berry", berryName: "Baya Grana", mint: "white_mint_leaf", mintName: "Menta Blanca" },
    { key: "attack", label: "Ataque", short: "Atq", color: "#f5ac78", item: "power_bracer", itemName: "Brazal Recio", vitamin: "protein", vitaminName: "Proteína", mochi: "muscle_mochi", mochiName: "Mochi músculo", feather: "muscle_feather", featherName: "Pluma músculo", berry: "kelpsy_berry", berryName: "Baya Algama", mint: "red_mint_leaf", mintName: "Menta Roja" },
    { key: "defence", label: "Defensa", short: "Def", color: "#fae078", item: "power_belt", itemName: "Cinturón Recio", vitamin: "iron", vitaminName: "Hierro", mochi: "resist_mochi", mochiName: "Mochi aguante", feather: "resist_feather", featherName: "Pluma aguante", berry: "qualot_berry", berryName: "Baya Íspero", mint: "blue_mint_leaf", mintName: "Menta Azul" },
    { key: "special_attack", label: "At. Esp.", short: "AtE", color: "#9db7f5", item: "power_lens", itemName: "Lente Recia", vitamin: "calcium", vitaminName: "Calcio", mochi: "genius_mochi", mochiName: "Mochi intelecto", feather: "genius_feather", featherName: "Pluma intelecto", berry: "hondew_berry", berryName: "Baya Meluce", mint: "cyan_mint_leaf", mintName: "Menta Cian" },
    { key: "special_defence", label: "Def. Esp.", short: "DfE", color: "#a7db8d", item: "power_band", itemName: "Banda Recia", vitamin: "zinc", vitaminName: "Zinc", mochi: "clever_mochi", mochiName: "Mochi mente", feather: "clever_feather", featherName: "Pluma mente", berry: "grepa_berry", berryName: "Baya Uvav", mint: "pink_mint_leaf", mintName: "Menta Rosa" },
    { key: "speed", label: "Velocidad", short: "Vel", color: "#fa92b2", item: "power_anklet", itemName: "Franja Recia", vitamin: "carbos", vitaminName: "Carburante", mochi: "swift_mochi", mochiName: "Mochi ímpetu", feather: "swift_feather", featherName: "Pluma ímpetu", berry: "tamato_berry", berryName: "Baya Tamate", mint: "green_mint_leaf", mintName: "Menta Verde" },
  ];
  // Recomendados por stat: [principal, alternativa, para empezar].
  const RECOMMENDED = {
    hp: [40, 184, 39],
    attack: [68, 398, 66],
    defence: [76, 306, 74],
    special_attack: [94, 407, 92],
    special_defence: [186, 182, 72],
    speed: [169, 18, 41],
  };
  const RARITY = { common: "Común", uncommon: "Poco común", rare: "Raro", "ultra-rare": "Ultra raro" };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const pokemon = window.EV_POKEMON;
  const byId = Object.fromEntries(pokemon.map((entry) => [entry.id, entry]));
  const evChips = (ev) => ev.map((value, index) => (value ? `<span class="ev-chip" style="--stat-color:${STATS[index].color}">+${value} ${STATS[index].short}</span>` : "")).join("");
  const img = (item, size = 32) => `<img src="${icon(item)}" alt="" width="${size}" height="${size}">`;

  // Leyenda de stats con su pieza recia.
  document.getElementById("ev-stat-legend").innerHTML = STATS.map((stat) => `
    <div class="ev-stat" style="--stat-color:${stat.color}">${img(stat.item, 28)}<strong>${stat.label}</strong><small>${stat.itemName}</small></div>`).join("");

  // Métodos para ganar o quitar EVs.
  const methods = [
    { title: "Combatir", value: "+1 a +3", tone: "up", icons: ["power_bracer"], pokeball: true,
      text: "Derrotar a un Pokémon da sus EVs a los tuyos que combatieron. Es la forma principal y gratuita.",
      recipe: "Mira la tabla de abajo para saber qué da cada Pokémon." },
    { title: "Piezas recias", value: "+8", tone: "up", icons: STATS.map((stat) => stat.item),
      text: "Equípala y suma 8 EVs en su stat cada vez que tu Pokémon gana experiencia en combate, además de lo que dé el rival.",
      recipe: "Mesa de crafteo: 2 hojas de menta de la stat, 4 bloques de cemento y 2 diamantes." },
    { title: "Vitaminas", value: "+10", tone: "up", icons: STATS.map((stat) => stat.vitamin),
      text: "Úsala desde el inventario sobre tu Pokémon. Sin límite hasta los 252 de esa stat.",
      recipe: "Soporte para pociones: Más PP abajo y la baya EV de la stat arriba." },
    { title: "Mochis", value: "+4", tone: "up", icons: STATS.map((stat) => stat.mochi),
      text: "Comida que suma EVs poco a poco. Perfecta para afinar los últimos puntos.",
      recipe: "Cacerola para hogueras: Espiga vivaz, Botella de miel y la baya EV de la stat (salen 3)." },
    { title: "Plumas", value: "+1", tone: "up", icons: STATS.map((stat) => stat.feather),
      text: "Suma de uno en uno, para dejar la stat exacta.",
      recipe: "Mesa de crafteo: 3 plumas y 1 hoja de menta de la stat (salen 3)." },
    { title: "Bayas reductoras", value: "−10", tone: "down", icons: STATS.map((stat) => stat.berry),
      text: "Quitan 10 EVs de su stat y suben la amistad. Sirven para corregir errores.",
      recipe: "Se cultivan. También son el ingrediente de vitaminas, mochis y caramelos." },
    { title: "Mochi reinicio", value: "0", tone: "down", icons: ["fresh_start_mochi"],
      text: "Pone todos los EVs del Pokémon a 0 para empezar de nuevo.",
      recipe: "Cacerola para hogueras: Espiga vivaz, Botella de miel y Baya Enigma (salen 3)." },
  ];
  document.getElementById("ev-methods").innerHTML = methods.map((method) => `
    <article class="ev-method is-${method.tone}">
      <div class="ev-method-top">
        <h3>${method.title}</h3>
        <span class="ev-method-value">${method.value}</span>
      </div>
      <div class="ev-method-icons">${method.icons.map((item) => img(item, 30)).join("")}${method.pokeball ? '<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="" width="30" height="30">' : ""}</div>
      <p>${method.text}</p>
      <p class="ev-method-recipe">${method.recipe}</p>
    </article>`).join("");

  // Calculadora: rivales y combates necesarios.
  const calc = document.getElementById("ev-calc");
  const out = document.getElementById("ev-calc-out");
  const clamp = (value) => Math.min(252, Math.max(0, Number.parseInt(value, 10) || 0));
  function updateCalc() {
    const field = (name) => calc.querySelector(`[data-calc="${name}"]`);
    const perFoe = Number(field("yield").value) + (field("item").checked ? 8 : 0);
    const missing = Math.max(0, clamp(field("target").value) - clamp(field("current").value));
    const foes = Math.ceil(missing / perFoe);
    const triples = Math.ceil(foes / 3);
    out.innerHTML = missing === 0
      ? `<p class="ev-calc-done">¡Ya está! No te falta ningún EV.</p>`
      : `<div class="ev-calc-result"><strong>${missing}</strong><span>EVs que faltan</span></div>
         <div class="ev-calc-result"><strong>${perFoe}</strong><span>EVs por rival</span></div>
         <div class="ev-calc-result"><strong>${foes}</strong><span>rivales en 1v1</span></div>
         <div class="ev-calc-result is-best"><strong>≈ ${triples}</strong><span>combates 3v3</span></div>
         <p class="ev-calc-alt">Con objetos: ${Math.ceil(missing / 10)} vitaminas, ${Math.ceil(missing / 4)} mochis o ${missing} plumas.</p>`;
  }
  calc.addEventListener("input", updateCalc);
  calc.addEventListener("change", updateCalc);
  updateCalc();

  // Recomendados por stat.
  const spawnLine = (entry) => {
    const spawn = entry.spawn;
    return `<span class="ev-spawn"><b class="rarity-${spawn.rarity}">${RARITY[spawn.rarity]}</b> · Nv. ${spawn.level}</span>
      <span class="ev-places">${spawn.places.slice(0, 4).map((place) => `<i>${escapeHtml(place)}</i>`).join("")}${spawn.places.length > 4 ? `<i>+${spawn.places.length - 4}</i>` : ""}</span>
      ${spawn.notes.length ? `<span class="ev-notes">${spawn.notes.map(escapeHtml).join(" · ")}</span>` : ""}`;
  };
  const recCard = (id, index, statIndex) => {
    const entry = byId[id];
    const value = entry.ev[statIndex];
    return `
      <a class="ev-pick${index === 0 ? " is-main" : ""}" href="pokedex.html#pokemon/${id}">
        <img class="ev-pick-sprite" src="${POKEMON_SPRITES}/${id}.png" alt="" width="80" height="80" loading="lazy">
        <div class="ev-pick-body">
          <small>${["Mejor opción", "Alternativa", "Para empezar"][index]}</small>
          <strong>${escapeHtml(entry.name)}</strong>
          <span class="ev-pick-ev">${evChips(entry.ev)}<em>${value + 8} EVs por rival con pieza recia</em></span>
          ${spawnLine(entry)}
        </div>
      </a>`;
  };
  document.getElementById("ev-recs").innerHTML = STATS.map((stat, statIndex) => `
    <section class="ev-rec" style="--stat-color:${stat.color}">
      <header>
        ${img(stat.item, 36)}
        <div><h3>${stat.label}</h3><small>${stat.itemName} · ${stat.vitaminName} · cebo: ${stat.berryName}</small></div>
      </header>
      <div class="ev-rec-list">${RECOMMENDED[stat.key].map((id, index) => recCard(id, index, statIndex)).join("")}</div>
    </section>`).join("");

  // Tienda de IVs (iv-shop.js).
  document.getElementById("iv-shop-bands").innerHTML = IV_SHOP_BANDS.map((band, index) => `
    <li><span>${index ? IV_SHOP_BANDS[index - 1].max + 1 : 0}–${band.max}</span><strong>$${ivShopMoney(band.price)}</strong><small>por punto</small></li>`).join("");
  renderIvShop(document.getElementById("iv-shop"));

  // Tabla de EVs.
  const state = { stat: -1, query: "", wild: true };
  const filter = document.getElementById("ev-filter");
  filter.innerHTML = `<button class="guide-chip" type="button" data-stat="-1" aria-pressed="true">Todas</button>${STATS.map((stat, index) => `<button class="guide-chip ev-filter-chip" type="button" data-stat="${index}" aria-pressed="false" style="--stat-color:${stat.color}">${img(stat.item, 20)}${stat.label}</button>`).join("")}`;
  const table = document.getElementById("ev-table");
  const empty = document.getElementById("ev-empty");
  const normalize = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const rarityRank = (entry) => (entry.spawn ? ["common", "uncommon", "rare", "ultra-rare"].indexOf(entry.spawn.rarity) : 9);

  function renderTable() {
    const query = normalize(state.query.trim());
    const list = pokemon.filter((entry) => (state.stat < 0 || entry.ev[state.stat] > 0)
      && (!state.wild || entry.spawn)
      && (!query || normalize(entry.name).includes(query) || String(entry.id) === query));
    if (state.stat >= 0) list.sort((a, b) => b.ev[state.stat] - a.ev[state.stat] || rarityRank(a) - rarityRank(b) || a.id - b.id);
    table.innerHTML = `<div class="ev-row ev-row-head" role="row"><span role="columnheader">Pokémon</span><span role="columnheader">EVs que da</span><span role="columnheader">Spawn</span><span role="columnheader">Dónde</span></div>
      ${list.map((entry) => `
        <div class="ev-row" role="row">
          <a class="ev-cell-mon" role="cell" href="pokedex.html#pokemon/${entry.id}"><img src="${POKEMON_SPRITES}/${entry.id}.png" alt="" width="48" height="48" loading="lazy"><span><small>#${String(entry.id).padStart(3, "0")}</small>${escapeHtml(entry.name)}</span></a>
          <span class="ev-cell-ev" role="cell">${evChips(entry.ev)}</span>
          <span class="ev-cell-spawn" role="cell">${entry.spawn ? `<b class="rarity-${entry.spawn.rarity}">${RARITY[entry.spawn.rarity]}</b><small>Nv. ${entry.spawn.level}</small>` : '<small class="ev-nowild">No aparece salvaje</small>'}</span>
          <span class="ev-cell-where" role="cell">${entry.spawn ? `<span class="ev-places">${entry.spawn.places.slice(0, 3).map((place) => `<i>${escapeHtml(place)}</i>`).join("")}${entry.spawn.places.length > 3 ? `<i>+${entry.spawn.places.length - 3}</i>` : ""}</span>${entry.spawn.notes.length ? `<span class="ev-notes">${entry.spawn.notes.map(escapeHtml).join(" · ")}</span>` : ""}` : "<small>Consíguelo evolucionando o criando</small>"}</span>
        </div>`).join("")}`;
    empty.hidden = list.length > 0;
    document.getElementById("ev-count").textContent = `${list.length} Pokémon`;
    filter.querySelectorAll("[data-stat]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.stat) === state.stat)));
  }
  filter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-stat]");
    if (!button) return;
    state.stat = Number(button.dataset.stat);
    renderTable();
  });
  document.getElementById("ev-search").addEventListener("input", (event) => { state.query = event.target.value; renderTable(); });
  document.getElementById("ev-wild").addEventListener("change", (event) => { state.wild = event.target.checked; renderTable(); });
  renderTable();
})();
