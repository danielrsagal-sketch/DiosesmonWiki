// Megaevoluciones (data/megas-data.js): tarjetas con stats frente a la forma normal, habilidades y megapiedra.
(function megas() {
  const data = window.DIOSESMON_MEGAS;
  if (!data) return;
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const STATS = [["hp", "PS"], ["atk", "Ataque"], ["def", "Defensa"], ["spa", "At. Esp."], ["spd", "Def. Esp."], ["spe", "Velocidad"]];
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const fold = (text) => String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const chip = (type) => (typeof typeChip === "function" ? typeChip(type) : `<span class="type-chip">${esc(type)}</span>`);
  const total = (stats) => Object.values(stats).reduce((sum, value) => sum + value, 0);
  const megasList = data.megas.map((mega) => ({
    ...mega,
    total: total(mega.stats),
    gain: total(mega.stats) - total(mega.baseStats),
    search: fold([mega.name, mega.base, mega.stone?.name, ...mega.abilities.map((ability) => ability.name), ...mega.types].join(" ")),
  }));
  const state = { q: "", type: "", sort: "dex", source: "", avail: true };

  // Resumen y textos de la Megapulsera.
  const available = megasList.filter((mega) => mega.available);
  $("mg-stats").innerHTML = [
    [available.length, "megas en el servidor"],
    [available.filter((mega) => mega.source === "clasica").length, "clásicas"],
    [available.filter((mega) => mega.source === "za").length, "de Leyendas Z-A"],
    [megasList.length - available.length, "de Pokémon aún no disponibles"],
  ].map(([value, label]) => `<li><strong>${value}</strong> ${label}</li>`).join("");
  $("mg-bracelet").textContent = data.bracelet.name;
  $("mg-keystone").textContent = data.bracelet.keystone;
  const types = [...new Set(megasList.flatMap((mega) => mega.types))].sort((a, b) => a.localeCompare(b, "es"));
  $("mg-type").insertAdjacentHTML("beforeend", types.map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join(""));

  const typesChanged = (mega) => mega.types.join("/") !== mega.baseTypes.join("/");
  const card = (mega) => {
    const sprite = mega.pokeapi ? `${SPRITES}/${mega.pokeapi}.png` : `${SPRITES}/${mega.dex}.png`;
    const max = 200;
    const rows = STATS.map(([key, label]) => {
      const now = mega.stats[key];
      const before = mega.baseStats[key];
      const diff = now - before;
      return `<div class="mg-stat"><span>${label}</span><div class="mg-bar"><i class="is-base" style="width:${Math.min(100, (before / max) * 100)}%"></i><i class="is-mega" style="width:${Math.min(100, (now / max) * 100)}%"></i></div><b>${now}</b><em class="${diff > 0 ? "is-up" : diff < 0 ? "is-down" : ""}">${diff > 0 ? `+${diff}` : diff < 0 ? diff : "="}</em></div>`;
    }).join("");
    return `<article class="mg-card${mega.available ? "" : " is-locked"}${mega.source === "za" ? " is-za" : ""}" id="${esc(mega.key)}">
      <header class="mg-head">
        <img class="mg-sprite pixel" src="${sprite}" alt="" width="96" height="96" loading="lazy" onerror="this.onerror=null;this.src='${SPRITES}/${mega.dex}.png'">
        <div class="mg-title">
          <small>#${String(mega.dex).padStart(3, "0")} · ${esc(mega.base)}</small>
          <h3>${esc(mega.name)}</h3>
          <div class="mg-types">${mega.types.map(chip).join("")}${typesChanged(mega) ? `<span class="mg-was">antes ${mega.baseTypes.map(esc).join("/")}</span>` : ""}</div>
        </div>
        <div class="mg-badges">
          ${mega.source === "za" ? '<span class="v-badge mg-za">Z-A</span>' : ""}
          ${mega.kind === "primal" ? '<span class="v-badge mg-primal">Primigenio</span>' : ""}
          ${mega.available ? "" : '<span class="v-badge is-dim">No disponible</span>'}
        </div>
      </header>
      <div class="mg-stone">${mega.stone ? `${mega.stone.icon ? `<img class="pixel" src="${mega.stone.icon}" alt="" width="32" height="32">` : ""}<span>Megapiedra: <strong>${esc(mega.stone.name)}</strong></span>` : `<span>${mega.kind === "primal" ? "Sin megapiedra" : "Sin megapiedra"}</span>`}</div>
      <div class="mg-stats-block">
        ${rows}
        <div class="mg-total"><span>Total</span><b>${mega.total}</b><em class="is-up">+${mega.gain}</em></div>
      </div>
      <div class="mg-abilities">${mega.abilities.length
        ? mega.abilities.map((ability) => `<p><strong>${esc(ability.name)}</strong>${mega.source === "za" ? ' <span class="mg-unofficial" title="Leyendas Z-A no tiene habilidades: esta la pone el mod Navas ZA Megas">no oficial</span>' : ""}${ability.desc ? ` — ${esc(ability.desc)}` : ""}</p>`).join("")
        : '<p class="mg-noability">Sin habilidad en esta versión del mod.</p>'}</div>
      ${mega.note ? `<p class="mg-note">${esc(mega.note)}</p>` : ""}
      ${mega.key === "staraptor-mega" ? `<p class="mg-note is-showdown">🆚 En Pokémon Showdown tiene otra habilidad: en Diosesmon es <strong>${esc(mega.abilities[0]?.name ?? "")}</strong>, la que pone el mod.</p>` : ""}
      ${mega.available ? "" : `<p class="mg-note is-locked">${esc(mega.base)} todavía no está en el servidor: su mega llegará cuando llegue su generación.</p>`}
    </article>`;
  };

  const draw = () => {
    const query = fold(state.q.trim());
    const list = megasList.filter((mega) => (!state.avail || mega.available)
      && (!state.source || mega.source === state.source)
      && (!state.type || mega.types.includes(state.type))
      && (!query || mega.search.includes(query)));
    const sorters = {
      dex: (a, b) => a.dex - b.dex || a.name.localeCompare(b.name, "es"),
      total: (a, b) => b.total - a.total,
      gain: (a, b) => b.gain - a.gain,
    };
    list.sort(sorters[state.sort] ?? ((a, b) => b.stats[state.sort] - a.stats[state.sort]));
    $("mg-grid").innerHTML = list.map(card).join("");
    $("mg-empty").hidden = list.length > 0;
    $("mg-count").textContent = `${list.length}`;
  };

  $("mg-q").addEventListener("input", (event) => { state.q = event.target.value; draw(); });
  $("mg-type").addEventListener("change", (event) => { state.type = event.target.value; draw(); });
  $("mg-sort").addEventListener("change", (event) => { state.sort = event.target.value; draw(); });
  $("mg-avail").addEventListener("change", (event) => { state.avail = event.target.checked; draw(); });
  $("mg-source").addEventListener("click", (event) => {
    const button = event.target.closest("[data-source]");
    if (!button) return;
    state.source = button.dataset.source;
    $("mg-source").querySelectorAll("[data-source]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    draw();
  });
  draw();
  // megas.html#charizard-mega-x abre directamente esa mega.
  const target = location.hash.slice(1) && document.getElementById(location.hash.slice(1));
  if (target) { target.classList.add("is-target"); target.scrollIntoView({ block: "center" }); }
})();
