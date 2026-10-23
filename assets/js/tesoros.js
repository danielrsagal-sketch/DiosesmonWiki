// Tesoros: gachapones del servidor con sus recompensas y probabilidades (datos en data/tesoros-data.js).
(function renderTreasures() {
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const boxes = window.DIOSESMON_TREASURES ?? [];
  const list = document.getElementById("tr-list");
  const detail = document.getElementById("tr-detail");
  const coinIcon = rewardIcon("Dcoins");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const normalize = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const money = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const percent = (value) => `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  // Rareza según la probabilidad, para colorear.
  const tier = (chance) => (chance < 1 ? "legend" : chance < 2.5 ? "epic" : chance < 6 ? "rare" : "common");
  const state = { key: boxes[0]?.key, query: "" };

  const priceTag = (box) => (box.price ? `<span class="tr-price"><img src="${coinIcon}" alt="">${money(box.price)}</span>`
    : box.pricePoints ? `<span class="tr-price is-sp">${money(box.pricePoints)} SP</span>` : box.key === "gacha-diario" ? '<span class="tr-price is-free">Gratis</span>' : '<span class="tr-price is-off">No se vende</span>');

  function renderList() {
    list.innerHTML = boxes.map((box) => `
      <button class="dr-item tr-item${box.key === state.key ? " is-active" : ""}" type="button" data-box="${box.key}" style="--section-color:${box.color}" aria-current="${box.key === state.key}">
        <span class="dr-item-art tr-art"><img src="${box.icon}" alt="" loading="lazy"></span>
        <span class="dr-item-text"><strong>${escapeHtml(box.name)}</strong><small>${box.kind === "all" ? "Gen 1–4" : `${box.rewards.length} premios`} · ${priceTag(box)}</small></span>
      </button>`).join("");
  }

  const card = (box, reward) => {
    const level = tier(reward.chance);
    if (box.kind === "pokemon") {
      return `<a class="tr-reward is-${level}" href="pokedex.html#pokemon/${reward.id}" title="${escapeHtml(reward.name)}">
        <img class="tr-sprite" src="${SPRITES}/${box.shiny ? "shiny/" : ""}${reward.id}.png" alt="" width="80" height="80" loading="lazy">
        <strong>${escapeHtml(reward.name)}${box.shiny ? ' <span class="tr-shiny">✦</span>' : ""}</strong><em>${percent(reward.chance)}</em></a>`;
    }
    if (box.kind === "models") {
      return `<div class="tr-reward tr-model is-${level}">
        <img src="${reward.image}" alt="${escapeHtml(reward.name)}" loading="lazy">
        <strong>${escapeHtml(reward.name.replace(/ Shiny$/, ""))}${reward.shiny ? ' <span class="tr-shiny">✦ Shiny</span>' : ""}</strong><em>${percent(reward.chance)}</em></div>`;
    }
    return `<div class="tr-reward is-${level}">
      ${reward.flat ? `<span class="kit-slot"><img src="${reward.icon}" alt="" loading="lazy"></span>` : `<img class="tr-slot" src="${reward.icon}" alt="" width="64" height="64" loading="lazy">`}
      <strong>${escapeHtml(reward.name)}</strong><em>${percent(reward.chance)}</em></div>`;
  };

  function renderDetail() {
    const box = boxes.find((entry) => entry.key === state.key);
    const query = normalize(state.query);
    const rewards = box.rewards.filter((reward) => !query || normalize(reward.name).includes(query)).sort((a, b) => a.chance - b.chance);
    detail.style.setProperty("--section-color", box.color);
    detail.innerHTML = `
      <div class="tr-head">
        <img class="tr-box-icon" src="${box.icon}" alt="">
        <div>
          <p class="kit-kind">Tesoro</p>
          <h3>${escapeHtml(box.name)}</h3>
          <p class="tr-keys">${priceTag(box)} ${escapeHtml(box.keys)}</p>
          ${box.packs ? `<ul class="tr-packs">${box.packs.map(([count, cost, off]) => `<li${off ? ' class="is-deal"' : ""}>${off ? `<em>−${off}%</em>` : ""}<b>×${count}</b><span>${money(cost)} ${box.pricePoints ? "SP" : ""}</span>${count > 1 ? `<small>${money(Math.round(cost / count))} c/u</small>` : ""}</li>`).join("")}</ul>` : ""}
          ${box.note ? `<p class="tr-note">${escapeHtml(box.note)}</p>` : ""}
          <div class="tr-sim-actions">
            <button class="tr-open" type="button" data-open="1"><span aria-hidden="true">🎰</span> Simular apertura</button>
            <button class="tr-open is-ghost" type="button" data-open="10">Abrir ×10</button>
          </div>
        </div>
      </div>
      ${box.kind === "all" ? `
        <div class="tr-all">
          <p>Este tesoro puede darte <strong>cualquier Pokémon disponible en el servidor</strong> (generaciones 1 a 5, incluida Teselia), y siempre con su <strong>habilidad oculta</strong>. Cada uno tiene alrededor de un <strong>0,15%</strong> de probabilidad.</p>
          <a class="sec-cta" href="pokedex.html"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="">Ver todos en la Pokédex</a>
        </div>` : `
        <div class="tr-legend"><span class="is-legend">Menos de 1%</span><span class="is-epic">1–2,5%</span><span class="is-rare">2,5–6%</span><span class="is-common">Más de 6%</span></div>
        <div class="tr-grid${box.kind === "models" ? " is-models" : ""}">${rewards.map((reward) => card(box, reward)).join("") || '<p class="guide-empty">Ningún premio coincide con la búsqueda.</p>'}</div>`}`;
  }

  function render() {
    renderList();
    renderDetail();
  }
  function select(key, scroll) {
    if (!boxes.some((box) => box.key === key)) return;
    state.key = key;
    history.replaceState(null, "", `#${key}`);
    render();
    if (scroll && matchMedia("(max-width: 860px)").matches) detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-box]");
    if (button) select(button.dataset.box, true);
  });

  // --- Simulador de apertura (solo por diversión: no da nada en el servidor) ---
  const sim = document.getElementById("tr-sim");
  const simStats = {};
  // Caja «cualquier Pokémon»: las generaciones activas (1 a 5, hasta #649), todas con la misma probabilidad.
  const ALL_POKEMON = 649;
  const pool = (box) => (box.kind === "all"
    ? Array.from({ length: ALL_POKEMON }, (_, index) => ({ name: `#${index + 1}`, id: index + 1, chance: 100 / ALL_POKEMON }))
    : box.rewards);
  function roll(box) {
    const list = pool(box);
    const total = list.reduce((sum, reward) => sum + reward.chance, 0);
    let value = Math.random() * total;
    for (const reward of list) { value -= reward.chance; if (value <= 0) return reward; }
    return list[list.length - 1];
  }
  const simImage = (box, reward) => {
    if (box.kind === "pokemon" || box.kind === "all") return `${SPRITES}/${box.shiny ? "shiny/" : ""}${reward.id}.png`;
    return reward.image ?? reward.icon;
  };
  const simName = (box, reward) => (box.kind === "all" ? `Pokémon #${reward.id}` : reward.name);
  const simTile = (box, reward, extra = "") => `<div class="tr-tile is-${tier(reward.chance)} ${extra}"><img src="${simImage(box, reward)}" alt=""><span>${escapeHtml(simName(box, reward))}</span></div>`;
  let spinning = false;

  function openSim(box, count) {
    if (spinning) return;
    sim.hidden = false;
    document.body.classList.add("modal-open");
    const stats = (simStats[box.key] ??= { opened: 0, spent: 0 });
    const cost = box.price ?? 0;
    const results = Array.from({ length: count }, () => roll(box));
    stats.opened += count;
    stats.spent += cost * count;
    const statsLine = `Has abierto <strong>${stats.opened}</strong> en esta sesión${cost ? ` · te habría costado <strong><img src="${coinIcon}" alt=""> ${money(stats.spent)}</strong> DiosesCoins` : ""}`;
    const body = sim.querySelector(".tr-sim-body");
    if (count > 1) {
      // ×10: rejilla que se revela en cascada, de lo más raro a lo más común.
      results.sort((a, b) => a.chance - b.chance);
      body.innerHTML = `
        <h3>${escapeHtml(box.name)} · ×10</h3>
        <div class="tr-sim-multi">${results.map((reward, index) => `<div class="tr-reveal" style="--d:${index * 0.12}s">${simTile(box, reward)}<em>${percent(reward.chance)}</em></div>`).join("")}</div>
        <p class="tr-sim-stats">${statsLine}</p>
        <div class="tr-sim-actions"><button class="tr-open" type="button" data-again="10">Otra vez ×10</button><button class="tr-open is-ghost" type="button" data-again="1">Abrir 1</button></div>`;
      // Un «tic» por cada premio que se da la vuelta y fanfarria al final (más grande si hay algo raro).
      const rare = results.some((reward) => reward.chance < 1);
      results.forEach((_, index) => setTimeout(() => window.DiosesSfx?.jingle("tick"), index * 120 + 200));
      setTimeout(() => window.DiosesSfx?.jingle(rare ? "rare" : "win"), results.length * 120 + 350);
      if (rare) setTimeout(celebrate, 900);
      return;
    }
    const winner = results[0];
    const strip = Array.from({ length: 60 }, (_, index) => (index === 52 ? winner : roll(box)));
    body.innerHTML = `
      <h3>${escapeHtml(box.name)}</h3>
      <div class="tr-reel"><div class="tr-reel-marker"></div><div class="tr-strip">${strip.map((reward, index) => simTile(box, reward, index === 52 ? "is-winner" : "")).join("")}</div></div>
      <div class="tr-sim-result" hidden></div>
      <p class="tr-sim-stats">${statsLine}</p>
      <div class="tr-sim-actions" hidden><button class="tr-open" type="button" data-again="1">Abrir otra</button><button class="tr-open is-ghost" type="button" data-again="10">Abrir ×10</button></div>`;
    const reel = body.querySelector(".tr-reel");
    const stripEl = body.querySelector(".tr-strip");
    const tile = stripEl.children[52];
    spinning = true;
    // Música mientras gira y un «tic» cada vez que un premio pasa por el marcador.
    const stopMusic = window.DiosesSfx?.music() ?? (() => {});
    const tileStep = tile.offsetWidth + 8;
    let lastTick = -1;
    const ticker = () => {
      if (!spinning) return;
      const shift = -new DOMMatrixReadOnly(getComputedStyle(stripEl).transform).m41;
      const passed = Math.floor((shift + reel.clientWidth / 2) / tileStep);
      if (passed !== lastTick) {
        if (lastTick >= 0) window.DiosesSfx?.jingle("tick");
        lastTick = passed;
      }
      requestAnimationFrame(ticker);
    };
    requestAnimationFrame(ticker);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const offset = tile.offsetLeft + tile.offsetWidth / 2 - reel.clientWidth / 2 + (Math.random() - 0.5) * tile.offsetWidth * 0.7;
      stripEl.style.transform = `translateX(-${offset}px)`;
    }));
    const finish = () => {
      if (!spinning) return;
      spinning = false;
      stopMusic();
      window.DiosesSfx?.jingle(winner.chance < 1 ? "rare" : "win");
      tile.classList.add("is-landed");
      const result = body.querySelector(".tr-sim-result");
      result.hidden = false;
      result.className = `tr-sim-result is-${tier(winner.chance)}`;
      result.innerHTML = `<img src="${simImage(box, winner)}" alt=""><div><small>¡Te ha tocado!</small><strong>${escapeHtml(box.kind === "all" ? `${simName(box, winner)} con habilidad oculta` : winner.name)}${box.shiny ? " ✦" : ""}</strong><em>${percent(winner.chance)} de probabilidad</em></div>`;
      body.querySelector(".tr-sim-actions").hidden = false;
      if (winner.chance < 1) celebrate();
    };
    stripEl.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 6500);
  }
  function celebrate() {
    const layer = document.createElement("div");
    layer.className = "tr-confetti";
    const colors = ["#ffd442", "#ff6fb1", "#4bb6ff", "#6cf0b2", "#c9a6ff"];
    layer.innerHTML = Array.from({ length: 70 }, () => `<i style="--x:${Math.random() * 100}%;--d:${Math.random() * 0.8}s;--r:${Math.random() * 720 - 360}deg;--c:${colors[Math.floor(Math.random() * colors.length)]}"></i>`).join("");
    sim.querySelector(".tr-sim-panel").appendChild(layer);
    setTimeout(() => layer.remove(), 3500);
  }
  function closeSim() {
    if (spinning) return;
    sim.hidden = true;
    document.body.classList.remove("modal-open");
  }
  detail.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open]");
    if (button) openSim(boxes.find((box) => box.key === state.key), Number(button.dataset.open));
  });
  sim.addEventListener("click", (event) => {
    const again = event.target.closest("[data-again]");
    if (again) openSim(boxes.find((box) => box.key === state.key), Number(again.dataset.again));
    else if (event.target.closest("[data-close]") || event.target.classList.contains("tr-sim-backdrop")) closeSim();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !sim.hidden) closeSim(); });

  // Buscador global: en qué tesoro sale un premio.
  const search = document.getElementById("tr-search");
  const results = document.getElementById("tr-results");
  search.addEventListener("input", () => {
    state.query = search.value;
    const query = normalize(search.value);
    renderDetail();
    if (!query) { results.innerHTML = ""; return; }
    const found = boxes.map((box) => ({ box, hits: box.rewards.filter((reward) => normalize(reward.name).includes(query)) })).filter((entry) => entry.hits.length);
    results.innerHTML = found.length
      ? found.map(({ box, hits }) => `<button type="button" class="tr-hit" data-goto="${box.key}" style="--section-color:${box.color}"><img src="${box.icon}" alt=""><span><strong>${escapeHtml(box.name)}</strong><small>${hits.slice(0, 4).map((hit) => `${escapeHtml(hit.name)} (${percent(hit.chance)})`).join(" · ")}${hits.length > 4 ? ` · +${hits.length - 4}` : ""}</small></span></button>`).join("")
      : '<p class="tr-none">No sale en ningún tesoro.</p>';
  });
  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-goto]");
    if (button) select(button.dataset.goto, false);
  });

  window.addEventListener("hashchange", () => select(location.hash.slice(1), false));
  const initial = location.hash.slice(1);
  if (boxes.some((box) => box.key === initial)) state.key = initial;
  render();
})();
