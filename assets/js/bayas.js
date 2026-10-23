// Bayas y Abonos. Datos: data/bayas-data.js (tools/build_bayas_data.py, Cobblemon 1.7.3).
(function () {
  "use strict";
  const D = window.BAYAS_DATA;
  if (!D) return;

  // ---------- Utilidades ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (text) => String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(`wiki-diosesmon-bayas-${key}`); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(`wiki-diosesmon-bayas-${key}`, JSON.stringify(value)); } catch (e) { /* sin almacenamiento */ } },
  };
  const range = ([a, b]) => (a === b ? `${a}` : `${a}–${b}`);
  const real = ([a, b]) => [Math.floor((a * 14) / 10), Math.floor((b * 14) / 10)];
  const pct = (x) => `${Math.round(x * 100)} %`;
  const shortName = (b) => b.name.replace(/^Baya /, "");

  D.berries.sort((a, b) => a.name.localeCompare(b.name, "es"));
  const B = Object.fromEntries(D.berries.map((b) => [b.id, b]));
  const M = Object.fromEntries(D.mulches.map((m) => [m.id, m]));
  const CAT_ICON = { heal: "❤️", status: "💊", pp: "🔋", ev: "📉", resist: "🛡️", boost: "⬆️", counter: "💥", none: "🎣" };
  const FLAV_ICON = { SPICY: "🌶️", DRY: "🍂", SWEET: "🍬", BITTER: "☕", SOUR: "🍋" };
  const tagName = (tag) => (D.tags[tag] ? D.tags[tag].name : tag.split(":").pop());
  const colourHex = (b) => (D.colours[b.colour] || {}).hex || "var(--gold)";

  // Derivados: de qué cruce sale cada baya, con qué muta y su «nivel» de cruce.
  D.berries.forEach((b) => { b.sources = []; b.mutatesWith = []; });
  D.mutations.forEach((m) => {
    B[m.result].sources.push(m);
    B[m.a].mutatesWith.push({ with: m.b, result: m.result });
    if (m.a !== m.b) B[m.b].mutatesWith.push({ with: m.a, result: m.result });
  });
  D.berries.forEach((b) => {
    b.isWild = b.wild.length > 0;
    b.byMutation = b.sources.length > 0;
    b.depth = b.isWild ? 0 : Infinity;
    b.mutatesWith.sort((x, y) => shortName(B[x.with]).localeCompare(shortName(B[y.with]), "es"));
  });
  for (let changed = true; changed;) {
    changed = false;
    D.berries.forEach((b) => {
      b.sources.forEach((s) => {
        const d = 1 + Math.max(B[s.a].depth, B[s.b].depth);
        if (d < b.depth) { b.depth = d; changed = true; }
      });
    });
  }
  const flavMax = Math.max(...D.berries.flatMap((b) => Object.values(b.flavours)));
  const wildText = (b) => b.wild.map((w) => {
    const grove = w.grove[0] === w.grove[1] ? `${w.grove[0]} árbol` + (w.grove[0] > 1 ? "es" : "") : `arboledas de ${w.grove[0]} a ${w.grove[1]} árboles`;
    if (w.type === "all_biome") return `En cualquier bioma, en ${grove}.`;
    if (w.type === "specific_biome") return `Solo en ${tagName(w.tag)} (${grove}).`;
    return `En sus biomas preferidos, en ${grove}.`;
  }).join(" ");
  const originLabel = (b) => (b.isWild && b.byMutation ? "Silvestre y mutación" : b.isWild ? "Silvestre" : `Mutación · nivel ${b.depth}`);
  const searchText = (b) => norm([b.name, b.effect, D.categories[b.category], b.type ? D.types[b.type].name : "",
    ...b.mulches.map((m) => M[m].name), ...b.biomes.map(tagName), (D.colours[b.colour] || {}).name,
    ...b.dominant.map((f) => D.flavours[f])].join(" "));
  D.berries.forEach((b) => { b.search = searchText(b); });

  const sprite = (b, size = 32, cls = "") => (b.sprite
    ? `<img class="pixel ${cls}" src="${esc(b.sprite)}" alt="" width="${size}" height="${size}" loading="lazy">`
    : `<span class="bb-noimg ${cls}" style="width:${size}px;height:${size}px" aria-hidden="true">🍓</span>`);
  const mulchChip = (id, withName = true) => {
    const m = M[id];
    return `<span class="bb-mulch-chip" title="${esc(m.name)}"><img class="pixel" src="${esc(m.sprite)}" alt="" width="18" height="18">${withName ? esc(m.name.replace(/^Abono /, "")) : `<span class="sr-only">${esc(m.name)}</span>`}</span>`;
  };
  const berryLink = (b, size = 24) => `<button type="button" class="bb-blink" data-berry="${b.id}">${sprite(b, size)}<span>${esc(shortName(b))}</span></button>`;
  const typeChip = (t) => `<span class="type-chip" style="--type-color:${D.types[t].hex}">${esc(D.types[t].name)}</span>`;

  // ---------- Cabecera: resumen ----------
  const wildCount = D.berries.filter((b) => b.isWild).length;
  $("#bb-stats").innerHTML = [
    [D.berries.length, "bayas"], [wildCount, "silvestres"], [D.berries.length - wildCount, "solo por mutación"],
    [D.mutations.length, "cruces"], [D.mulches.length - 1, "abonos"],
  ].map(([n, t]) => `<li><strong>${n}</strong><span>${t}</span></li>`).join("");

  // ---------- Pestañas ----------
  const tabs = [...document.querySelectorAll('.v-tab[role="tab"]')];
  const tabIds = tabs.map((t) => t.id.replace("tab-", ""));
  function showTab(id, focus = false, push = true) {
    if (!tabIds.includes(id)) id = "catalogo";
    tabs.forEach((t) => {
      const on = t.id === `tab-${id}`;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      if (on && focus) t.focus();
      if (on) {
        const bar = t.parentElement;
        if (t.offsetLeft < bar.scrollLeft) bar.scrollLeft = t.offsetLeft - 8;
        else if (t.offsetLeft + t.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = t.offsetLeft + t.offsetWidth - bar.clientWidth + 8;
      }
    });
    store.set("tab", id);
    if (push && location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => showTab(tabIds[i]));
    t.addEventListener("keydown", (e) => {
      const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      showTab(tabIds[(keys[e.key] + tabs.length) % tabs.length], true);
    });
  });
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-tab-link]");
    if (!link) return;
    e.preventDefault();
    if (dialog.open) dialog.close();
    showTab(link.dataset.tabLink);
    $(".v-tabs").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------- Ficha (diálogo) ----------
  const dialog = $("#bb-dialog");
  const dialogBody = $("#bb-dialog-body");
  $("#bb-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  function flavourBars(b) {
    return Object.keys(D.flavours).map((f) => {
      const v = b.flavours[f] || 0;
      return `<div class="bb-flav${v ? "" : " is-zero"}"><span>${FLAV_ICON[f]} ${esc(D.flavours[f])}</span><span class="bb-flav-bar"><span style="width:${(v / flavMax) * 100}%"></span></span><b>${v}</b></div>`;
    }).join("");
  }

  function openBerry(id) {
    const b = B[id];
    if (!b) return;
    const g = real(b.growth); const r = real(b.refresh);
    const biomeDetails = b.biomes.map((tag) => {
      const info = D.tags[tag] || { name: tag, biomes: [] };
      return `<li><strong>${esc(info.name)}</strong>${info.biomes.length ? `<span>${esc(info.biomes.join(", "))}</span>` : "<span>Sin biomas en el mundo del servidor</span>"}</li>`;
    }).join("");
    const uses = [];
    if (b.bait.length) uses.push(`<li><strong>🎣 Cebo en la Poké Caña:</strong> ${b.bait.map((e) => `${esc(e.text)}`).join(" · ")}</li>`);
    uses.push(`<li><strong>🧃 Condimento de Bongurchata:</strong> aporta ${b.flavourTotal} puntos de sabor (${Object.entries(b.flavours).map(([f, v]) => `${esc(D.flavours[f])} ${v}`).join(", ")}).</li>`);
    if (b.category === "ev") uses.push(`<li><strong>📉 Bajar EVs:</strong> ${esc(b.fieldUse)} <a href="entrenamiento-ev.html#ev-how-title">Ver Entrenamiento EV →</a></li>`);
    else if (b.fieldUse) uses.push(`<li><strong>🎒 Fuera de combate:</strong> ${esc(b.fieldUse)}</li>`);

    dialogBody.innerHTML = `
      <header class="bb-d-head" style="--accent:${colourHex(b)}">
        <div class="bb-d-sprite">${sprite(b, 64)}</div>
        <div>
          <h2 id="bb-dialog-title">${esc(b.name)}</h2>
          <div class="bb-d-tags">
            <span class="v-badge">${CAT_ICON[b.category]} ${esc(D.categories[b.category])}</span>
            ${b.type ? typeChip(b.type) : ""}
            <span class="v-badge is-dim"><i class="bb-dot" style="--dot:${colourHex(b)}"></i>${esc((D.colours[b.colour] || {}).name || b.colour)}</span>
            <span class="v-badge is-dim">${esc(originLabel(b))}</span>
          </div>
        </div>
      </header>
      <p class="bb-d-effect">${esc(b.effect)}</p>
      <dl class="bb-facts">
        <div><dt>Cosecha base</dt><dd>${range(b.yield)} <small>bayas · máx. ${b.maxFruits}</small></dd></div>
        <div><dt>Crecimiento</dt><dd>${range(b.growth)} min <small>≈ ${range(g)} min en juego</small></dd></div>
        <div><dt>Reposición</dt><dd>${range(b.refresh)} min <small>≈ ${range(r)} min en juego</small></dd></div>
        <div><dt>Harina de huesos</dt><dd>${pct(b.boneMeal)} <small>de subir una etapa</small></dd></div>
      </dl>
      <div class="bb-d-sections">
        <section><h3>Abono favorito</h3><div class="bb-chiprow">${b.mulches.map((m) => mulchChip(m)).join("")}</div>
          <p class="bb-muted">Fuera de su bioma preferido, este abono le da el extra de bioma.</p></section>
        <section><h3>Bioma preferido</h3><div class="bb-chiprow">${b.biomes.map((t) => `<span class="bb-tagchip">${esc(tagName(t))}</span>`).join("")}</div>
          <p class="bb-muted">${b.biomeBonus ? `Allí da +${b.biomeBonus[0]} a +${b.biomeBonus[1]} baya extra.` : ""}</p>
          <details class="bb-details"><summary>Ver biomas incluidos</summary><ul class="bb-biome-list">${biomeDetails}</ul></details></section>
        <section><h3>Silvestre</h3><p>${b.isWild ? esc(wildText(b)) : "No aparece silvestre: solo se consigue por mutación."}</p></section>
        <section><h3>Sabores</h3><div class="bb-flavs">${flavourBars(b)}</div></section>
        <section class="is-wide"><h3>De qué cruce sale</h3>${b.sources.length ? `<ul class="bb-pairs">${b.sources.map((s) => `<li>${berryLink(B[s.a])}<span class="bb-op">+</span>${berryLink(B[s.b])}</li>`).join("")}</ul>` : "<p>No sale de ningún cruce.</p>"}</section>
        <section class="is-wide"><h3>En qué muta con cada vecina</h3>${b.mutatesWith.length ? `<ul class="bb-pairs">${b.mutatesWith.map((m) => `<li>Junto a ${berryLink(B[m.with])}<span class="bb-op">→</span>${berryLink(B[m.result])}</li>`).join("")}</ul>` : "<p>No muta con ninguna baya.</p>"}</section>
        <section class="is-wide"><h3>Usos en Diosesmon</h3><ul class="bb-uses">${uses.join("")}</ul></section>
        ${b.drops.length ? `<section class="is-wide"><h3>La sueltan al ser derrotados</h3><p class="bb-drops">${b.drops.slice(0, 10).map((d) => `<span>${esc(d.name)} <b>${d.chance} %</b></span>`).join("")}${b.drops.length > 10 ? `<span class="bb-muted">y ${b.drops.length - 10} más</span>` : ""}</p></section>` : ""}
      </div>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    $(".bb-dialog-inner", dialog).scrollTop = 0;
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-berry]");
    if (el) openBerry(el.dataset.berry);
  });

  // ---------- 1. Catálogo ----------
  const cat = { q: "", use: "", flavour: "", colour: "", mutation: false };
  const usedCats = Object.keys(D.categories).filter((c) => D.berries.some((b) => b.category === c));
  const catUse = $("#cat-use");
  catUse.innerHTML = [["", "Todos"], ...usedCats.map((c) => [c, `${CAT_ICON[c]} ${D.categories[c]}`])]
    .map(([v, t]) => `<button type="button" class="v-chip" data-v="${v}" aria-pressed="${v === "" ? "true" : "false"}">${esc(t)}</button>`).join("");
  const catFlav = $("#cat-flavour");
  catFlav.innerHTML = [["", "Todos"], ...Object.entries(D.flavours).map(([k, v]) => [k, `${FLAV_ICON[k]} ${v}`])]
    .map(([v, t]) => `<button type="button" class="v-chip" data-v="${v}" aria-pressed="${v === "" ? "true" : "false"}">${esc(t)}</button>`).join("");
  const colourCounts = {};
  D.berries.forEach((b) => { colourCounts[b.colour] = (colourCounts[b.colour] || 0) + 1; });
  $("#cat-colour").insertAdjacentHTML("beforeend", Object.keys(D.colours).filter((c) => colourCounts[c])
    .sort((a, b) => D.colours[a].name.localeCompare(D.colours[b].name, "es"))
    .map((c) => `<option value="${c}">${esc(D.colours[c].name)} (${colourCounts[c]})</option>`).join(""));

  function pressChip(group, value) {
    group.querySelectorAll(".v-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.v === value)));
  }
  catUse.addEventListener("click", (e) => { const c = e.target.closest(".v-chip"); if (!c) return; cat.use = c.dataset.v; pressChip(catUse, cat.use); renderCatalog(); });
  catFlav.addEventListener("click", (e) => { const c = e.target.closest(".v-chip"); if (!c) return; cat.flavour = c.dataset.v; pressChip(catFlav, cat.flavour); renderCatalog(); });
  $("#cat-search").addEventListener("input", (e) => { cat.q = norm(e.target.value); renderCatalog(); });
  $("#cat-colour").addEventListener("change", (e) => { cat.colour = e.target.value; renderCatalog(); });
  $("#cat-mutation").addEventListener("change", (e) => { cat.mutation = e.target.checked; renderCatalog(); });
  $("#cat-reset").addEventListener("click", () => {
    Object.assign(cat, { q: "", use: "", flavour: "", colour: "", mutation: false });
    $("#cat-search").value = ""; $("#cat-colour").value = ""; $("#cat-mutation").checked = false;
    pressChip(catUse, ""); pressChip(catFlav, ""); renderCatalog();
  });

  function card(b) {
    return `<button type="button" class="bb-card" data-berry="${b.id}" style="--accent:${colourHex(b)}" aria-label="${esc(b.name)}: ver ficha">
      <span class="bb-card-top">
        <span class="bb-card-sprite">${sprite(b, 40)}</span>
        <span class="bb-card-name"><strong>${esc(shortName(b))}</strong><small>${CAT_ICON[b.category]} ${esc(D.categories[b.category])}</small></span>
        ${b.byMutation && !b.isWild ? '<span class="bb-card-badge" title="Solo se consigue por mutación"><span aria-hidden="true">🧬</span><span class="sr-only">Solo por mutación</span></span>' : ""}
      </span>
      <span class="bb-card-effect">${esc(b.effect)}</span>
      <span class="bb-card-meta">
        <span title="Cosecha base">🧺 ${range(b.yield)}</span>
        <span title="Crecimiento (minutos del mod)">⏱ ${range(b.growth)} min</span>
        <span class="bb-card-mulch">${b.mulches.map((m) => mulchChip(m, false)).join("")}</span>
      </span>
    </button>`;
  }

  function renderCatalog() {
    const list = D.berries.filter((b) => (!cat.q || b.search.includes(cat.q))
      && (!cat.use || b.category === cat.use)
      && (!cat.flavour || b.dominant.includes(cat.flavour))
      && (!cat.colour || b.colour === cat.colour)
      && (!cat.mutation || b.byMutation));
    $("#cat-grid").innerHTML = list.map(card).join("");
    $("#cat-empty").hidden = list.length > 0;
    $("#cat-count").textContent = `${list.length} de ${D.berries.length} bayas`;
  }

  // ---------- 2. Mutaciones ----------
  const results = D.berries.filter((b) => b.byMutation).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const allSorted = [...D.berries].sort((a, b) => a.name.localeCompare(b.name, "es"));
  $("#mut-target").innerHTML = `<option value="">Elige una baya…</option>` + results.map((b) => `<option value="${b.id}">${esc(b.name)}${b.isWild ? " (también silvestre)" : ""}</option>`).join("");
  const opts = `<option value="">Elige…</option>` + allSorted.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("");
  $("#mut-a").innerHTML = opts; $("#mut-b").innerHTML = opts;

  function layout(a, b) {
    const cells = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const berry = (x + y) % 2 === 0 ? a : b;
      cells.push(`<span class="bb-cell ${(x + y) % 2 ? "is-b" : "is-a"}">${sprite(berry, 24)}</span>`);
    }
    $("#mut-layout").innerHTML = cells.join("");
  }
  const howToGet = (b) => (b.isWild ? `<span class="bb-src is-wild">Silvestre</span>` : `<button type="button" class="bb-src is-mut" data-goto="${b.id}">Mutación · ver cómo</button>`);
  function biomeAdvice(a, b) {
    const shared = a.biomes.filter((t) => b.biomes.includes(t));
    if (shared.length) return `Las dos prefieren <strong>${shared.map((t) => esc(tagName(t))).join(", ")}</strong>: plántalas allí para el extra de cosecha.`;
    const mulch = a.mulches.filter((m) => b.mulches.includes(m));
    if (mulch.length) return `No comparten bioma, pero las dos tienen de favorito el <strong>${esc(M[mulch[0]].name)}</strong>.`;
    return `No comparten bioma ni abono favorito: ${esc(shortName(a))} prefiere ${a.biomes.map((t) => esc(tagName(t))).join(", ")}; ${esc(shortName(b))}, ${b.biomes.map((t) => esc(tagName(t))).join(", ")}.`;
  }
  function renderTarget() {
    const id = $("#mut-target").value;
    const out = $("#mut-target-out");
    if (!id) { out.innerHTML = `<p class="bb-muted">Elige una baya para ver qué dos tienes que plantar juntas.</p>`; return; }
    const t = B[id];
    const pairs = [...t.sources].sort((x, y) => Math.max(B[x.a].depth, B[x.b].depth) - Math.max(B[y.a].depth, B[y.b].depth));
    layout(B[pairs[0].a], B[pairs[0].b]);
    out.innerHTML = `
      <p class="bb-target-head">${sprite(t, 32)}<span><strong>${esc(t.name)}</strong> sale de ${pairs.length === 1 ? "este cruce" : `${pairs.length} cruces`}${t.depth > 1 ? ` · nivel ${t.depth}: necesitas mutaciones previas` : ""}.</span></p>
      <ul class="bb-recipes">${pairs.map((p) => {
        const a = B[p.a], b = B[p.b];
        return `<li class="bb-recipe">
          <div class="bb-recipe-row">
            <span class="bb-recipe-parent">${berryLink(a, 28)}${howToGet(a)}</span>
            <span class="bb-op">+</span>
            <span class="bb-recipe-parent">${berryLink(b, 28)}${howToGet(b)}</span>
          </div>
          <p class="bb-recipe-tip">🧪 <strong>Abono Sorpresa</strong> en los dos (50 % en vez de 12,5 %). ${biomeAdvice(a, b)}</p>
        </li>`;
      }).join("")}</ul>`;
  }
  $("#mut-target").addEventListener("change", renderTarget);
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-goto]");
    if (!g) return;
    $("#mut-target").value = g.dataset.goto;
    renderTarget();
    $("#mut-target").focus();
  });

  function renderPair() {
    const a = B[$("#mut-a").value], b = B[$("#mut-b").value];
    const out = $("#mut-pair-out");
    if (!a || !b) { out.innerHTML = `<p class="bb-muted">Elige dos bayas para ver si mutan al plantarlas juntas.</p>`; return; }
    const hit = D.mutations.find((m) => (m.a === a.id && m.b === b.id) || (m.a === b.id && m.b === a.id));
    const list = (x) => (x.mutatesWith.length ? x.mutatesWith.map((m) => `${berryLink(B[m.with], 20)}<span class="bb-op">→</span>${berryLink(B[m.result], 20)}`).map((s) => `<li>${s}</li>`).join("") : "<li>No muta con ninguna.</li>");
    if (a.id === b.id) {
      out.innerHTML = `<div class="v-note is-bad"><span aria-hidden="true">✋</span><p>Dos árboles de la misma baya no mutan. Elige dos bayas distintas.</p></div>`;
      return;
    }
    out.innerHTML = (hit
      ? `<div class="bb-pair-hit">${berryLink(a, 28)}<span class="bb-op">+</span>${berryLink(b, 28)}<span class="bb-op">→</span>${berryLink(B[hit.result], 36)}</div>
         <p class="bb-recipe-tip">Plántalas en damero y ponles <strong>Abono Sorpresa</strong>: al florecer, cada árbol tiene un 50 % de dar una ${esc(B[hit.result].name)}.</p>`
      : `<div class="v-note"><span aria-hidden="true">🌿</span><p><strong>${esc(shortName(a))}</strong> y <strong>${esc(shortName(b))}</strong> no mutan entre sí. Esto es lo que puede salir con cada una:</p></div>`)
      + (hit ? "" : `<div class="bb-two bb-mt-sm"><div><h4>${esc(shortName(a))} junto a…</h4><ul class="bb-pairs is-compact">${list(a)}</ul></div><div><h4>${esc(shortName(b))} junto a…</h4><ul class="bb-pairs is-compact">${list(b)}</ul></div></div>`);
  }
  $("#mut-a").addEventListener("change", renderPair);
  $("#mut-b").addEventListener("change", renderPair);

  function renderMutTable() {
    const q = norm($("#mut-search").value);
    const rows = D.mutations.filter((m) => !q || norm([B[m.result].name, B[m.a].name, B[m.b].name].join(" ")).includes(q))
      .sort((x, y) => B[x.result].name.localeCompare(B[y.result].name, "es") || B[x.a].name.localeCompare(B[y.a].name, "es"));
    $("#mut-table").innerHTML = rows.map((m) => `<tr>
      <td>${berryLink(B[m.result])}</td><td>${berryLink(B[m.a])}</td><td>${berryLink(B[m.b])}</td>
      <td><span class="v-badge is-dim">nivel ${B[m.result].depth}</span></td></tr>`).join("");
    $("#mut-count").textContent = `${rows.length} de ${D.mutations.length} cruces`;
  }
  $("#mut-search").addEventListener("input", renderMutTable);

  // ---------- 3. Abonos ----------
  const durationText = (m) => (m.duration === null ? "Ingrediente" : m.duration < 0 ? "No caduca" : `${m.duration} usos`);
  function renderMulches() {
    const q = norm($("#mulch-search").value);
    const list = D.mulches.filter((m) => !q || norm([m.name, m.effect, m.detail, ...m.favoriteOf.map((id) => B[id].name)].join(" ")).includes(q));
    $("#mulch-grid").innerHTML = list.map((m) => `
      <article class="v-card bb-mulch${m.favourite ? "" : " is-special"}">
        <header class="bb-mulch-head">
          <span class="bb-mulch-sprite"><img class="pixel" src="${esc(m.sprite)}" alt="" width="40" height="40"></span>
          <div><h3>${esc(m.name)}</h3><span class="v-badge${m.favourite || m.duration === null ? " is-dim" : ""}">${esc(durationText(m))}</span></div>
        </header>
        <p class="bb-mulch-effect">${esc(m.effect)}</p>
        ${m.detail ? `<p class="bb-muted">${esc(m.detail)}</p>` : ""}
        ${m.recipe ? `<p class="bb-recipe-line"><span>Receta${m.recipe.count > 1 ? ` (×${m.recipe.count})` : ""}:</span> ${m.recipe.ingredients.map(esc).join(" + ")}</p>` : ""}
        ${m.favourite ? `<div class="bb-fav"><span class="bb-filter-label">Favorito de ${m.favoriteOf.length} bayas</span><div class="bb-fav-list">${m.favoriteOf.map((id) => berryLink(B[id], 20)).join("")}</div></div>` : ""}
      </article>`).join("");
    $("#mulch-count").textContent = `${list.length} de ${D.mulches.length} abonos`;
  }
  $("#mulch-search").addEventListener("input", renderMulches);

  // ---------- 4. Tabla ----------
  let owned = new Set(store.get("granja", []));
  const obtainText = (b) => (b.byMutation
    ? b.sources.map((s) => `${shortName(B[s.a])} + ${shortName(B[s.b])}`).join(" / ") + (b.isWild ? " (también silvestre)" : "")
    : "Silvestre");
  const COLS = [
    { key: "own", label: "✓", sort: (b) => (owned.has(b.id) ? 0 : 1), csv: (b) => (owned.has(b.id) ? "sí" : "no") },
    { key: "name", label: "Baya", sort: (b) => b.name, csv: (b) => b.name },
    { key: "use", label: "Uso", sort: (b) => D.categories[b.category], csv: (b) => D.categories[b.category] },
    { key: "effect", label: "Efecto", sort: (b) => b.effect, csv: (b) => b.effect },
    { key: "yield", label: "Cosecha", sort: (b) => b.yield[0] * 10 + b.yield[1], csv: (b) => range(b.yield) },
    { key: "growth", label: "Crece (min)", sort: (b) => b.growth[0], csv: (b) => range(b.growth) },
    { key: "refresh", label: "Repone (min)", sort: (b) => b.refresh[0], csv: (b) => range(b.refresh) },
    { key: "mulch", label: "Abono favorito", sort: (b) => b.mulches.map((m) => M[m].name).join(), csv: (b) => b.mulches.map((m) => M[m].name).join(", ") },
    { key: "biome", label: "Bioma preferido", sort: (b) => b.biomes.map(tagName).join(), csv: (b) => b.biomes.map(tagName).join(", ") },
    { key: "obtain", label: "Mutación", sort: (b) => (b.byMutation ? `1${obtainText(b)}` : "0"), csv: obtainText },
  ];
  const tbl = { key: store.get("orden", "name"), dir: store.get("dir", 1), q: "", use: "", missing: false };
  if (!COLS.some((c) => c.key === tbl.key)) tbl.key = "name";
  $("#tbl-use").insertAdjacentHTML("beforeend", usedCats.map((c) => `<option value="${c}">${esc(D.categories[c])}</option>`).join(""));
  function renderHead() {
    $("#tbl-head").innerHTML = COLS.map((c) => {
      const s = tbl.key === c.key ? (tbl.dir > 0 ? "ascending" : "descending") : "none";
      const label = c.key === "own" ? '<span aria-hidden="true">✓</span><span class="sr-only">En la granja</span>' : esc(c.label);
      return `<th scope="col" aria-sort="${s}" class="bb-th-${c.key}"><button type="button" class="bb-sort" data-key="${c.key}">${label}<span class="bb-sort-ico" aria-hidden="true">${s === "ascending" ? "▲" : s === "descending" ? "▼" : "↕"}</span></button></th>`;
    }).join("");
  }
  function tableRows() {
    const col = COLS.find((c) => c.key === tbl.key);
    return D.berries.filter((b) => (!tbl.q || b.search.includes(tbl.q) || norm(obtainText(b)).includes(tbl.q))
      && (!tbl.use || b.category === tbl.use) && (!tbl.missing || !owned.has(b.id)))
      .sort((x, y) => {
        const a = col.sort(x), b = col.sort(y);
        const r = typeof a === "number" ? a - b : String(a).localeCompare(String(b), "es");
        return r * tbl.dir || x.name.localeCompare(y.name, "es");
      });
  }
  function renderTable() {
    renderHead();
    const rows = tableRows();
    $("#tbl-body").innerHTML = rows.map((b) => `<tr class="${owned.has(b.id) ? "is-owned" : ""}">
      <td class="bb-td-own"><input type="checkbox" class="bb-own" data-own="${b.id}" ${owned.has(b.id) ? "checked" : ""} aria-label="${esc(b.name)} está en la granja"></td>
      <td class="bb-td-name">${berryLink(b)}</td>
      <td><span class="bb-nowrap">${CAT_ICON[b.category]} ${esc(D.categories[b.category])}</span></td>
      <td class="bb-td-effect">${esc(b.effect)}</td>
      <td class="bb-num">${range(b.yield)}</td>
      <td class="bb-num">${range(b.growth)}</td>
      <td class="bb-num">${range(b.refresh)}</td>
      <td><span class="bb-chiprow">${b.mulches.map((m) => mulchChip(m)).join("")}</span></td>
      <td>${b.biomes.map((t) => esc(tagName(t))).join(", ")}</td>
      <td class="bb-td-obtain">${b.byMutation ? b.sources.map((s) => `${esc(shortName(B[s.a]))} + ${esc(shortName(B[s.b]))}`).join("<br>") : '<span class="bb-muted">Silvestre</span>'}</td>
    </tr>`).join("");
    $("#tbl-count").textContent = `${rows.length} bayas · ${owned.size} en la granja`;
  }
  $("#tbl-head").addEventListener("click", (e) => {
    const btn = e.target.closest(".bb-sort");
    if (!btn) return;
    tbl.dir = tbl.key === btn.dataset.key ? -tbl.dir : 1;
    tbl.key = btn.dataset.key;
    store.set("orden", tbl.key); store.set("dir", tbl.dir);
    renderTable();
    const again = document.querySelector(`.bb-sort[data-key="${tbl.key}"]`);
    if (again) again.focus();
  });
  $("#tbl-body").addEventListener("change", (e) => {
    const box = e.target.closest("[data-own]");
    if (!box) return;
    if (box.checked) owned.add(box.dataset.own); else owned.delete(box.dataset.own);
    store.set("granja", [...owned]);
    box.closest("tr").classList.toggle("is-owned", box.checked);
    $("#tbl-count").textContent = `${tableRows().length} bayas · ${owned.size} en la granja`;
  });
  $("#tbl-search").addEventListener("input", (e) => { tbl.q = norm(e.target.value); renderTable(); });
  $("#tbl-use").addEventListener("change", (e) => { tbl.use = e.target.value; renderTable(); });
  $("#tbl-owned").addEventListener("change", (e) => { tbl.missing = e.target.checked; renderTable(); });
  $("#tbl-csv").addEventListener("click", () => {
    const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["En la granja", "Baya", "Uso", "Efecto", "Cosecha", "Crecimiento (min)", "Reposición (min)", "Abono favorito", "Bioma preferido", "Cómo se consigue"];
    const lines = [head.map(cell).join(";"), ...tableRows().map((b) => COLS.map((c) => cell(c.csv(b))).join(";"))];
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wiki-diosesmon-bayas.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // ---------- Arranque ----------
  renderCatalog();
  renderTarget();
  // Bayas reductoras de EVs (bloque del Catálogo), en el orden de las estadísticas.
  const EV_ORDER = [["pomeg", "PS"], ["kelpsy", "Ataque"], ["qualot", "Defensa"], ["hondew", "At. Esp."], ["grepa", "Def. Esp."], ["tamato", "Velocidad"]];
  const evList = document.getElementById("bb-ev-list");
  if (evList) evList.innerHTML = EV_ORDER.filter(([id]) => B[id]).map(([id, stat]) => `<button type="button" class="bb-ev-item" data-berry="${id}">
      ${sprite(B[id], 40)}<span><b>${esc(shortName(B[id]))}</b><small>−10 EVs de ${esc(stat)}</small></span></button>`).join("");

  renderPair();
  layout(B.oran, B.cheri);
  renderMutTable();
  renderMulches();
  renderTable();
  const fromHash = location.hash.replace("#", "");
  if (fromHash.startsWith("baya-") && B[fromHash.slice(5)]) { showTab("catalogo", false, false); openBerry(fromHash.slice(5)); }
  else if (fromHash === "reductoras") { showTab("catalogo", false, false); document.getElementById("reductoras")?.scrollIntoView({ block: "start" }); }
  else showTab(tabIds.includes(fromHash) ? fromHash : store.get("tab", "catalogo"), false, tabIds.includes(fromHash));
  window.addEventListener("hashchange", () => { const h = location.hash.replace("#", ""); if (tabIds.includes(h)) showTab(h, false, false); });
})();
