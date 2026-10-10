// Kits: lista de kits de rango y exclusivos con sus objetos (datos en data/kits-data.js).
(function renderKits() {
  const kits = window.DIOSESMON_KITS ?? [];
  const list = document.getElementById("kit-list");
  const detail = document.getElementById("kit-detail");
  const tabs = document.querySelectorAll(".kit-tabs [data-group]");
  const coinIcon = rewardIcon("Dcoins");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const money = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const state = { group: "rango", key: "usuario", item: 0 };

  // Cabecera: las cinco skins de rango en fila.
  document.getElementById("kit-hero").innerHTML = kits.filter((kit) => kit.group === "rango")
    .map((kit, index) => `<img src="${kit.skin}" alt="" style="--i:${index}">`).join("");

  const itemTile = (item, index, kit) => `
    <button class="kit-item${index === state.item ? " is-active" : ""}" type="button" data-item="${index}" title="${escapeHtml(item.name)}">
      <span class="kit-slot${item.slotIcon ? " is-capture" : ""}"><img src="${item.icon}" alt="" loading="lazy">${item.qty > 1 && !item.slotIcon ? `<b>${item.qty}</b>` : ""}</span>
      <span class="kit-item-name" style="${/\b(EEVEE|SANDSLASH|SCEPTILE|METAGROSS|HO-OH|ENTRENADOR|AS|LIDER|MAESTRO|Usuario)\b/.test(item.name) ? `color:${kit.color}` : ""}">${escapeHtml(item.name)}</span>
    </button>`;

  const itemInfo = (item, kit) => {
    if (!item) return "";
    const lines = [
      ...item.enchantments.map((line) => `<li class="is-enchant">${escapeHtml(line)}</li>`),
      ...item.attributes.map((line) => `<li class="is-attr">${escapeHtml(line)}</li>`),
      ...item.lore.map((line) => `<li class="is-lore">${escapeHtml(line)}</li>`),
    ];
    return `
      <div class="kit-info" style="--kit-color:${kit.color}">
        <span class="kit-slot is-big${item.slotIcon ? " is-capture" : ""}"><img src="${item.icon}" alt=""></span>
        <div>
          <strong>${item.qty > 1 ? `${item.qty}× ` : ""}${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.category)} · <code>${escapeHtml(item.id)}</code></small>
          ${lines.length ? `<ul>${lines.join("")}</ul>` : '<p>Sin encantamientos ni efectos especiales.</p>'}
        </div>
      </div>`;
  };

  // Límites del rango (crianza, curas, homes…) en el detalle del kit.
  function rankLimits(kit) {
    const index = kits.filter((entry) => entry.group === "rango").indexOf(kit);
    const table = window.DIOSESMON_RANKS;
    const commands = table.commands.filter(([, from]) => from === index).map(([command]) => command);
    return `<ul class="kit-limits">${table.limits.map(([label, values]) => `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(values[index])}</strong></li>`).join("")}</ul>
      ${commands.length ? `<p class="kit-commands">Comandos nuevos: ${commands.map((command) => `<code>${command}</code>`).join(" ")}${index > 1 ? " <small>(y todos los de rangos anteriores)</small>" : ""}</p>` : ""}`;
  }

  function renderList() {
    list.innerHTML = kits.filter((kit) => kit.group === state.group).map((kit) => `
      <button class="dr-item kit-list-item${kit.key === state.key ? " is-active" : ""}" type="button" data-kit="${kit.key}" style="--section-color:${kit.color}" aria-current="${kit.key === state.key}">
        <span class="dr-item-art kit-list-art"><img src="${kit.skin}" alt="" loading="lazy"></span>
        <span class="dr-item-text">
          <strong>Kit ${escapeHtml(kit.name)}</strong>
          <small>${kit.items.length} objetos${kit.price ? ` · <span class="kit-coins"><img src="${coinIcon}" alt="">${money(kit.price)}</span>` : kit.group === "rango" ? ` · ${kit.key === "usuario" ? "Gratis" : "Cada 9 días"}` : ""}</small>
        </span>
      </button>`).join("");
  }

  function renderDetail() {
    const kit = kits.find((entry) => entry.key === state.key);
    const categories = [...new Set(kit.items.map((item) => item.category))];
    const specialty = kit.specialty?.match(/^(.*)\((\d+)\/10\)$/);
    detail.style.setProperty("--section-color", kit.color);
    detail.innerHTML = `
      <div class="kit-head">
        <img class="kit-skin" src="${kit.skin}" alt="Skin del Kit ${escapeHtml(kit.name)}">
        <div class="kit-head-text">
          <p class="kit-kind">${kit.group === "rango" ? "Kit de rango" : "Kit exclusivo"}</p>
          <h3>Kit ${escapeHtml(kit.name)}</h3>
          ${kit.price ? `<p class="kit-price"><img src="${coinIcon}" alt="" width="28" height="28"><strong>${money(kit.price)}</strong> DiosesCoins</p>` : ""}
          ${kit.coins ? `<p class="kit-price is-small"><img src="${coinIcon}" alt="" width="24" height="24">Incluye <strong>${kit.coins}</strong> DiosesCoins al comprar el rango</p>` : ""}
          ${specialty ? `<div class="kit-specialty"><span>${escapeHtml(specialty[1].trim())}</span><i style="--value:${specialty[2]}"></i><b>${specialty[2]}/10</b></div>` : ""}
          <ul class="kit-perks">${kit.perks.map((perk) => `<li>${escapeHtml(perk)}</li>`).join("")}</ul>
          ${kit.group === "rango" ? rankLimits(kit) : ""}
          ${kit.store ? `<a class="kit-store" href="${kit.store}" target="_blank" rel="noreferrer">Ver el rango en la tienda ↗</a>` : ""}
          ${kit.setBonus ? '<p class="kit-set-note">Las ventajas exclusivas se activan al equiparte <strong>toda la armadura</strong> del kit.</p>' : ""}
        </div>
      </div>
      ${itemInfo(kit.items[state.item], kit)}
      ${categories.map((category) => `
        <section class="kit-category">
          <h4>${escapeHtml(category)} <span>${kit.items.filter((item) => item.category === category).length}</span></h4>
          <div class="kit-grid">${kit.items.map((item, index) => (item.category === category ? itemTile(item, index, kit) : "")).join("")}</div>
        </section>`).join("")}`;
  }

  function render() {
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.group === state.group)));
    renderList();
    renderDetail();
  }

  function select(key, scroll) {
    const kit = kits.find((entry) => entry.key === key);
    if (!kit) return;
    state.group = kit.group;
    state.key = key;
    state.item = 0;
    history.replaceState(null, "", `#${key}`);
    render();
    if (scroll && matchMedia("(max-width: 860px)").matches) detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => {
    select(kits.find((kit) => kit.group === tab.dataset.group).key, false);
  }));
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-kit]");
    if (button) select(button.dataset.kit, true);
  });
  detail.addEventListener("click", (event) => {
    const button = event.target.closest("[data-item]");
    if (!button) return;
    state.item = Number(button.dataset.item);
    const kit = kits.find((entry) => entry.key === state.key);
    detail.querySelector(".kit-info").outerHTML = itemInfo(kit.items[state.item], kit);
    detail.querySelectorAll("[data-item]").forEach((tile) => tile.classList.toggle("is-active", Number(tile.dataset.item) === state.item));
    if (matchMedia("(max-width: 860px)").matches) detail.querySelector(".kit-info").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // Comparativa de rangos: límites y comandos de la tienda, más lo que trae cada kit.
  const ranks = kits.filter((kit) => kit.group === "rango");
  const table = window.DIOSESMON_RANKS;
  const columns = table.columns.map((label, index) => ({ label, kit: ranks[index] }));
  const cell = (value) => `<td>${value}</td>`;
  const check = (on) => (on ? '<span class="kit-yes">✔</span>' : '<span class="kit-no">—</span>');
  document.getElementById("kit-compare").innerHTML = `
    <thead><tr><th></th>${columns.map(({ label, kit }) => `<th style="--kit-color:${kit?.color ?? "#9fb0cc"}"><button type="button" data-compare="${kit.key}"><img src="${kit.skin}" alt="">${escapeHtml(label)}</button></th>`).join("")}</tr></thead>
    <tbody>
      <tr class="kit-compare-group"><th colspan="${columns.length + 1}">Kit y extras</th></tr>
      <tr><th>Kit del rango</th>${columns.map(({ kit }, index) => cell(index === 0 ? "Kit Usuario (gratis)" : `${kit.items.length} objetos · cada 9 días`)).join("")}</tr>
      <tr><th>DiosesCoins al comprar</th>${columns.map(({ kit }) => cell(kit.coins ? `<span class="kit-coins"><img src="${coinIcon}" alt="">${kit.coins}</span>` : "—")).join("")}</tr>
      <tr><th>Acceso sin cola</th>${columns.map((_, index) => cell(check(index > 0))).join("")}</tr>
      <tr><th>/recompensa del rango</th>${columns.map((_, index) => cell(check(index >= 3))).join("")}</tr>
      <tr><th>No pierdes experiencia</th>${columns.map((_, index) => cell(check(index >= 4))).join("")}</tr>
      <tr class="kit-compare-group"><th colspan="${columns.length + 1}">Límites</th></tr>
      ${table.limits.map(([label, values]) => `<tr><th>${escapeHtml(label)}</th>${values.map((value) => cell(escapeHtml(value))).join("")}</tr>`).join("")}
      <tr class="kit-compare-group"><th colspan="${columns.length + 1}">Comandos</th></tr>
      ${table.commands.map(([command, from]) => `<tr><th><code>${command}</code></th>${columns.map((_, index) => cell(check(index >= from))).join("")}</tr>`).join("")}
    </tbody>`;
  document.getElementById("kit-compare").addEventListener("click", (event) => {
    const button = event.target.closest("[data-compare]");
    if (!button) return;
    select(button.dataset.compare, false);
    document.querySelector(".pokepad").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const initial = kits.find((kit) => kit.key === location.hash.slice(1));
  if (initial) {
    state.group = initial.group;
    state.key = initial.key;
  }
  render();
})();
