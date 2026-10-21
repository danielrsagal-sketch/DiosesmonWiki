// Objetos (data/objetos-data.js): buscador con filtros, estado del crafteo en Diosesmon, dónde se consigue y receta.
(function objetos() {
  const data = window.DIOSESMON_OBJETOS;
  if (!data) return;
  const PAGE = 48;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const fold = (text) => String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const categories = new Map(data.categories.map(([key, label, emoji]) => [key, { label, emoji }]));
  const byId = new Map(data.items.map((item) => [item.id, item]));
  const STATE = {
    on: { label: "Se craftea", short: "✅ Se craftea", cls: "is-on" },
    off: { label: "Crafteo desactivado", short: "⛔ Desactivado", cls: "is-off" },
    none: { label: "Sin receta", short: "➖ Sin receta", cls: "is-none" },
  };
  const SOURCE = {
    kit: ["🎁", "Kits"], tesoro: ["🎰", "Tesoros"], drop: ["🐾", "Lo sueltan"], safari: ["🦒", "Zona Safari"], caza: ["🎯", "Cazas"],
    premio: ["🏆", "Premios"], bloque: ["⛏️", "Al picar o romper"], mundo: ["🗺️", "En el mundo"], staff: ["📝", "Según el staff"],
  };
  const STATIONS = {
    shaped: "Mesa de trabajo", shapeless: "Mesa de trabajo (sin forma)", pot: "Olla de campamento", potless: "Olla de campamento (sin forma)",
    smelt: "Horno", blast: "Alto horno", smoke: "Ahumador", campfire: "Hoguera", brew: "Soporte para pociones", stone: "Cortapiedras", smith: "Mesa de herrería",
  };
  const NOWHERE = {
    on: "Crafteándolo (no sale en kits, tesoros, drops ni Safari).",
    off: "Sin vías conocidas en el servidor: pregunta al staff.",
    none: "Sin vías registradas en la wiki.",
  };
  const kindOf = (source) => (source.t === "bloque" ? "mundo" : source.t);
  const items = data.items.map((item) => ({
    ...item,
    kinds: new Set((item.g ?? []).map(kindOf)),
    search: fold([item.n, item.id, item.d, item.x, item.note, categories.get(item.c)?.label,
      ...(item.g ?? []).map((source) => source.l ?? source.p?.map((mon) => mon[1]).join(" "))].join(" ")),
  }));
  const state = { q: "", cat: "", origin: "", s: "", where: "", shown: PAGE };

  // Resumen del banner.
  const counts = data.counts;
  $("ob-stats").innerHTML = [
    [counts.total, "objetos"],
    [counts.on, "se craftean"],
    [counts.off, "con el crafteo desactivado"],
    [items.filter((item) => item.g?.length).length, "con vías conocidas en el servidor"],
  ].map(([value, label], index) => `<li${index === 2 ? ' class="is-off"' : ""}><strong>${value}</strong> ${label}</li>`).join("");
  $("ob-cat").insertAdjacentHTML("beforeend", data.categories.map(([key, label, emoji]) => `<option value="${key}">${emoji} ${esc(label)} (${items.filter((item) => item.c === key).length})</option>`).join(""));
  $("ob-origin").insertAdjacentHTML("beforeend", Object.entries(data.origins).map(([key, label]) => `<option value="${key}">${esc(label)}</option>`).join(""));

  // Iconos y nombres de objetos e ingredientes.
  const refInfo = (ref) => {
    const first = String(ref).split("|")[0];
    const item = byId.get(first);
    if (item) return { name: item.n, icon: item.i, id: item.id };
    const [name, icon] = data.refs[first] ?? [first.replace(/^#?[^:]+:/, "").replace(/_/g, " "), null];
    return { name, icon, tag: first.startsWith("#") };
  };
  const altNames = (ref) => String(ref).split("|").map((part) => refInfo(part).name).join(" o ");
  const iconImg = (icon, size = 32, cls = "") => (icon
    ? `<img class="pixel ob-ico${cls}" src="${esc(icon)}" alt="" width="${size}" height="${size}" loading="lazy">`
    : `<span class="ob-ico ob-noicon${cls}" aria-hidden="true">?</span>`);

  const sourceText = (source) => (source.t === "drop"
    ? `Lo suelta${source.p.length > 1 ? "n" : ""}: ${source.p.slice(0, 4).map((mon) => mon[1]).join(", ")}${source.p.length > 4 ? ` y ${source.p.length - 4} más` : ""}`
    : source.l);
  const sourceLink = (source) => {
    const text = esc(sourceText(source));
    if (source.t === "drop") return `<a href="pokedex.html#pokemon/${source.p[0][0]}">${text}</a>`;
    return source.h ? `<a href="${esc(source.h)}">${text}</a>` : `<span>${text}</span>`;
  };

  const card = (item) => {
    const st = STATE[item.s];
    const sources = item.g ?? [];
    const shownSources = sources.slice(0, 3);
    const where = sources.length || item.x
      ? `<ul class="ob-where">${item.x ? `<li class="is-staff">📝 <span>${esc(item.x)}</span></li>` : ""}${shownSources.map((source) => `<li>${SOURCE[source.t]?.[0] ?? "•"} ${sourceLink(source)}</li>`).join("")}${sources.length > 3 ? `<li class="ob-more-src">+${sources.length - 3} vías más</li>` : ""}</ul>`
      : `<p class="ob-nowhere">${NOWHERE[item.s]}</p>`;
    return `<article class="ob-card ${st.cls}" data-id="${esc(item.id)}">
      <header class="ob-head">
        <span class="ob-slot">${iconImg(item.i, 40)}</span>
        <div class="ob-title">
          <h3><button type="button" class="ob-open" data-id="${esc(item.id)}">${esc(item.n)}</button></h3>
          <small>${categories.get(item.c)?.emoji ?? ""} ${esc(categories.get(item.c)?.label ?? "")}${item.o ? ` · <span class="ob-origin">${esc(data.origins[item.o])}</span>` : ""}</small>
        </div>
      </header>
      <span class="ob-state ${st.cls}">${st.short}</span>
      ${item.d ? `<p class="ob-desc">${esc(item.d)}</p>` : ""}
      ${item.note ? `<p class="ob-note">⚠️ ${esc(item.note)}</p>` : ""}
      <div class="ob-where-block"><b>Se consigue en</b>${where}</div>
      <button type="button" class="ob-detail-btn" data-id="${esc(item.id)}">${item.r ? "Ver receta y detalles" : "Ver detalles"} →</button>
    </article>`;
  };

  function filtered() {
    const words = fold(state.q).split(/\s+/).filter(Boolean);
    return items.filter((item) => (!state.cat || item.c === state.cat)
      && (!state.origin || (item.o ?? "cobblemon") === state.origin)
      && (!state.s || item.s === state.s)
      && (!state.where || item.kinds.has(state.where))
      && words.every((word) => item.search.includes(word)));
  }

  function render() {
    const list = filtered();
    $("ob-count").textContent = list.length;
    const off = list.filter((item) => item.s === "off").length;
    $("ob-summary").textContent = `${list.length} objeto${list.length === 1 ? "" : "s"}${off ? ` · ${off} con el crafteo desactivado` : ""}`;
    $("ob-grid").innerHTML = list.slice(0, state.shown).map(card).join("");
    $("ob-empty").hidden = list.length > 0;
    const more = $("ob-more");
    more.hidden = list.length <= state.shown;
    more.textContent = `Mostrar más (${Math.min(PAGE, list.length - state.shown)} de ${list.length - state.shown} restantes)`;
  }

  // Receta
  const slot = (ref, count = 1) => {
    if (!ref) return '<span class="ob-cell is-empty"></span>';
    const info = refInfo(ref);
    const title = esc(altNames(ref));
    const inner = `${iconImg(info.icon, 32)}${count > 1 ? `<i>${count}</i>` : ""}${info.tag ? '<em class="ob-tagmark">#</em>' : ""}`;
    return info.id && info.id !== current
      ? `<button type="button" class="ob-cell ob-open" data-id="${esc(info.id)}" title="${title}" aria-label="${title}">${inner}</button>`
      : `<span class="ob-cell" title="${title}" role="img" aria-label="${title}">${inner}</span>`;
  };
  let current = null;
  const recipeHtml = (item, recipe) => {
    let grid;
    const used = new Map();
    const count = (ref, amount = 1) => { if (ref) used.set(ref, (used.get(ref) ?? 0) + amount); };
    if (recipe.g) {
      const rows = recipe.g.length;
      const cols = Math.max(...recipe.g.map((row) => row.length));
      const cells = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          const ref = r < rows && c < cols ? recipe.g[r][c] : null;
          count(ref);
          cells.push(slot(ref));
        }
      }
      grid = `<div class="ob-craft">${cells.join("")}</div>`;
    } else {
      recipe.i.forEach(([ref, amount]) => count(ref, amount));
      grid = `<div class="ob-line">${recipe.i.map(([ref, amount]) => slot(ref, amount)).join(recipe.k === "brew" || recipe.k === "smith" ? '<span class="ob-plus">+</span>' : "")}</div>`;
    }
    const resultIcon = `<span class="ob-cell is-result" title="${esc(item.n)}">${iconImg(item.i, 32)}${recipe.n > 1 ? `<i>${recipe.n}</i>` : ""}</span>`;
    const ingredients = [...used].map(([ref, amount]) => `<li>${iconImg(refInfo(ref).icon, 20)} <span>${amount > 1 ? `${amount} × ` : ""}${esc(altNames(ref))}</span></li>`).join("");
    const by = recipe.m && recipe.m !== (item.o ?? "cobblemon") ? `<span class="v-badge is-dim">Receta de ${esc(data.origins[recipe.m] ?? recipe.m)}</span>` : "";
    return `<div class="ob-recipe">
      <p class="ob-station">${esc(STATIONS[recipe.k] ?? recipe.k)}${recipe.s ? " · admite condimento" : ""} ${by}</p>
      <div class="ob-recipe-row">${grid}<span class="ob-arrow" aria-hidden="true">➜</span>${resultIcon}</div>
      <ul class="ob-ingredients">${ingredients}</ul>
    </div>`;
  };

  const dialog = $("ob-dialog");
  function openDetail(id, push = true) {
    const item = byId.get(id);
    if (!item) return;
    current = id;
    const st = STATE[item.s];
    const groups = new Map();
    for (const source of item.g ?? []) {
      if (!groups.has(source.t)) groups.set(source.t, []);
      groups.get(source.t).push(source);
    }
    const sourceRows = [...groups].map(([type, list]) => {
      const [emoji, label] = SOURCE[type] ?? ["•", type];
      const body = type === "drop"
        ? `<p class="ob-mons">${list[0].p.map(([dex, name]) => `<a href="pokedex.html#pokemon/${dex}">${esc(name)}</a>`).join(", ")}</p>`
        : `<ul>${list.map((source) => `<li>${source.h ? `<a href="${esc(source.h)}">${esc(source.l)}</a>` : esc(source.l)}</li>`).join("")}</ul>`;
      return `<div class="ob-src"><h4>${emoji} ${esc(label)}</h4>${body}</div>`;
    }).join("");
    const staff = item.x ? `<div class="ob-src is-staff"><h4>📝 Según el staff</h4><p>${esc(item.x)}</p></div>` : "";
    const offWarn = item.s === "off"
      ? `<p class="v-note is-bad"><span>⛔ <strong>El crafteo de este objeto está desactivado en Diosesmon.</strong> ${item.r ? "La receta de abajo es la del mod: en el servidor no funciona." : ""} Solo se consigue por las vías indicadas.</span></p>`
      : "";
    $("ob-dialog-body").innerHTML = `
      <header class="ob-dhead">
        <span class="ob-slot is-big">${iconImg(item.i, 56)}</span>
        <div>
          <small>${categories.get(item.c)?.emoji ?? ""} ${esc(categories.get(item.c)?.label ?? "")} · ${esc(data.origins[item.o ?? "cobblemon"])}</small>
          <h2 id="ob-dialog-title">${esc(item.n)}</h2>
          <span class="ob-state ${st.cls}">${st.short}</span>
        </div>
      </header>
      ${item.d ? `<p class="ob-ddesc">${esc(item.d)}</p>` : ""}
      ${item.note ? `<p class="v-note"><span>⚠️ ${esc(item.note)}</span></p>` : ""}
      ${offWarn}
      <h3 class="ob-h3">Dónde se consigue en Diosesmon</h3>
      ${staff || sourceRows ? `<div class="ob-srcs">${staff}${sourceRows}</div>` : `<p class="ob-nowhere">${item.s === "on" ? "Se consigue crafteándolo: no sale en kits, tesoros, drops, Safari ni cazas." : "No tenemos vías registradas en kits, tesoros, drops, Safari ni cazas."}</p>`}
      ${item.c === "megas" ? '<p class="ob-link">💎 Más sobre las megas en <a href="megas.html">Megaevoluciones</a>.</p>' : ""}
      ${item.c === "fosiles" ? '<p class="ob-link">🦴 Más en <a href="fosiles.html">Fósiles</a>.</p>' : ""}
      ${/mulch/.test(item.id) ? '<p class="ob-link">🌱 Más en <a href="bayas.html">Bayas y Abonos</a>.</p>' : ""}
      <h3 class="ob-h3">${item.r ? `Receta${item.r.length > 1 ? "s" : ""} ${item.rs ? "en Diosesmon" : "del mod"}` : "Receta"}</h3>
      ${item.r && item.rs ? `<p class="v-note is-ok"><span>✅ <strong>Receta real del servidor</strong>.</span></p>` : ""}
      ${item.r && !item.rs && item.s === "on" ? '<p class="v-note"><span>⚠️ <strong>Es la receta original del mod.</strong> Puede que en Diosesmon sea distinta: compruébala en el juego con el buscador de recetas (EMI/JEI).</span></p>' : ""}
      ${item.r ? item.r.map((recipe) => recipeHtml(item, recipe)).join("") : '<p class="ob-nowhere">Este objeto no tiene receta en el mod: no se puede craftear.</p>'}
      <p class="ob-id"><code>${esc(item.id)}</code></p>`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector(".ob-dialog-inner").scrollTop = 0;
    if (push) history.replaceState(null, "", `#objeto/${encodeURIComponent(id)}`);
  }
  function closeDetail() {
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener("close", () => {
    current = null;
    if (location.hash.startsWith("#objeto/")) history.replaceState(null, "", location.pathname + location.search);
  });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDetail(); });
  $("ob-close").addEventListener("click", closeDetail);

  document.addEventListener("click", (event) => {
    const opener = event.target.closest(".ob-open, .ob-detail-btn");
    if (opener) { openDetail(opener.dataset.id); return; }
    const cardEl = event.target.closest(".ob-card");
    if (cardEl && !event.target.closest("a, button")) openDetail(cardEl.dataset.id);
  });

  // Filtros
  let timer;
  $("ob-q").addEventListener("input", (event) => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = event.target.value; state.shown = PAGE; render(); }, 120);
  });
  $("ob-cat").addEventListener("change", (event) => { state.cat = event.target.value; state.shown = PAGE; render(); });
  $("ob-origin").addEventListener("change", (event) => { state.origin = event.target.value; state.shown = PAGE; render(); });
  for (const [groupId, key] of [["ob-state", "s"], ["ob-where", "where"]]) {
    $(groupId).addEventListener("click", (event) => {
      const button = event.target.closest(".v-chip");
      if (!button) return;
      state[key] = button.dataset.value;
      state.shown = PAGE;
      $(groupId).querySelectorAll(".v-chip").forEach((chip) => chip.setAttribute("aria-pressed", String(chip === button)));
      render();
    });
  }
  $("ob-more").addEventListener("click", () => { state.shown += PAGE; render(); });

  render();
  const fromHash = () => {
    const match = location.hash.match(/^#objeto\/(.+)$/);
    if (match) openDetail(decodeURIComponent(match[1]), false);
  };
  window.addEventListener("hashchange", fromHash);
  fromHash();
}());
