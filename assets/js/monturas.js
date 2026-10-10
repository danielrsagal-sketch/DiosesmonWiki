// Monturas: recomendaciones, estilos y catálogo filtrable (datos en data/monturas-data.js).
(function renderMounts() {
  const ITEM_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";
  const ENVIRONMENTS = {
    tierra: { label: "Tierra", color: "#c79a5b", icon: `${ITEM_SPRITES}/soft-sand.png` },
    agua: { label: "Agua", color: "#4b9bff", icon: `${ITEM_SPRITES}/mystic-water.png` },
    aire: { label: "Aire", color: "#8fd8ff", icon: `${ITEM_SPRITES}/air-balloon.png` },
  };
  // Nombres de estilo como en el juego en español.
  const STYLES = {
    horse: { env: "tierra", name: "Estándar", text: "Como un caballo: miras hacia donde quieres ir y puedes esprintar gastando resistencia." },
    cart: { env: "tierra", name: "Coche", text: "Gira con las teclas como una barca, así puedes mirar libremente. Agáchate al girar para derrapar." },
    boat: { env: "agua", name: "Bote", text: "Navega por la superficie como una barca, con la cámara libre." },
    submarine: { env: "agua", name: "Submarino", text: "Como el bote, pero también se sumerge y bucea libremente." },
    dolphin: { env: "agua", name: "Delfín", text: "Bucea como un submarino y además da grandes saltos fuera del agua." },
    bird: { env: "aire", name: "Ave", text: "El vuelo básico: vuela, planea y puede quedarse quieto en el aire." },
    jet: { env: "aire", name: "Avión", text: "Muy rápido y con cámara libre, pero no puede quedarse quieto en el aire." },
    hover: { env: "aire", name: "Ovni", text: "Flota en cualquier dirección, despacio y sin pasar de cierta altura sin gastar resistencia." },
    rocket: { env: "aire", name: "Cohete", text: "Como el ovni, pero con un impulso hacia delante mucho más rápido." },
  };
  const STATS = [
    ["speed", "Velocidad", "Velocidad máxima que alcanza."],
    ["acceleration", "Aceleración", "Lo rápido que llega a su velocidad máxima."],
    ["skill", "Destreza", "Lo cerrado que gira (en el estilo Ovni, lo rápido que frena)."],
    ["jump", "Salto", "Altura del salto. En agua, lo rápido que se sumerge; en aire, planeo, despegue o altura según el estilo."],
    ["stamina", "Resistencia", "Cuánto aguanta esprintando, buceando o volando antes de cansarse."],
  ];
  // Selección de la wiki: id de Pokédex + terreno destacado y motivo.
  const RECOMMENDATIONS = [
    {
      key: "aire", title: "Para volar", picks: [
        { id: 373, env: "aire", why: "Vuelo equilibrado y aguantador. Lleva a un amigo." },
        { id: 330, env: "aire", why: "Muy rápido y el más ágil girando." },
        { id: 445, env: "aire", why: "Avión de hasta 80 de velocidad. También anda y nada." },
        { id: 142, env: "aire", why: "Rápido y ligero. Lo consigues reviviendo el Ámbar Viejo.", link: "fosiles.html#fosil-old_amber_fossil" },
      ],
      legend: { id: 381, env: "aire", why: "La montura más rápida del servidor." },
    },
    {
      key: "agua", title: "Para el agua", picks: [
        { id: 319, env: "agua", why: "El nadador no legendario más rápido, con saltos de delfín." },
        { id: 9, env: "agua", why: "Submarino resistente para 2. ¡También vuela como un cohete!" },
        { id: 131, env: "agua", why: "El clásico: bote estable y fácil de manejar." },
      ],
      legend: { id: 249, env: "agua", why: "Casi todo al máximo nadando, y además vuela." },
    },
    {
      key: "tierra", title: "Para tierra", picks: [
        { id: 59, env: "tierra", why: "La mejor montura terrestre: acelera y corre como nadie." },
        { id: 128, env: "tierra", why: "La velocidad punta más alta en tierra." },
        { id: 3, env: "tierra", why: "Aguanta mucho esprintando y salta bien." },
      ],
    },
    {
      key: "todo", title: "Todoterreno", text: "Tierra, agua y aire con un solo Pokémon.", picks: [
        { id: 149, env: "aire", why: "Avión, delfín y 2 asientos." },
        { id: 130, env: "agua", why: "Delfín, avión y estándar." },
        { id: 445, env: "tierra", why: "Bueno en los tres terrenos." },
        { id: 226, env: "agua", why: "Delfín y ave en uno." },
      ],
    },
    {
      key: "grupo", title: "Para ir en grupo", text: "Los que más asientos tienen.", picks: [
        { id: 321, env: "agua", why: "¡19 asientos! Un submarino para todo el equipo." },
        { id: 323, env: "tierra", why: "6 asientos en tierra firme." },
        { id: 376, env: "aire", why: "Ovni para 4." },
        { id: 473, env: "tierra", why: "3 asientos y mucha presencia." },
      ],
    },
  ];
  const GROUP_COLORS = { aire: "#8fd8ff", agua: "#4b9bff", tierra: "#c79a5b", todo: "#b38cff", grupo: "#ffd442" };

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const mounts = window.MOUNTS;
  const mountById = Object.fromEntries(mounts.filter((mount) => !mount.form).map((mount) => [mount.id, mount]));
  const modeOf = (mount, env) => mount.modes.find((mode) => mode.env === env);
  const range = ([low, high]) => (low === high ? `${low}` : `${low}–${high}`);
  const bestSpeed = (mount, env) => Math.max(...mount.modes.filter((mode) => !env || mode.env === env).map((mode) => mode.stats.speed?.[1] ?? 0));
  const pokedexLink = (mount) => `pokedex.html#pokemon/${mount.id}${mount.form ? `/${mount.form}` : ""}`;

  const statBar = ([low, high], label) => `
    <div class="ride-stat"><span>${label}</span>
      <div class="ride-bar" role="img" aria-label="${label}: ${range([low, high])} de 100"><i style="width:${low}%"></i><b style="left:${low}%;width:${high - low}%"></b></div>
      <em>${range([low, high])}</em>
    </div>`;
  const modeBadge = (mode) => `<span class="env-badge" style="--env-color:${ENVIRONMENTS[mode.env].color}"><img src="${ENVIRONMENTS[mode.env].icon}" alt="" width="20" height="20">${ENVIRONMENTS[mode.env].label} · ${STYLES[mode.style]?.name ?? mode.style}</span>`;

  // Cabecera
  const counts = Object.fromEntries(Object.keys(ENVIRONMENTS).map((env) => [env, mounts.filter((mount) => modeOf(mount, env)).length]));
  document.getElementById("mount-tips").innerHTML = Object.entries(ENVIRONMENTS).map(([env, info]) => `<li><img src="${info.icon}" alt="">${counts[env]} por ${info.label.toLowerCase()}</li>`).join("");

  // Recomendaciones
  const recCard = (pick, isLegend) => {
    const mount = mountById[pick.id];
    const mode = modeOf(mount, pick.env);
    return `
      <a class="rec-card${isLegend ? " is-legend" : ""}" href="${pick.link ?? `#montura-${mount.id}`}">
        <img class="rec-sprite" src="${mount.sprite}" alt="" width="80" height="80" loading="lazy">
        <div class="rec-body">
          <strong>${escapeHtml(mount.name)}${isLegend ? ' <span class="rec-crown">Legendario</span>' : ""}</strong>
          ${modeBadge(mode)}
          <small>${pick.why}</small>
          <span class="rec-stats"><b>Vel.</b> ${range(mode.stats.speed)} · <b>Asientos</b> ${mount.seats}</span>
        </div>
      </a>`;
  };
  document.getElementById("mount-recs").innerHTML = RECOMMENDATIONS.map((group) => `
    <section class="rec-group rec-${group.key}" style="--rec-color:${GROUP_COLORS[group.key]}">
      <h3>${ENVIRONMENTS[group.key] ? `<img src="${ENVIRONMENTS[group.key].icon}" alt="" width="30" height="30">` : ""}${group.title}</h3>
      ${group.text ? `<p>${group.text}</p>` : ""}
      <div class="rec-list">${group.picks.map((pick) => recCard(pick, false)).join("")}</div>
      ${group.legend ? `<p class="rec-legend-title">Si tienes un legendario</p>${recCard(group.legend, true)}` : ""}
    </section>`).join("");

  // Estilos (solo los que usa alguna montura) y definiciones de estadísticas
  const usedStyles = new Set(mounts.flatMap((mount) => mount.modes.map((mode) => mode.style)));
  document.getElementById("mount-styles").innerHTML = Object.entries(ENVIRONMENTS).map(([env, info]) => `
    <div class="style-col" style="--env-color:${info.color}">
      <h3><img src="${info.icon}" alt="" width="28" height="28">${info.label}</h3>
      ${Object.entries(STYLES).filter(([key, style]) => style.env === env && usedStyles.has(key)).map(([key, style]) => `
        <div class="style-item"><strong>${style.name}</strong><span>${style.text}</span><small>${mounts.filter((mount) => mount.modes.some((mode) => mode.style === key && mode.env === env)).length} Pokémon</small></div>`).join("")}
    </div>`).join("");
  document.getElementById("mount-stats").innerHTML = STATS.map(([, name, text]) => `<div><strong>${name}</strong><span>${text}</span></div>`).join("");

  // Catálogo
  const state = { env: "all", sort: "speed", hideLegendary: false };
  const envFilter = document.getElementById("mount-env-filter");
  envFilter.innerHTML = [["all", { label: "Todas" }], ...Object.entries(ENVIRONMENTS)].map(([env, info]) => `<button class="guide-chip" type="button" data-env="${env}" aria-pressed="${env === state.env}">${info.icon ? `<img src="${info.icon}" alt="" width="20" height="20">` : ""}${info.label}</button>`).join("");

  const mountCard = (mount) => `
    <details class="mount-card${mount.legendary ? " is-legend" : ""}" id="montura-${mount.id}${mount.form ? `-${mount.form}` : ""}">
      <summary>
        <img class="mount-sprite" src="${mount.sprite}" alt="" width="88" height="88" loading="lazy">
        <div class="mount-head">
          <small>#${String(mount.id).padStart(3, "0")}${mount.legendary ? ' · <span class="rec-crown">Legendario</span>' : ""}</small>
          <strong>${escapeHtml(mount.name)}</strong>
          <div class="fossil-types">${mount.types.map((type) => typeChip(type)).join("")}</div>
        </div>
        <span class="mount-seats" title="Asientos">${mount.seats}<small>${mount.seats === 1 ? "asiento" : "asientos"}</small></span>
        <div class="mount-modes">${mount.modes.map((mode) => `
          <div class="mount-mode${state.env !== "all" && mode.env !== state.env ? " is-dim" : ""}">${modeBadge(mode)}${statBar(mode.stats.speed, "Vel.")}</div>`).join("")}
        </div>
      </summary>
      <div class="mount-detail">
        ${mount.modes.map((mode) => `
          <div class="mount-detail-mode" style="--env-color:${ENVIRONMENTS[mode.env].color}">
            <h4>${ENVIRONMENTS[mode.env].label} · ${STYLES[mode.style]?.name ?? mode.style}</h4>
            ${STATS.map(([key, name]) => (mode.stats[key] ? statBar(mode.stats[key], name) : "")).join("")}
          </div>`).join("")}
        <a class="mount-dex" href="${pokedexLink(mount)}">Ver en la Pokédex →</a>
      </div>
    </details>`;

  const grid = document.getElementById("mount-grid");
  const empty = document.getElementById("mount-empty");
  const env = () => (state.env === "all" ? null : state.env);
  const SORTS = {
    speed: (a, b) => bestSpeed(b, env()) - bestSpeed(a, env()) || a.id - b.id,
    dex: (a, b) => a.id - b.id,
    seats: (a, b) => b.seats - a.seats || a.id - b.id,
    name: (a, b) => a.name.localeCompare(b.name, "es"),
  };
  function renderGrid() {
    const list = mounts
      .filter((mount) => (!env() || modeOf(mount, env())) && (!state.hideLegendary || !mount.legendary))
      .sort(SORTS[state.sort]);
    grid.innerHTML = list.map(mountCard).join("");
    empty.hidden = list.length > 0;
    document.getElementById("mount-count").textContent = `${list.length} Pokémon`;
    envFilter.querySelectorAll("[data-env]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.env === state.env)));
  }
  envFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-env]");
    if (!button) return;
    state.env = button.dataset.env;
    renderGrid();
  });
  document.getElementById("mount-sort").addEventListener("change", (event) => { state.sort = event.target.value; renderGrid(); });
  document.getElementById("mount-hide-legendary").addEventListener("change", (event) => { state.hideLegendary = event.target.checked; renderGrid(); });

  // Enlaces de las recomendaciones: abre la tarjeta (quitando filtros si la ocultan).
  function openFromHash() {
    const match = location.hash.match(/^#montura-(\d+)/);
    if (!match) return;
    let card = document.getElementById(location.hash.slice(1));
    if (!card) {
      state.env = "all";
      state.hideLegendary = false;
      document.getElementById("mount-hide-legendary").checked = false;
      renderGrid();
      card = document.getElementById(location.hash.slice(1));
    }
    if (!card) return;
    card.open = true;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("is-flash");
    void card.offsetWidth;
    card.classList.add("is-flash");
  }
  window.addEventListener("hashchange", openFromHash);
  renderGrid();
  openFromHash();
})();
