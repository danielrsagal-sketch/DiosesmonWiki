// Crianza: pestañas de la página, Pokédex de grupos huevo, Tienda de IVs, sexos raros y objetos de la guía.
(function crianzaExtra() {
  const VC = window.VC;
  if (!VC) return;
  const { species, byId, STATS, EGG_GROUPS, NIDORAN, VOLBEAT_ILLUMISE, DITTO, RARITY, escapeHtml, money, normalize, sprite, itemIcon, canBreed, genderLabel, typeChip,
    firstBreedable, rootOf, spawnScore, safariOf, breedBlock } = VC;
  const $ = (id) => document.getElementById(id);
  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ---------- Pestañas pegajosas con resaltado de la sección visible ----------
  const tabs = $("cr-tabs");
  const tabLinks = [...tabs.querySelectorAll("a[href^='#']")];
  const sections = tabLinks.map((link) => document.getElementById(link.getAttribute("href").slice(1))).filter(Boolean);
  const setActive = (id) => {
    tabLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "true");
        const left = link.offsetLeft - (tabs.clientWidth - link.offsetWidth) / 2;
        if (tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left, behavior: "smooth" });
      } else link.removeAttribute("aria-current");
    });
  };
  // Los enlaces internos no tocan el # (el planificador guarda ahí su enlace corto).
  document.addEventListener("click", (event) => {
    const link = event.target.closest("#cr-tabs a[href^='#'], a[data-jump]");
    if (!link) return;
    event.preventDefault();
    const id = link.dataset.jump || link.getAttribute("href").slice(1);
    goTo(id);
    setActive(id);
  });
  let spyTicking = false;
  const spy = () => {
    spyTicking = false;
    const line = tabs.getBoundingClientRect().bottom + 70;
    let current = sections[0]?.id;
    sections.forEach((section) => { if (section.getBoundingClientRect().top <= line) current = section.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1].id;
    const active = tabs.querySelector(".is-active");
    if (!active || active.getAttribute("href") !== `#${current}`) setActive(current);
  };
  window.addEventListener("scroll", () => { if (!spyTicking) { spyTicking = true; requestAnimationFrame(spy); } }, { passive: true });

  // En pantallas táctiles el árbol se mueve con el dedo.
  if (window.matchMedia("(pointer: coarse)").matches) {
    const hint = document.querySelector(".cr-tree-hint");
    if (hint) hint.textContent = "Desliza con el dedo para moverte · − / + para el zoom";
  }

  // ---------- Objetos recios de la guía ----------
  $("cr-items").innerHTML = STATS.map((stat) => `
    <div class="cr-item" style="--stat-color:${stat.color}">
      <img class="pixel" src="${itemIcon(stat.key)}" alt="" width="48" height="48" loading="lazy">
      <strong>${stat.itemName}</strong>
      <span>${stat.label}</span>
    </div>`).join("");

  // ---------- Tienda de IVs ----------
  $("cr-bands").innerHTML = VC.IV_SHOP_BANDS.map((band) => `<li><span>IV ${band.min}–${band.max}</span><strong>$${money(band.price)}</strong><small>por punto</small></li>`).join("");
  $("cr-full-iv").textContent = `$${money(VC.ivShopCost(0, 31))}`;
  (function renderIvShop(container) {
    const presets = [
      { label: "Todo a 31", target: [31, 31, 31, 31, 31, 31] },
      { label: "Físico (AtE 0)", target: [31, 31, 31, 0, 31, 31] },
      { label: "Especial (Atq 0)", target: [31, 0, 31, 31, 31, 31] },
      { label: "Espacio Raro (Vel 0)", target: [null, null, null, null, null, 0] },
    ];
    container.innerHTML = `
      <h3>Calculadora</h3>
      <p class="cr-note">Pon los IVs que tiene tu Pokémon y los que quieres.</p>
      <div class="v-chips cr-shop-presets">${presets.map((preset, index) => `<button class="v-chip" type="button" data-preset="${index}">${preset.label}</button>`).join("")}</div>
      <div class="cr-shop-grid" role="table" aria-label="IVs actuales y objetivo">
        <div class="cr-shop-row is-head" role="row"><span role="columnheader">Stat</span><span role="columnheader">Actual</span><span role="columnheader">Objetivo</span><span role="columnheader">Coste</span></div>
        ${STATS.map((stat, index) => `
          <div class="cr-shop-row" role="row" style="--stat-color:${stat.color}">
            <span role="cell"><i></i>${stat.label}</span>
            <input role="cell" type="number" min="0" max="31" value="0" inputmode="numeric" data-iv-from="${index}" aria-label="${stat.label} actual">
            <input role="cell" type="number" min="0" max="31" value="0" inputmode="numeric" data-iv-to="${index}" aria-label="${stat.label} objetivo">
            <em role="cell" data-iv-cost="${index}">—</em>
          </div>`).join("")}
      </div>
      <div class="cr-shop-total" aria-live="polite"></div>`;
    const clamp = (input) => Math.min(31, Math.max(0, Number.parseInt(input.value, 10) || 0));
    const update = () => {
      let total = 0;
      let points = 0;
      STATS.forEach((_, index) => {
        const from = clamp(container.querySelector(`[data-iv-from="${index}"]`));
        const to = clamp(container.querySelector(`[data-iv-to="${index}"]`));
        const cost = VC.ivShopCost(from, to);
        total += cost;
        points += Math.abs(to - from);
        container.querySelector(`[data-iv-cost="${index}"]`).textContent = cost ? `$${money(cost)}` : "—";
      });
      container.querySelector(".cr-shop-total").innerHTML = `<span>${points} punto${points === 1 ? "" : "s"}</span><strong>$${money(total)}</strong>`;
    };
    container.addEventListener("input", update);
    container.addEventListener("change", (event) => {
      if (event.target.matches("input[type=number]")) { event.target.value = clamp(event.target); update(); }
    });
    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-preset]");
      if (!button) return;
      presets[button.dataset.preset].target.forEach((value, index) => {
        container.querySelector(`[data-iv-to="${index}"]`).value = value ?? container.querySelector(`[data-iv-from="${index}"]`).value;
      });
      update();
    });
    update();
  })($("cr-shop"));

  // ---------- Pokémon de un solo sexo o sin género ----------
  (function renderGenders(root) {
    const GROUPS = [
      { key: "female", title: "Solo hembra", symbol: "♀", test: (entry) => entry.male === 0,
        text: "Ella es la madre: crúzala con un <strong>macho de su mismo grupo huevo</strong> (o con Ditto) y el huevo sale de su especie. La cadena es normal." },
      { key: "male", title: "Solo macho", symbol: "♂", test: (entry) => entry.male === 1,
        text: "No hay hembra de su especie: <strong>siempre hace falta Ditto</strong> y el huevo sale de la especie del macho (de su forma base). Volbeat es la excepción: lo da una Illumise madre, 50/50 y sin elegir sexo." },
      { key: "none", title: "Sin género", symbol: "⚲", test: (entry) => entry.male < 0,
        text: "Crían con <strong>cualquier Pokémon de su grupo huevo</strong> (Beldum con el grupo Mineral, Rotom con Amorfo…) o con Ditto. Con un macho hacen de madre y del huevo sale su especie; sus crías no tienen sexo. Los legendarios del grupo Desconocido <strong>no crían</strong>." },
    ];
    const card = (entry) => {
      const block = breedBlock(entry);
      const off = Boolean(block) || entry.id === DITTO;
      const note = entry.id === DITTO ? "Pareja universal" : block ? (NIDORAN.has(entry.id) ? "Bug: no criar" : "No cría") : entry.egg.join(" · ");
      return `<button class="cr-gender-mon${off ? " is-off" : ""}" type="button" data-gender-target="${entry.id}" title="Planificar la crianza de ${escapeHtml(entry.name)}">
        <img class="pixel" src="${sprite(entry.id)}" alt="" width="64" height="64" loading="lazy">
        <strong>${escapeHtml(entry.name)}</strong>
        <small>${escapeHtml(note)}</small>
      </button>`;
    };
    root.innerHTML = GROUPS.map((group) => {
      const list = species.filter(group.test);
      const breedable = list.filter((entry) => !breedBlock(entry) && entry.id !== DITTO);
      const rest = list.filter((entry) => !breedable.includes(entry));
      return `<details class="cr-gender is-${group.key}"${group.key === "none" ? "" : " open"}>
        <summary><span class="cr-gender-symbol" aria-hidden="true">${group.symbol}</span><span><strong>${group.title}</strong><small>${list.length} Pokémon${rest.length ? ` · ${rest.length} no crían` : ""}</small></span></summary>
        <p>${group.text}</p>
        <div class="cr-gender-grid">${breedable.map(card).join("")}${rest.length ? `<p class="cr-gender-sub">No se pueden criar (o no conviene)</p>${rest.map(card).join("")}` : ""}</div>
      </details>`;
    }).join("");
    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-gender-target]");
      if (button) VC.selectTarget?.(Number(button.dataset.genderTarget));
    });
  })($("cr-genders"));

  // ---------- Pokédex de grupos huevo ----------
  (function pokedex() {
    const els = { search: $("cr-dex-search"), group: $("cr-dex-group"), safari: $("cr-dex-safari"), count: $("cr-dex-count"), list: $("cr-dex-list"), detail: $("cr-dex-detail") };
    const PAGE = 60;
    let limit = PAGE;
    let selected = null;
    const groupCount = {};
    species.forEach((entry) => entry.egg.forEach((group) => { groupCount[group] = (groupCount[group] ?? 0) + 1; }));
    els.group.innerHTML = `<option value="">Todos los grupos</option>${EGG_GROUPS.filter((group) => groupCount[group]).map((group) => `<option value="${group}">${group}${group === "Desconocido" ? " (no cría)" : ""} · ${groupCount[group]}</option>`).join("")}`;
    const isBase = (entry) => canBreed(entry) && firstBreedable(entry.id)?.id === entry.id;
    const rarityTag = (entry) => (entry.spawn ? `<b class="cr-rarity is-${entry.spawn.rarity}">${RARITY[entry.spawn.rarity]}</b>` : '<b class="cr-rarity is-none">Sin spawn salvaje</b>');
    const safariTag = (entry) => (safariOf[entry.id] ? '<span class="v-badge cr-safari-badge">Safari</span>' : "");

    function filtered() {
      const query = normalize(els.search.value);
      const group = els.group.value;
      return species.filter((entry) => (!group || entry.egg.includes(group))
        && (!els.safari.checked || safariOf[entry.id])
        && (!query || normalize(entry.name).includes(query) || String(entry.id) === query.replace(/^#0*/, "")));
    }

    function renderList() {
      const list = filtered();
      const filteredBy = els.search.value.trim() || els.group.value || els.safari.checked;
      els.count.textContent = list.length
        ? `${list.length} Pokémon${filteredBy ? (list.length === 1 ? " encontrado" : " encontrados") : " (gen 1–4)"}${list.length > limit ? ` · mostrando ${limit}` : ""}`
        : "No hay Pokémon con esos criterios.";
      els.list.innerHTML = list.slice(0, limit).map((entry) => {
        const block = breedBlock(entry);
        return `<button class="cr-dex-row${selected === entry.id ? " is-active" : ""}" type="button" data-dex="${entry.id}" aria-pressed="${selected === entry.id}">
          <img class="pixel" src="${sprite(entry.id)}" alt="" width="48" height="48" loading="lazy">
          <span class="cr-dex-main"><strong>${escapeHtml(entry.name)} <small>#${String(entry.id).padStart(3, "0")}</small></strong>
            <span class="cr-dex-groups">${entry.egg.map((group) => `<i class="${group === "Desconocido" ? "is-off" : ""}">${escapeHtml(group)}</i>`).join("")}</span></span>
          <span class="cr-dex-side">${safariTag(entry)}${block ? '<em class="is-off">No cría</em>' : rarityTag(entry)}</span>
        </button>`;
      }).join("") + (list.length > limit ? '<button class="v-btn is-ghost is-sm cr-dex-more" type="button" data-dex-more>Mostrar más</button>' : "");
    }

    function renderDetail(scroll) {
      const entry = byId[selected];
      if (!entry) {
        els.detail.innerHTML = '<div class="cr-dex-empty"><img class="pixel" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/oval-charm.png" alt="" width="48" height="48"><p>Elige un Pokémon de la lista para ver con quién cría y qué compañeros de su grupo son más fáciles de encontrar.</p></div>';
        return;
      }
      const block = breedBlock(entry);
      const base = rootOf(entry.id);
      const breeder = firstBreedable(entry.id);
      const groups = (breeder ?? entry).egg;
      const partners = !block && entry.id !== DITTO
        ? species.filter((other) => isBase(other) && other.id !== DITTO && !NIDORAN.has(other.id) && rootOf(other.id).id !== base.id && other.egg.some((group) => groups.includes(group)))
          .sort((a, b) => spawnScore(a) - spawnScore(b) || a.name.localeCompare(b.name, "es"))
        : [];
      const shown = partners.slice(0, 30);
      let rule = "";
      if (entry.id === DITTO) rule = "Ditto cría con cualquier Pokémon que pueda criar (menos con otro Ditto). El huevo sale de la especie del otro padre.";
      else if (block) rule = NIDORAN.has(entry.id) ? "La crianza de Nidoran♂ y Nidoran♀ está bugeada en el servidor: no la hagas." : breeder && breeder.id !== entry.id ? `Es una especie bebé: no cría, pero sale del huevo de ${breeder.name}.` : "Grupo Desconocido: no puede criar.";
      else if (VOLBEAT_ILLUMISE.has(entry.id)) rule = "Volbeat sale de una Illumise madre: la cría es 50/50 Volbeat/Illumise y no se puede elegir el sexo.";
      else if (entry.male === 1) rule = "Solo macho: únicamente cría con Ditto.";
      else if (entry.male < 0) rule = "Sin género: cría con cualquier Pokémon de su grupo huevo o con Ditto. Con un macho hace de madre y sus crías no tienen sexo.";
      else if (entry.male === 0) rule = "Solo hembra: es la madre, crúzala con un macho de su grupo (o Ditto).";
      else rule = `Cría con cualquiera de sus grupos (${groups.join(" o ")}) o con Ditto. Del huevo sale ${base.name}${base.id !== entry.id ? ` (forma base)` : ""}.`;
      els.detail.innerHTML = `
        <div class="cr-dex-card">
          <div class="cr-dex-head">
            <img src="${VC.SPRITES}/other/official-artwork/${entry.id}.png" alt="" width="120" height="120" loading="lazy">
            <div>
              <small>#${String(entry.id).padStart(3, "0")} · ${entry.types.map(typeChip).join(" ")}</small>
              <h3>${escapeHtml(entry.name)}</h3>
              <p class="cr-dex-rule${block ? " is-off" : ""}">${escapeHtml(rule)}</p>
            </div>
          </div>
          <ul class="cr-facts">
            <li><span>Grupos huevo</span><strong>${entry.egg.join(" · ")}</strong></li>
            <li><span>Sexo</span><strong>${genderLabel(entry.male)}</strong></li>
            <li><span>¿Cría?</span><strong class="${block ? "is-bad" : "is-ok"}">${block ? escapeHtml(block) : "Sí"}</strong></li>
            <li><span>Spawn</span><strong>${entry.spawn ? `${rarityTag(entry)} · Nv. ${entry.spawn.level}` : "Sin spawn salvaje"}</strong></li>
            <li class="is-wide"><span>Dónde</span><strong>${entry.spawn ? `${entry.spawn.places.map(escapeHtml).join(" · ")}${entry.spawn.notes.length ? ` <em>(${entry.spawn.notes.map(escapeHtml).join(", ")})</em>` : ""}` : "—"}</strong></li>
            <li class="is-wide"><span>Zona Safari</span><strong>${safariOf[entry.id] ? safariOf[entry.id].map(({ zone, rare }) => `${escapeHtml(zone.name)}${rare ? " (raro)" : ""}`).join(" · ") : "No sale"}</strong></li>
          </ul>
          ${!block && entry.id !== DITTO ? `<button class="v-btn cr-dex-use" type="button" data-dex-use="${entry.id}">🥚 Planificar su crianza</button>` : ""}
          ${partners.length ? `
            <h4>Compañeros en fase inicial <small>${partners.length} · de más fácil a más difícil</small></h4>
            <div class="cr-partners">${shown.map((other) => `
              <button class="cr-partner" type="button" data-dex="${other.id}" title="Ver ${escapeHtml(other.name)}">
                <img class="pixel" src="${sprite(other.id)}" alt="" width="48" height="48" loading="lazy">
                <strong>${escapeHtml(other.name)}</strong>
                <small>${other.spawn ? RARITY[other.spawn.rarity] : "Sin spawn"}${safariOf[other.id] ? " · Safari" : ""}</small>
              </button>`).join("")}</div>
            ${partners.length > shown.length ? `<p class="cr-note">Y ${partners.length - shown.length} más: filtra la lista por grupo para verlos todos.</p>` : ""}` : ""}
        </div>`;
      if (scroll && window.matchMedia("(max-width: 900px)").matches) els.detail.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const refresh = () => { limit = PAGE; renderList(); };
    els.search.addEventListener("input", refresh);
    els.group.addEventListener("change", refresh);
    els.safari.addEventListener("change", refresh);
    els.search.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const first = filtered()[0];
      if (first) { selected = first.id; renderList(); renderDetail(true); }
    });
    const onPick = (event) => {
      if (event.target.closest("[data-dex-more]")) { limit += PAGE; renderList(); return; }
      const use = event.target.closest("[data-dex-use]");
      if (use) { VC.selectTarget?.(Number(use.dataset.dexUse)); return; }
      const row = event.target.closest("[data-dex]");
      if (!row) return;
      selected = Number(row.dataset.dex);
      renderList();
      renderDetail(true);
    };
    els.list.addEventListener("click", onPick);
    els.detail.addEventListener("click", onPick);
    selected = VC.currentTargetId?.() ?? null;
    renderList();
    renderDetail(false);
  })();
})();
