// Competitivo: interfaz (equipos, editor, análisis, checklist, guía e importar/exportar).
(function () {
  "use strict";
  const C = window.VComp;
  if (!C) return;
  const KEY = "wiki-diosesmon-comp-teams";
  const TAB_KEY = "wiki-diosesmon-comp-tab";
  const OPEN_KEY = "wiki-diosesmon-comp-open";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
  const spriteUrl = (sp) => `${SPRITE}${sp.sprite}.png`;
  const typeChip = (t) => `<span class="type-chip" style="--type-color:${C.types[t].color}">${esc(C.types[t].es)}</span>`;
  const catBadge = (cat) => `<span class="c-cat ${C.CATEGORY[cat].cls}" title="${C.CATEGORY[cat].label}">${C.CATEGORY[cat].short}</span>`;
  const STAT_NAMES = ["PS", "Ataque", "Defensa", "At. Esp.", "Def. Esp.", "Velocidad"];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const isMobile = () => window.matchMedia("(max-width: 700px)").matches;

  // ---------- Estado ----------
  // Solo puede haber una mega por equipo (las Regresiones Primigenias no cuentan).
  const isMegaStone = (id) => { const it = C.itemById.get(id); return !!(it && it.mega && it.mega.kind === "mega"); };
  const megaHolder = (t, except = -1) => t.mons.findIndex((m, k) => m && k !== except && isMegaStone(m.item));
  const megaStripped = [];
  // Formatos: 6 (normal), 4 y 3 (regulaciones, Torre Batalla…).
  const SIZES = [6, 4, 3];
  function makeTeam(name, mons = [], size = 6) {
    size = SIZES.includes(size) ? size : 6;
    const list = mons.slice(0, size);
    while (list.length < size) list.push(null);
    let holder = null;
    for (const mon of list) {
      if (!mon || !isMegaStone(mon.item)) continue;
      if (!holder) { holder = mon; continue; }
      megaStripped.push(`${C.speciesById.get(mon.sp).es}: se le quita la ${C.itemById.get(mon.item).es} (solo una mega por equipo y ya la tiene ${C.speciesById.get(holder.sp).es}).`);
      mon.item = "";
    }
    return { id: uid(), name: name || "Equipo", size, mons: list, checks: {}, noMega: [] };
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && Array.isArray(raw.teams) && raw.teams.length) {
        const teams = raw.teams.map((t) => {
          const team = makeTeam(String(t.name || "Equipo").slice(0, 40), (Array.isArray(t.mons) ? t.mons : []).map(C.sanitizeMon), t.size);
          team.id = typeof t.id === "string" ? t.id : team.id;
          team.noMega = Array.isArray(t.noMega) ? t.noMega.filter((i) => Number.isInteger(i) && i >= 0 && i < team.size) : [];
          team.checks = t.checks && typeof t.checks === "object" ? Object.fromEntries(Object.entries(t.checks).filter(([, v]) => v === true)) : {};
          return team;
        });
        return { teams, active: teams.some((t) => t.id === raw.active) ? raw.active : teams[0].id };
      }
    } catch (error) { /* almacenamiento no disponible o dañado */ }
    const first = makeTeam("Mi primer equipo");
    return { teams: [first], active: first.id };
  }
  let store = load();
  const loadStripped = megaStripped.splice(0);
  let selected = 0;
  let openSecs = (() => { try { return JSON.parse(localStorage.getItem(OPEN_KEY) || "null"); } catch (e) { return null; } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (error) { /* modo privado */ } };
  const team = () => store.teams.find((t) => t.id === store.active) || store.teams[0];
  const monAt = (i) => team().mons[i];
  const spOf = (mon) => C.speciesById.get(mon.sp);
  const displayName = (mon) => (mon.nick ? mon.nick : spOf(mon).es);
  // Forma que se muestra de un Pokémon del equipo: la mega/primigenia si su interruptor está en ON.
  const megaOn = (t, i) => !(t.noMega || []).includes(i);
  const megaBlocked = (t, mon) => {
    const bf = C.battleForm(mon);
    return !!(bf && bf.mega.kind === "mega" && !isMegaStone(mon.item) && megaHolder(t, t.mons.indexOf(mon)) >= 0);
  };
  const formOf = (mon, t = team()) => (megaBlocked(t, mon) ? null : C.battleForm(mon));
  const viewOf = (mon) => {
    const t = team();
    const i = t.mons.indexOf(mon);
    const bf = i >= 0 && megaOn(t, i) ? formOf(mon, t) : null;
    return bf ? bf.mon : mon;
  };

  // ---------- Utilidades de interfaz ----------
  let toastTimer = 0;
  function toast(text) {
    const el = $("#c-toast");
    el.textContent = text;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2200);
  }
  async function copy(text, okMsg) {
    if (!text) return toast("No hay nada que copiar todavía.");
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) { /* sin portapapeles */ }
      ta.remove();
    }
    toast(okMsg);
  }
  function ask({ title, text = "", input = null, ok = "Aceptar", danger = false }) {
    const dlg = $("#c-dialog");
    $("#c-dialog-title").textContent = title;
    $("#c-dialog-text").textContent = text;
    $("#c-dialog-text").hidden = !text;
    const field = $("#c-dialog-field");
    const inp = $("#c-dialog-input");
    field.hidden = input === null;
    inp.value = input ?? "";
    const okBtn = $("#c-dialog-ok");
    okBtn.textContent = ok;
    okBtn.classList.toggle("is-danger", danger);
    return new Promise((resolve) => {
      dlg.addEventListener("close", () => {
        if (dlg.returnValue !== "ok") return resolve(null);
        resolve(input === null ? true : inp.value.trim());
      }, { once: true });
      dlg.returnValue = "";
      dlg.showModal();
      if (input !== null) { inp.focus(); inp.select(); }
    });
  }

  // Combobox con buscador (especies, objetos, movimientos).
  function combo(wrap, { label, value, placeholder, options, onPick }) {
    const listId = `cb-${uid()}`;
    wrap.classList.add("c-combo");
    wrap.innerHTML = `<input class="v-input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${listId}" aria-label="${esc(label)}" placeholder="${esc(placeholder || "")}" autocomplete="off" spellcheck="false" value="${esc(value)}"><ul class="c-combo-list" id="${listId}" role="listbox" hidden></ul>`;
    const input = $("input", wrap);
    const list = $("ul", wrap);
    let current = [];
    let active = -1;
    const draw = () => {
      current = options(C.norm(input.value === value ? "" : input.value));
      active = current.length ? 0 : -1;
      list.innerHTML = current.length
        ? current.map((o, i) => `<li role="option" id="${listId}-${i}" data-i="${i}" aria-selected="${i === active}">${o.html}</li>`).join("")
        : `<li class="c-combo-empty">Sin resultados</li>`;
      input.setAttribute("aria-activedescendant", active >= 0 ? `${listId}-0` : "");
    };
    const open = () => { draw(); list.hidden = false; input.setAttribute("aria-expanded", "true"); };
    const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.value = value; };
    const setActive = (i) => {
      if (!current.length) return;
      active = (i + current.length) % current.length;
      $$("li[role=option]", list).forEach((li, k) => li.setAttribute("aria-selected", String(k === active)));
      const li = $(`#${listId}-${active}`);
      if (li) { li.scrollIntoView({ block: "nearest" }); input.setAttribute("aria-activedescendant", li.id); }
    };
    const pick = (i) => { const o = current[i]; if (!o) return; list.hidden = true; input.setAttribute("aria-expanded", "false"); onPick(o.id); };
    input.addEventListener("focus", () => { input.select(); open(); });
    input.addEventListener("input", () => { draw(); list.hidden = false; input.setAttribute("aria-expanded", "true"); });
    input.addEventListener("blur", () => setTimeout(close, 120));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) open(); else setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") { e.preventDefault(); if (!list.hidden) pick(active); }
      else if (e.key === "Escape") { close(); input.blur(); }
    });
    list.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const li = e.target.closest("li[data-i]");
      if (li) pick(Number(li.dataset.i));
    });
  }
  const matchAll = (text, q) => !q || q.split(" ").every((w) => text.includes(w));

  // ---------- Pestañas ----------
  const TABS = ["equipos", "analisis", "checklist", "guia"];
  let activeTab = "equipos";
  function showTab(name, focus = false) {
    if (!TABS.includes(name)) name = "equipos";
    activeTab = name;
    for (const t of TABS) {
      const btn = $(`#tab-${t}`);
      const on = t === name;
      btn.setAttribute("aria-selected", String(on));
      btn.tabIndex = on ? 0 : -1;
      $(`#panel-${t}`).hidden = !on;
    }
    if (focus) $(`#tab-${name}`).focus();
    try { localStorage.setItem(TAB_KEY, name); } catch (error) { /* nada */ }
    if (name === "analisis") renderAnalysis();
    if (name === "checklist") renderChecklist();
    if (name === "guia") renderGuide();
  }
  $(".v-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".v-tab");
    if (!btn) return;
    showTab(btn.id.replace("tab-", ""));
    const tabs = $(".v-tabs");
    if (window.scrollY > tabs.offsetTop) window.scrollTo({ top: tabs.offsetTop - 80, behavior: "smooth" });
  });
  $(".v-tabs").addEventListener("keydown", (e) => {
    const i = TABS.indexOf(activeTab);
    if (e.key === "ArrowRight") showTab(TABS[(i + 1) % TABS.length], true);
    else if (e.key === "ArrowLeft") showTab(TABS[(i + TABS.length - 1) % TABS.length], true);
  });

  // ---------- Barra de equipos ----------
  function renderTeamSelect() {
    $("#c-team").innerHTML = store.teams.map((t) => {
      const n = t.mons.filter(Boolean).length;
      return `<option value="${esc(t.id)}"${t.id === store.active ? " selected" : ""}>${esc(t.name)} · ${n}/${t.size}</option>`;
    }).join("");
    const t = team();
    $("#c-size").innerHTML = SIZES.map((n) => `<button type="button" class="v-chip" data-size="${n}" aria-pressed="${n === t.size}">${n}</button>`).join("");
  }
  $("#c-size").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-size]");
    if (!b) return;
    const t = team();
    const size = Number(b.dataset.size);
    if (size === t.size) return;
    const filled = t.mons.filter(Boolean);
    if (filled.length > size) {
      const extra = filled.slice(size).map(displayName).join(", ");
      const okCut = await ask({ title: `¿Pasar a ${size} Pokémon?`, text: `El equipo tiene ${filled.length}. Se quitarán los últimos: ${extra}.`, ok: "Quitar", danger: true });
      if (!okCut) return;
    }
    // Se juntan los Pokémon al principio para no perder ninguno al reducir huecos.
    const list = size < t.size ? filled.slice(0, size) : t.mons.slice();
    while (list.length < size) list.push(null);
    t.size = size; t.mons = list; t.noMega = [];
    selected = Math.min(selected, size - 1);
    save(); renderAll();
    toast(`Equipo de ${size} Pokémon.`);
  });
  $("#c-team").addEventListener("change", (e) => { store.active = e.target.value; selected = 0; save(); renderAll(); });
  $("#c-new").addEventListener("click", async () => {
    const name = await ask({ title: "Nuevo equipo", input: `Equipo ${store.teams.length + 1}`, ok: "Crear" });
    if (name === null) return;
    const t = makeTeam(name.slice(0, 40) || `Equipo ${store.teams.length + 1}`, [], team().size);
    store.teams.push(t); store.active = t.id; selected = 0; save(); renderAll();
    toast(`Equipo «${t.name}» creado.`);
  });
  $("#c-rename").addEventListener("click", async () => {
    const name = await ask({ title: "Renombrar equipo", input: team().name, ok: "Guardar" });
    if (!name) return;
    team().name = name.slice(0, 40); save(); renderTeamSelect(); renderIO();
  });
  $("#c-dup").addEventListener("click", () => {
    const src = team();
    const copyTeam = makeTeam(`${src.name} (copia)`.slice(0, 40), src.mons.map((m) => (m ? JSON.parse(JSON.stringify(m)) : null)), src.size);
    copyTeam.checks = { ...src.checks };
    store.teams.splice(store.teams.indexOf(src) + 1, 0, copyTeam);
    store.active = copyTeam.id; save(); renderAll();
    toast("Equipo duplicado.");
  });
  $("#c-del").addEventListener("click", async () => {
    const t = team();
    const n = t.mons.filter(Boolean).length;
    const okDel = await ask({ title: `¿Borrar «${t.name}»?`, text: n ? `Se perderán sus ${n} Pokémon y su checklist. No se puede deshacer.` : "El equipo está vacío.", ok: "Borrar", danger: true });
    if (!okDel) return;
    store.teams = store.teams.filter((x) => x !== t);
    if (!store.teams.length) store.teams.push(makeTeam("Mi primer equipo"));
    store.active = store.teams[0].id; selected = 0; save(); renderAll();
    toast("Equipo borrado.");
  });

  // ---------- Tarjetas del equipo ----------
  function renderSlots() {
    const t = team();
    $("#c-slots").innerHTML = t.mons.map((mon, i) => {
      const sel = i === selected ? " is-selected" : "";
      if (!mon) {
        return `<button type="button" class="c-slot is-empty${sel}" data-slot="${i}" aria-pressed="${i === selected}"><span class="c-slot-plus" aria-hidden="true">＋</span><span>Hueco ${i + 1}</span><small>Añadir Pokémon</small></button>`;
      }
      const view = viewOf(mon);
      const sp = spOf(view);
      const item = C.itemById.get(mon.item);
      const nat = C.natureById.get(mon.nat);
      const megaAbName = view !== mon ? formOf(mon).ability : "";
      const ab = megaAbName ? { es: megaAbName } : C.abilityById.get(mon.ab);
      const moves = mon.moves.map((id) => {
        const mv = C.moveById.get(id);
        return mv ? `<li style="--type-color:${C.types[mv.type].color}">${esc(mv.es)}</li>` : `<li class="is-empty">—</li>`;
      }).join("");
      const evs = C.evTotal(mon);
      return `<button type="button" class="c-slot${sel}" data-slot="${i}" aria-pressed="${i === selected}" aria-label="Editar ${esc(displayName(mon))}">
        <span class="c-slot-head">
          <img class="pixel" src="${spriteUrl(sp)}" alt="" width="72" height="72" loading="lazy">
          <span class="c-slot-id">
            <strong>${esc(mon.nick || sp.es)}</strong>
            ${mon.nick ? `<small>${esc(sp.es)}</small>` : ""}
            <span class="c-slot-types">${sp.types.map(typeChip).join("")}</span>
          </span>
          <span class="c-slot-lv">Nv. ${mon.lvl}</span>
        </span>
        <span class="c-slot-meta">
          <span title="Objeto">🎒 ${item ? esc(item.es) : '<em>Sin objeto</em>'}</span>
          <span title="Habilidad">✦ ${ab ? esc(ab.es) : "—"}</span>
          <span title="Naturaleza y EVs">🌿 ${nat ? esc(nat.es) : "—"} · ${evs}/510 EVs</span>
        </span>
        <ul class="c-slot-moves">${moves}</ul>
      </button>`;
    }).join("");
  }
  $("#c-slots").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-slot]");
    if (!btn) return;
    selectSlot(Number(btn.dataset.slot), true);
  });
  function selectSlot(i, scroll) {
    selected = i;
    renderSlots();
    renderEditor();
    if (scroll) {
      const ed = $("#c-editor");
      const top = ed.getBoundingClientRect().top;
      if (top > window.innerHeight * 0.6 || top < 60) window.scrollTo({ top: window.scrollY + top - 140, behavior: "smooth" });
      if (!monAt(i)) {
        setTimeout(() => {
          const active = document.activeElement;
          if (selected === i && !monAt(i) && (!active || active === document.body || active.closest("[data-slot]"))) $("#c-ed-species input")?.focus();
        }, 250);
      }
    }
  }

  // ---------- Editor ----------
  function speciesOptions(q) {
    const res = [];
    for (const sp of C.species) {
      if (!matchAll(sp.search, q)) continue;
      res.push(sp);
    }
    if (q) res.sort((a, b) => (b.search.startsWith(q) - a.search.startsWith(q)) || a.index - b.index);
    return res.slice(0, 60).map((sp) => ({
      id: sp.id,
      html: `<img class="pixel" src="${spriteUrl(sp)}" alt="" width="40" height="40" loading="lazy"><span class="c-opt-main"><b>${esc(sp.es)}</b><small>#${sp.num}${sp.en !== sp.es ? ` · ${esc(sp.en)}` : ""}</small></span><span class="c-opt-side">${sp.types.map(typeChip).join("")}${sp.treasure ? '<span class="v-badge">Tesoro</span>' : ""}</span>`,
    }));
  }
  // Las megapiedras de otros Pokémon solo salen si se buscan; la del Pokémon actual va la primera.
  const itemOptionsFor = (mon) => (q) => {
    const sp = spOf(mon);
    const own = new Set(C.megaStoneFor(sp).map((it) => it.id));
    const t = team();
    const other = megaHolder(t, t.mons.indexOf(mon));
    const taken = other >= 0 ? `Ya hay mega: ${displayName(t.mons[other])}` : "";
    const res = [{ id: "", html: `<span class="c-opt-main"><b>Sin objeto</b></span>`, search: "sin objeto ninguno" }];
    const list = [...C.items.filter((it) => own.has(it.id)), ...C.items.filter((it) => !own.has(it.id))];
    for (const it of list) {
      if (it.cat === "mg" && !own.has(it.id) && !q) continue;
      const text = C.norm(`${it.es} ${it.en} ${C.ITEM_CATS[it.cat]} ${it.effect} ${it.mega ? `${it.mega.base} ${it.mega.name} mega` : ""}`);
      if (!matchAll(text, q)) continue;
      const ico = it.icon ? `<img class="pixel" src="${it.icon}" alt="" width="32" height="32" loading="lazy">` : "";
      res.push({ id: it.id, html: `${ico}<span class="c-opt-main"><b>${esc(it.es)}</b><small>${esc(it.en)} · ${esc(it.effect)}</small></span><span class="c-opt-side"><span class="v-badge ${own.has(it.id) && !(taken && isMegaStone(it.id)) ? "" : "is-dim"}">${taken && isMegaStone(it.id) ? esc(taken) : own.has(it.id) ? "Su megapiedra" : C.ITEM_CATS[it.cat]}</span></span>` });
    }
    return q ? res.filter((o) => o.id || matchAll(o.search, q)) : res;
  };
  function moveOptions(mon, slot) {
    const ls = C.learnset(spOf(mon));
    const taken = new Set(mon.moves.filter((id, i) => id && i !== slot));
    const entries = [...ls.values()].sort((a, b) => a.move.es.localeCompare(b.move.es, "es"));
    return (q) => {
      const res = [];
      if (!q) res.push({ id: "", html: `<span class="c-opt-main"><b>— Vacío —</b><small>Quitar el movimiento</small></span>` });
      for (const e of entries) {
        const mv = e.move;
        if (taken.has(mv.id)) continue;
        const methods = C.methodLabels(e);
        const text = C.norm(`${mv.es} ${mv.en} ${C.types[mv.type].es} ${C.CATEGORY[mv.cat].label} ${methods.join(" ")}`);
        if (!matchAll(text, q)) continue;
        res.push({ id: mv.id, html: moveOptionHtml(mv, methods) });
      }
      return res;
    };
  }
  function moveOptionHtml(mv, methods) {
    return `<span class="c-opt-main"><b>${esc(mv.es)}</b><small>${esc(methods.join(" · "))}</small></span><span class="c-opt-side">${typeChip(mv.type)}${catBadge(mv.cat)}<span class="c-num">${mv.power || "—"}</span><span class="c-num">${mv.acc ? mv.acc + "%" : "∞"}</span></span>`;
  }
  function moveDetail(mon, id) {
    const e = C.learnset(spOf(mon)).get(id);
    if (!e) return `<span class="c-move-empty">Elige un movimiento</span>`;
    const mv = e.move;
    const stab = spOf(viewOf(mon)).types.includes(mv.type) && mv.cat ? '<span class="c-stab" title="Mismo tipo que el Pokémon: +50 % de daño">STAB</span>' : "";
    return `${typeChip(mv.type)}${catBadge(mv.cat)}${stab}<span class="c-move-stats"><span title="Potencia">Pot. ${mv.power || "—"}</span><span title="Precisión">Prec. ${mv.acc ? mv.acc + "%" : "∞"}</span><span title="PP">PP ${mv.pp}</span>${mv.prio ? `<span title="Prioridad">Prio. ${mv.prio > 0 ? "+" : ""}${mv.prio}</span>` : ""}</span><span class="c-move-src">${esc(C.methodLabels(e).join(" · "))}</span>`;
  }
  function megaNote(m, mon) {
    const b = m.stats;
    const ab = m.abilities.length ? m.abilities.map((a) => a.name).join(" / ") : "sin habilidad todavía";
    const how = m.kind === "primal" ? "Al entrar en combate se transforma en" : "Al megaevolucionar pasa a";
    const bf = formOf(mon);
    const st = bf ? C.calcStats(bf.mon) : null;
    const withSet = st ? ` Con este set: ${st.map((v, i) => `${C.STAT_SHORT[i]} ${v}`).join(" · ")}.` : "";
    return `${how} ${m.name}: ${m.types.join("/")} · ${ab} · base PS ${b.hp}, Atq ${b.atk}, Def ${b.def}, AtE ${b.spa}, DfE ${b.spd}, Vel ${b.spe}.${withSet} Con el selector «Forma» cambias entre la forma normal y la mega, aquí y en el Análisis.`;
  }
  function itemWarnings(mon) {
    const sp = spOf(mon);
    const out = [];
    const mvs = mon.moves.map((id) => C.moveById.get(id)).filter(Boolean);
    if (mon.item === "eviolite" && !sp.canEvolve) out.push("El Mineral Evolutivo no hace nada: este Pokémon ya no puede evolucionar.");
    if (mon.item === "black_sludge" && !sp.types.includes(3)) out.push("El Lodo Negro daña a los Pokémon que no son de tipo Veneno.");
    if (mon.item === "assault_vest" && mvs.some((m) => m.cat === 0)) out.push("Con Chaleco Asalto no podrá usar sus movimientos de estado.");
    if (["choice_band", "choice_specs", "choice_scarf"].includes(mon.item) && mvs.some((m) => m.cat === 0)) out.push("Con un objeto Elección, los movimientos de estado le dejan bloqueado sin atacar.");
    if (mon.item === "light_ball" && sp.num !== 25) out.push("La Bola Luminosa solo funciona en Pikachu.");
    if ((mon.item === "metal_powder" || mon.item === "quick_powder") && sp.num !== 132) out.push("Este polvo solo funciona en Ditto.");
    const it = C.itemById.get(mon.item);
    if (it && it.mega && !C.megaFits(it, sp)) out.push(`La ${it.es} solo sirve a ${it.mega.base}${sp.form && it.mega.dex === sp.num ? " en su forma normal" : ""}: ${sp.es} no puede megaevolucionar con ella.`);
    if (C.megaFits(it, sp)) out.push(megaNote(it.mega, mon));
    else if (!(it && it.mega) && formOf(mon)) out.push(megaNote(formOf(mon).mega, mon));
    else if (megaBlocked(team(), mon)) out.push(`Aunque conoce Ascenso Draco, no puede megaevolucionar: solo puede haber una mega por equipo y ya la tiene ${displayName(team().mons[megaHolder(team())])}.`);
    if (mon.item.startsWith("power_") && mon.item !== "power_herb") out.push("Las piezas recias son para entrenar EVs: en combate reducen a la mitad la Velocidad.");
    return out;
  }

  function renderEditor() {
    const ed = $("#c-editor");
    const t = team();
    const mon = monAt(selected);
    const nav = `<div class="c-ed-nav" role="group" aria-label="Elegir hueco">${t.mons.map((m, i) => {
      const sp = m && spOf(m);
      return `<button type="button" data-goto="${i}" aria-pressed="${i === selected}" title="${m ? esc(displayName(m)) : `Hueco ${i + 1} vacío`}">${sp ? `<img class="pixel" src="${spriteUrl(sp)}" alt="" width="40" height="40">` : `<span>${i + 1}</span>`}</button>`;
    }).join("")}</div>`;
    if (!mon) {
      ed.innerHTML = `${nav}<div class="c-ed-empty"><h3>Hueco ${selected + 1}</h3><p>Busca el Pokémon por su nombre en español o en inglés, o por su número. Solo salen los disponibles en Diosesmon.</p><div class="c-ed-species" id="c-ed-species"></div></div>`;
      combo($("#c-ed-species"), { label: "Buscar Pokémon", value: "", placeholder: "Buscar Pokémon… (p. ej. garchomp, 445)", options: speciesOptions, onPick: (id) => pickSpecies(id) });
      bindEditorNav(ed);
      return;
    }
    const sp = spOf(mon);
    const bf = formOf(mon);
    const view = viewOf(mon);
    const vsp = spOf(view);
    const isMega = view !== mon;
    const stats = C.calcStats(view);
    const nat = C.natureById.get(mon.nat);
    const abilities = C.speciesAbilities(sp);
    const megaAb = isMega ? bf.mega.abilities[0] : null;
    const abOptions = abilities.map((a) => `<option value="${a.ability.id}"${a.ability.id === mon.ab ? " selected" : ""}>${esc(a.ability.es)}${a.hidden ? " (oculta)" : ""}</option>`).join("");
    const formPick = bf ? `<div class="c-form-pick" role="group" aria-label="Forma que se muestra">
            <span class="c-small">Forma:</span>
            <button type="button" class="v-chip" data-form="0" aria-pressed="${!isMega}">${esc(sp.es)}</button>
            <button type="button" class="v-chip" data-form="1" aria-pressed="${isMega}">${bf.mega.kind === "primal" ? "🔴" : "💎"} ${esc(bf.mega.name)}</button>
          </div>` : "";
    const abField = isMega
      ? `<div class="v-field"><span>Habilidad (${bf.mega.kind === "primal" ? "primigenia" : "mega"})</span><div class="v-input c-ab-fixed" title="${esc(megaAb ? megaAb.desc : "")}">${esc(megaAb ? megaAb.name : "Sin habilidad todavía")}</div>
          <small class="c-small">Antes de transformarse: <select class="v-select c-ab-base" id="c-ed-ab" aria-label="Habilidad de la forma normal">${abOptions}</select></small></div>`
      : `<label class="v-field"><span>Habilidad</span><select class="v-select" id="c-ed-ab">${abOptions}</select></label>`;
    const total = C.evTotal(mon);
    const warns = itemWarnings(mon);
    const isOpen = (k) => (openSecs ? openSecs[k] !== false : !isMobile() || k === "set");
    ed.innerHTML = `${nav}
      <div class="c-ed-head">
        <img class="pixel c-ed-sprite" src="${spriteUrl(vsp)}" alt="${esc(vsp.es)}" width="112" height="112">
        <div class="c-ed-id">
          <div class="c-ed-row3">
            <div class="v-field"><span>Especie</span><div id="c-ed-species"></div></div>
            <label class="v-field"><span>Mote (opcional)</span><input class="v-input" id="c-ed-nick" maxlength="18" value="${esc(mon.nick)}" placeholder="${esc(sp.es)}" autocomplete="off"></label>
            <div class="v-field c-ed-level"><span>Nivel</span>
              <div class="c-level"><input class="v-input" id="c-ed-lvl" type="number" min="1" max="100" inputmode="numeric" value="${mon.lvl}">
              <button type="button" class="v-chip" data-lvl="50" aria-pressed="${mon.lvl === 50}">50</button><button type="button" class="v-chip" data-lvl="100" aria-pressed="${mon.lvl === 100}">100</button></div>
            </div>
          </div>
          <div class="c-ed-tags">${vsp.types.map(typeChip).join("")}<span class="c-small">#${sp.num} · ${esc(isMega ? vsp.es : sp.en)} · base ${vsp.base.reduce((a, b) => a + b, 0)}</span>${sp.treasure ? '<span class="v-badge">Tesoro</span>' : ""}</div>
          ${formPick}
        </div>
        <div class="c-ed-tools">
          <button type="button" class="v-btn is-ghost is-sm" data-move="-1" ${selected === 0 ? "disabled" : ""} title="Mover a la izquierda">← Mover</button>
          <button type="button" class="v-btn is-ghost is-sm" data-move="1" ${selected === 5 ? "disabled" : ""} title="Mover a la derecha">Mover →</button>
          <button type="button" class="v-btn is-ghost is-sm c-remove" id="c-ed-remove">Quitar</button>
        </div>
      </div>

      <details class="c-sec" data-sec="set"${isOpen("set") ? " open" : ""}>
        <summary>Habilidad, objeto y naturaleza</summary>
        <div class="c-sec-body c-ed-row3${isMega ? " is-mega" : ""}">
          ${abField}
          <div class="v-field"><span>Objeto</span><div id="c-ed-item"></div></div>
          <label class="v-field"><span>Naturaleza</span><select class="v-select" id="c-ed-nat">${C.natures.map((n) => `<option value="${n.id}"${n.id === mon.nat ? " selected" : ""}>${esc(n.es)}${n.up !== n.down ? ` (↑${C.STAT_SHORT[n.up]} ↓${C.STAT_SHORT[n.down]})` : " (neutra)"}</option>`).join("")}</select></label>
        </div>
        ${warns.length ? `<div class="c-sec-body"><p class="v-note">${warns.map(esc).join("<br>")}</p></div>` : ""}
        ${mon.item ? `<p class="c-small c-item-effect">${esc(C.itemById.get(mon.item).effect)}</p>` : ""}
      </details>

      <details class="c-sec" data-sec="moves"${isOpen("moves") ? " open" : ""}>
        <summary>Movimientos <span class="c-sum-note">${mon.moves.filter(Boolean).length}/4</span></summary>
        <div class="c-sec-body c-moves">
          ${[0, 1, 2, 3].map((i) => `<div class="c-move"><div class="c-move-pick" id="c-ed-move-${i}"></div><div class="c-move-info">${moveDetail(mon, mon.moves[i])}</div></div>`).join("")}
        </div>
        <p class="c-small c-sec-foot">Solo movimientos que ${esc(sp.es)} aprende jugando en Cobblemon 1.7.3 (nivel, MT, huevo o tutor). Busca por nombre, tipo o «física», «especial», «MT»…</p>
      </details>

      <details class="c-sec" data-sec="stats"${isOpen("stats") ? " open" : ""}>
        <summary>Estadísticas, EVs e IVs <span class="c-sum-note" id="c-ev-sum">${total}/510 EVs</span>${isMega ? ` <span class="v-badge">${esc(vsp.es)}</span>` : ""}</summary>
        <div class="c-sec-body">
          ${isMega ? `<p class="v-note c-mb"><span>Mostrando las estadísticas de <strong>${esc(vsp.es)}</strong>. Los EVs, los IVs y la naturaleza son los mismos que en la forma normal.</span></p>` : bf ? `<p class="c-small c-mb">Mostrando la forma normal. Elige <strong>${esc(bf.mega.name)}</strong> en «Forma» para ver sus estadísticas.</p>` : ""}
          <div class="c-presets">
            <span class="c-small">EVs:</span>
            <button type="button" class="v-chip" data-ev="1,5,0">252 Atq · 252 Vel · 4 PS</button>
            <button type="button" class="v-chip" data-ev="3,5,0">252 AtE · 252 Vel · 4 PS</button>
            <button type="button" class="v-chip" data-ev="0,1,4">252 PS · 252 Atq · 4 DfE</button>
            <button type="button" class="v-chip" data-ev="0,3,2">252 PS · 252 AtE · 4 Def</button>
            <button type="button" class="v-chip" data-ev="0,2,4">252 PS · 252 Def · 4 DfE</button>
            <button type="button" class="v-chip" data-ev="0,4,2">252 PS · 252 DfE · 4 Def</button>
            <button type="button" class="v-chip" data-ev="reset">0 EVs</button>
          </div>
          <div class="c-presets">
            <span class="c-small">IVs:</span>
            <button type="button" class="v-chip" data-iv="all">31 en todo</button>
            <button type="button" class="v-chip" data-iv="spe0">Vel 0 (Espacio Raro)</button>
            <button type="button" class="v-chip" data-iv="atk0">Atq 0 (especiales)</button>
          </div>
          <div class="c-stats" role="table" aria-label="Estadísticas">
            <div class="c-stat c-stat-headrow" role="row"><span role="columnheader">Stat</span><span role="columnheader">Base</span><span role="columnheader" class="c-hide-m">EVs</span><span role="columnheader">EV</span><span role="columnheader">IV</span><span role="columnheader">Total</span><span role="columnheader" class="c-hide-m"></span></div>
            ${stats.map((v, i) => statRow(mon, vsp, nat, i, v)).join("")}
          </div>
          <p class="c-ev-left" id="c-ev-left">${evLeftText(total)}</p>
          <p class="c-small">Fórmula oficial: PS = ⌊(2·Base + IV + ⌊EV/4⌋)·Nv/100⌋ + Nv + 10; resto = ⌊(⌊(2·Base + IV + ⌊EV/4⌋)·Nv/100⌋ + 5)·Naturaleza⌋. En Diosesmon el nivel máximo lo marcan tus medallas.</p>
        </div>
      </details>`;

    combo($("#c-ed-species"), { label: "Cambiar especie", value: sp.es, placeholder: "Buscar Pokémon…", options: speciesOptions, onPick: (id) => pickSpecies(id) });
    const item = C.itemById.get(mon.item);
    combo($("#c-ed-item"), { label: "Objeto", value: item ? item.es : "", placeholder: "Sin objeto · buscar…", options: itemOptionsFor(mon), onPick: (id) => {
      const other = isMegaStone(id) ? megaHolder(team(), selected) : -1;
      if (other >= 0) {
        const o = team().mons[other];
        toast(`Solo puede haber una mega por equipo: ${displayName(o)} ya lleva la ${C.itemById.get(o.item).es}.`);
        renderEditor();
        return;
      }
      mon.item = id; commit(true);
    } });
    for (let i = 0; i < 4; i++) {
      const mv = C.moveById.get(mon.moves[i]);
      combo($(`#c-ed-move-${i}`), {
        label: `Movimiento ${i + 1}`, value: mv ? mv.es : "", placeholder: `Movimiento ${i + 1}…`,
        options: moveOptions(mon, i), onPick: (id) => { mon.moves[i] = id; commit(true); },
      });
    }
    bindEditorNav(ed);
    bindEditor(ed, mon);
  }
  function statRow(mon, sp, nat, i, value) {
    const mark = nat && nat.up !== nat.down ? (nat.up === i ? '<b class="c-up" title="La naturaleza la sube un 10 %">↑</b>' : nat.down === i ? '<b class="c-down" title="La naturaleza la baja un 10 %">↓</b>' : "") : "";
    const ref = mon.lvl * 4.6 + 40;
    const pct = Math.min(100, (value / ref) * 100);
    const tier = pct > 75 ? "is-hi" : pct > 45 ? "is-mid" : "is-lo";
    return `<div class="c-stat" role="row" data-stat="${i}">
      <span class="c-stat-name" role="cell">${STAT_NAMES[i]} ${mark}</span>
      <span class="c-stat-base" role="cell">${sp.base[i]}</span>
      <input class="c-ev-range" type="range" min="0" max="252" step="4" value="${mon.evs[i]}" aria-label="EVs de ${STAT_NAMES[i]}">
      <input class="v-input c-ev" type="number" min="0" max="252" inputmode="numeric" value="${mon.evs[i]}" aria-label="EVs de ${STAT_NAMES[i]}" role="cell">
      <input class="v-input c-iv" type="number" min="0" max="31" inputmode="numeric" value="${mon.ivs[i]}" aria-label="IVs de ${STAT_NAMES[i]}" role="cell">
      <output class="c-stat-val" role="cell">${value}</output>
      <span class="c-bar ${tier}"><i style="width:${pct.toFixed(1)}%"></i></span>
    </div>`;
  }
  const evLeftText = (total) => (total > 510 ? `Te pasas por ${total - 510} EVs.` : total === 510 ? "EVs completos: 510 de 510." : `Quedan <b>${510 - total}</b> EVs por repartir.`);

  function bindEditorNav(ed) {
    $$("[data-goto]", ed).forEach((b) => b.addEventListener("click", () => selectSlot(Number(b.dataset.goto), false)));
  }
  function bindEditor(ed, mon) {
    $("#c-ed-nick").addEventListener("input", (e) => { mon.nick = e.target.value.slice(0, 18); commit(false); });
    const lvl = $("#c-ed-lvl");
    lvl.addEventListener("change", () => { mon.lvl = Math.min(100, Math.max(1, Math.round(Number(lvl.value)) || 100)); commit(true); });
    $$("[data-lvl]", ed).forEach((b) => b.addEventListener("click", () => { mon.lvl = Number(b.dataset.lvl); commit(true); }));
    $("#c-ed-ab").addEventListener("change", (e) => { mon.ab = e.target.value; commit(true); });
    $$("#c-editor [data-form]").forEach((b) => b.addEventListener("click", () => {
      const t = team();
      t.noMega = (t.noMega || []).filter((x) => x !== selected);
      if (b.dataset.form === "0") t.noMega.push(selected);
      commit(true);
      $(`#c-editor [data-form="${b.dataset.form}"]`)?.focus();
    }));
    $("#c-ed-nat").addEventListener("change", (e) => { mon.nat = e.target.value; commit(true); });
    $$("[data-move]", ed).forEach((b) => b.addEventListener("click", () => {
      const to = selected + Number(b.dataset.move);
      const mons = team().mons;
      [mons[selected], mons[to]] = [mons[to], mons[selected]];
      selected = to; commit(true);
    }));
    $("#c-ed-remove").addEventListener("click", async () => {
      const okDel = await ask({ title: `¿Quitar a ${displayName(mon)}?`, text: "Se pierde su configuración (EVs, IVs, movimientos…).", ok: "Quitar", danger: true });
      if (!okDel) return;
      team().mons[selected] = null; commit(true);
    });
    $$("details.c-sec", ed).forEach((d) => d.addEventListener("toggle", () => {
      openSecs = openSecs || { set: true, moves: true, stats: true };
      openSecs[d.dataset.sec] = d.open;
      try { localStorage.setItem(OPEN_KEY, JSON.stringify(openSecs)); } catch (error) { /* nada */ }
    }));
    $$(".c-stat[data-stat]", ed).forEach((row) => {
      const i = Number(row.dataset.stat);
      const range = $(".c-ev-range", row);
      const num = $(".c-ev", row);
      const iv = $(".c-iv", row);
      range.addEventListener("input", () => setEV(mon, i, Number(range.value)));
      num.addEventListener("input", () => { if (num.value !== "") setEV(mon, i, Number(num.value), true); });
      num.addEventListener("change", () => setEV(mon, i, Number(num.value) || 0));
      iv.addEventListener("input", () => { if (iv.value !== "") setIV(mon, i, Number(iv.value), true); });
      iv.addEventListener("change", () => setIV(mon, i, Number(iv.value) || 0));
    });
    $$("[data-ev]", ed).forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.ev === "reset") mon.evs = [0, 0, 0, 0, 0, 0];
      else {
        const [a, c, d] = b.dataset.ev.split(",").map(Number);
        mon.evs = [0, 0, 0, 0, 0, 0]; mon.evs[a] = 252; mon.evs[c] = 252; mon.evs[d] = 4;
      }
      commit(true);
    }));
    $$("[data-iv]", ed).forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.iv === "all") mon.ivs = [31, 31, 31, 31, 31, 31];
      else if (b.dataset.iv === "spe0") mon.ivs[5] = 0;
      else mon.ivs[1] = 0;
      commit(true);
    }));
  }
  function setEV(mon, i, value, typing = false) {
    const others = C.evTotal(mon) - mon.evs[i];
    const max = Math.max(0, Math.min(252, 510 - others));
    const v = Math.min(max, Math.max(0, Math.round(value) || 0));
    mon.evs[i] = v;
    refreshStats(mon, i, typing);
    commit(false);
  }
  function setIV(mon, i, value, typing = false) {
    mon.ivs[i] = Math.min(31, Math.max(0, Math.round(value) || 0));
    refreshStats(mon, i, typing);
    commit(false);
  }
  function refreshStats(mon, changed, typing) {
    const stats = C.calcStats(viewOf(mon));
    const ref = mon.lvl * 4.6 + 40;
    $$(".c-stat[data-stat]").forEach((row) => {
      const i = Number(row.dataset.stat);
      const pct = Math.min(100, (stats[i] / ref) * 100);
      $(".c-stat-val", row).textContent = stats[i];
      const bar = $(".c-bar", row);
      bar.className = `c-bar ${pct > 75 ? "is-hi" : pct > 45 ? "is-mid" : "is-lo"}`;
      $("i", bar).style.width = `${pct.toFixed(1)}%`;
      $(".c-ev-range", row).value = mon.evs[i];
      const num = $(".c-ev", row);
      const iv = $(".c-iv", row);
      // Mientras se escribe no se pisa el campo, salvo para recortar un valor que se pasa del máximo.
      const editing = typing && i === changed;
      if (!editing || Number(num.value) !== mon.evs[i]) {
        if (!(editing && document.activeElement === iv)) num.value = mon.evs[i];
      }
      if (!editing || document.activeElement !== iv || Number(iv.value) !== mon.ivs[i]) iv.value = mon.ivs[i];
    });
    const total = C.evTotal(mon);
    $("#c-ev-sum").textContent = `${total}/510 EVs`;
    $("#c-ev-left").innerHTML = evLeftText(total);
  }
  function pickSpecies(id) {
    const old = monAt(selected);
    const sp = C.speciesById.get(id);
    if (!sp) return;
    let mon;
    if (old) {
      const ls = C.learnset(sp);
      mon = { ...old, sp: id, nick: old.sp === id ? old.nick : "" };
      const abil = C.speciesAbilities(sp);
      if (!abil.some((a) => a.ability.id === old.ab)) mon.ab = abil[0] ? abil[0].ability.id : "";
      const dropped = old.moves.filter((m) => m && !ls.has(m));
      mon.moves = old.moves.map((m) => (m && ls.has(m) ? m : ""));
      if (dropped.length) toast(`${sp.es} no aprende: ${dropped.map((m) => C.moveById.get(m).es).join(", ")}.`);
    } else {
      mon = C.blankMon(id);
    }
    team().mons[selected] = mon;
    commit(true);
  }

  // ---------- Guardar y refrescar ----------
  let ioTimer = 0;
  function commit(full) {
    save();
    renderSlots();
    renderTeamSelect();
    if (full) renderEditor();
    clearTimeout(ioTimer);
    ioTimer = setTimeout(renderIO, full ? 0 : 400);
  }
  function renderAll() {
    renderTeamSelect();
    renderSlots();
    renderEditor();
    renderIO();
    if (activeTab === "analisis") renderAnalysis();
    if (activeTab === "checklist") renderChecklist();
  }

  // ---------- Importar / exportar ----------
  let shareSeq = 0;
  async function renderIO() {
    const t = team();
    $("#c-export").value = C.exportShowdown(t);
    const seq = ++shareSeq;
    const share = $("#c-share");
    if (!t.mons.some(Boolean)) { share.value = ""; return; }
    try {
      const code = await C.encodeShare(t);
      if (seq === shareSeq) share.value = code;
    } catch (error) {
      share.value = error.message;
    }
  }
  const linkFor = (code) => `${location.origin}${location.pathname}#eq=${code.slice(C.SHARE_PREFIX.length)}`;
  $("#c-copy-export").addEventListener("click", () => copy($("#c-export").value, "Texto de Showdown copiado."));
  $("#c-copy-share").addEventListener("click", () => copy($("#c-share").value.startsWith(C.SHARE_PREFIX) ? $("#c-share").value : "", "Código copiado."));
  $("#c-copy-link").addEventListener("click", () => {
    const code = $("#c-share").value;
    copy(code.startsWith(C.SHARE_PREFIX) ? linkFor(code) : "", "Enlace copiado.");
  });
  async function parseAny(text) {
    const raw = String(text || "").trim();
    if (!raw) throw new Error("Pega primero un equipo.");
    const hash = raw.match(/#eq=([A-Za-z0-9_-]+)/);
    if (raw.includes(C.SHARE_PREFIX) || hash) {
      const { team: t, warnings } = await C.decodeShare(hash && !raw.includes(C.SHARE_PREFIX) ? C.SHARE_PREFIX + hash[1] : raw);
      return { teams: [t], warnings };
    }
    return C.importShowdown(raw);
  }
  function report(html, cls) {
    $("#c-import-report").innerHTML = `<div class="v-note ${cls || ""} c-report">${html}</div>`;
  }
  async function doImport(replace) {
    let result;
    try {
      result = await parseAny($("#c-import").value);
    } catch (error) {
      report(`<span>${esc(error.message)}</span>`, "is-bad");
      return;
    }
    if (!result.teams.length) {
      report(`<div><strong>No he reconocido ningún Pokémon.</strong>${warnList(result.warnings)}</div>`, "is-bad");
      return;
    }
    let count = 0;
    if (replace) {
      const t = team();
      const src = result.teams[0];
      if (src.mons.length > t.size) t.size = 6;
      t.mons = makeTeam("", src.mons, t.size).mons;
      t.checks = {};
      if (src.name) t.name = src.name.slice(0, 40);
      count = src.mons.length;
    } else {
      for (const src of result.teams) {
        const t = makeTeam((src.name || `Importado ${store.teams.length + 1}`).slice(0, 40), src.mons);
        store.teams.push(t);
        store.active = t.id;
        count += src.mons.length;
      }
    }
    selected = 0;
    save();
    renderAll();
    const teamsTxt = result.teams.length > 1 && !replace ? ` en ${result.teams.length} equipos` : "";
    result.warnings.push(...megaStripped.splice(0));
    report(`<div><strong>Importados ${count} Pokémon${teamsTxt}.</strong>${result.warnings.length ? ` Revisa estos avisos:${warnList(result.warnings)}` : " Todo reconocido."}</div>`, result.warnings.length ? "" : "is-ok");
  }
  const warnList = (list) => (list.length ? `<ul class="c-warn-list">${list.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : "");
  $("#c-import-new").addEventListener("click", () => doImport(false));
  $("#c-import-replace").addEventListener("click", async () => {
    if (team().mons.some(Boolean)) {
      const okRep = await ask({ title: `¿Sustituir «${team().name}»?`, text: "Los Pokémon actuales del equipo se perderán.", ok: "Sustituir", danger: true });
      if (!okRep) return;
    }
    doImport(true);
  });

  async function checkSharedHash() {
    const m = location.hash.match(/^#eq=([A-Za-z0-9_-]+)/);
    if (!m) return false;
    const box = $("#c-shared");
    try {
      const { team: t, warnings } = await C.decodeShare(C.SHARE_PREFIX + m[1]);
      box.innerHTML = `<div class="v-note c-shared-note"><div class="c-shared-body"><strong>Te han compartido el equipo «${esc(t.name)}»</strong>
        <span class="c-shared-sprites">${t.mons.map((mon) => `<img class="pixel" src="${spriteUrl(C.speciesById.get(mon.sp))}" alt="${esc(C.speciesById.get(mon.sp).es)}" width="48" height="48">`).join("")}</span>
        ${warnings.length ? warnList(warnings) : ""}</div>
        <div class="c-row"><button class="v-btn is-sm" type="button" id="c-shared-ok">Guardar como equipo nuevo</button><button class="v-btn is-ghost is-sm" type="button" id="c-shared-no">Descartar</button></div></div>`;
      box.hidden = false;
      $("#c-shared-ok").addEventListener("click", () => {
        const nt = makeTeam(t.name, t.mons, t.size);
        const stripped = megaStripped.splice(0);
        if (stripped.length) setTimeout(() => toast(stripped[0]), 600);
        store.teams.push(nt); store.active = nt.id; selected = 0; save();
        box.hidden = true; showTab("equipos"); renderAll();
        toast(`Equipo «${nt.name}» guardado.`);
      });
      $("#c-shared-no").addEventListener("click", () => { box.hidden = true; });
    } catch (error) {
      box.innerHTML = `<p class="v-note is-bad">El enlace compartido no se puede leer: ${esc(error.message)}</p>`;
      box.hidden = false;
    }
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  }

  // ---------- Análisis ----------
  const fmtMult = (m) => (m === 0 ? "0" : m === 0.25 ? "¼" : m === 0.5 ? "½" : m === 1 ? "" : m === 1.25 ? "×1,25" : `×${m}`);
  const damaging = (mon) => mon.moves.map((id) => C.moveById.get(id)).filter((mv) => mv && mv.cat > 0);
  // Pokémon del equipo tal y como combaten: con su mega o primigenia si está activada.
  function battleMons(t) {
    return t.mons.map((mon, i) => {
      if (!mon) return null;
      const bf = megaOn(t, i) ? formOf(mon, t) : null;
      return bf ? bf.mon : mon;
    }).filter(Boolean);
  }
  function teamAnalysis(t) {
    const mons = battleMons(t);
    const profiles = mons.map(C.defensiveProfile);
    const rows = C.types.map((type) => {
      const vals = profiles.map((p) => p[type.index]);
      return {
        type, vals,
        weak: vals.filter((v) => v > 1).length,
        resist: vals.filter((v) => v > 0 && v < 1).length,
        immune: vals.filter((v) => v === 0).length,
      };
    });
    const coverage = C.types.map((type) => {
      let best = -1;
      const hitters = [];
      for (const mon of mons) {
        for (const mv of damaging(mon)) {
          const m = C.offensiveMult(mon, mv, type.index);
          if (m > best) best = m;
          if (m > 1) hitters.push(`${displayName(mon)}: ${mv.es}`);
        }
      }
      return { type, best, hitters };
    });
    const stats = mons.map((mon) => ({ mon, stats: C.calcStats(mon) }));
    let phys = 0, spec = 0, status = 0;
    for (const mon of mons) for (const id of mon.moves) {
      const mv = C.moveById.get(id);
      if (!mv) continue;
      if (mv.cat === 1) phys++; else if (mv.cat === 2) spec++; else status++;
    }
    return { mons, rows, coverage, stats, phys, spec, status, hasMoves: mons.some((m) => damaging(m).length) };
  }
  function renderAnalysis() {
    const box = $("#c-analysis");
    const t = team();
    const A = teamAnalysis(t);
    if (!A.mons.length) {
      box.innerHTML = `<h2 class="v-title">Análisis de «${esc(t.name)}»</h2><p class="v-note">Este equipo está vacío. Añade Pokémon en la pestaña <strong>Equipos</strong> y aquí verás sus debilidades, su cobertura y su velocidad.</p>`;
      return;
    }
    const danger = A.rows.filter((r) => r.weak >= 3 || (r.weak >= 2 && r.resist + r.immune === 0));
    const uncovered = A.coverage.filter((c) => c.best < 1);
    const noSE = A.coverage.filter((c) => c.best >= 0 && c.best <= 1);
    const speedSorted = A.stats.slice().sort((a, b) => b.stats[5] - a.stats[5]);
    const forms = t.mons.map((mon, i) => (mon ? { i, mon, bf: formOf(mon, t) } : null)).filter((f) => f && f.bf);
    const formsHtml = forms.length ? `<section class="v-section c-forms">
        <h3 class="c-h3">Formas especiales en el análisis</h3>
        <p class="c-small">Activa las megas y regresiones primigenias que quieras tener en cuenta: el análisis usa entonces sus tipos, sus estadísticas y su habilidad.</p>
        <div class="c-forms-list">${forms.map(({ i, mon, bf }) => {
          const on = megaOn(t, i);
          const msp = C.speciesById.get(bf.mon.sp);
          return `<button type="button" class="c-form-chip v-card${on ? " is-on" : ""}" data-mega="${i}" aria-pressed="${on}">
            <img class="pixel" src="${spriteUrl(on ? msp : spOf(mon))}" alt="" width="48" height="48">
            <span><b>${esc(on ? bf.mega.name : displayName(mon))}</b><small>${on ? `${msp.types.map(typeChip).join("")}${bf.ability ? ` ${esc(bf.ability)}` : ""}` : `Forma normal · ${esc(bf.mega.name)} desactivada`}</small></span>
            <span class="c-form-switch" aria-hidden="true">${on ? "ON" : "OFF"}</span>
          </button>`;
        }).join("")}</div>
        <p class="c-small c-mt">Solo puede haber <strong>una mega por equipo</strong>; las Regresiones Primigenias no cuentan.</p>
      </section>` : "";
    const head = A.mons.map((mon) => `<span class="c-mx-mon" title="${esc(displayName(mon))}"><img class="pixel" src="${spriteUrl(spOf(mon))}" alt="${esc(displayName(mon))}" width="40" height="40"></span>`).join("");
    const pad = Math.max(0, t.size - A.mons.length);
    const matrix = A.rows.map((r) => {
      const cls = r.weak >= 3 ? " is-bad" : r.weak >= 2 && r.resist + r.immune === 0 ? " is-warn" : "";
      const cells = r.vals.map((v) => `<span class="c-mx-cell ${v === 0 ? "is-imm" : v > 1 ? (v >= 4 ? "is-x4" : "is-weak") : v < 1 ? "is-res" : ""}">${fmtMult(v)}</span>`).join("") + '<span class="c-mx-cell is-pad"></span>'.repeat(pad);
      return `<div class="c-mx-row${cls}">${typeChip(r.type.index)}${cells}<span class="c-mx-tot is-weak" title="Débiles">${r.weak || ""}</span><span class="c-mx-tot is-res" title="Resisten o son inmunes">${r.resist + r.immune || ""}</span></div>`;
    }).join("");
    const maxSpe = Math.max(...A.stats.map((s) => s.stats[5]), 1);
    const totalMoves = A.phys + A.spec + A.status || 1;
    box.innerHTML = `
      <h2 class="v-title">Análisis de «${esc(t.name)}»</h2>
      <p class="v-intro">Calculado con las estadísticas reales de cada set (nivel, EVs, IVs y naturaleza) y teniendo en cuenta habilidades como Levitación, Absorbe Agua o Sebo.</p>
      ${formsHtml}
      <div class="v-grid cols-4 c-sum">
        <div class="v-card c-sum-card ${danger.length ? "is-bad" : "is-ok"}"><span>Debilidades peligrosas</span><strong>${danger.length}</strong><small>${danger.length ? danger.map((r) => esc(r.type.es)).join(", ") : "Ningún tipo amenaza a medio equipo"}</small></div>
        <div class="v-card c-sum-card ${uncovered.length ? "is-bad" : "is-ok"}"><span>Tipos que resisten todo</span><strong>${A.hasMoves ? uncovered.length : "—"}</strong><small>${A.hasMoves ? (uncovered.length ? uncovered.map((c) => esc(c.type.es)).join(", ") : "Siempre pegas al menos neutro") : "Faltan movimientos de daño"}</small></div>
        <div class="v-card c-sum-card"><span>Más rápido</span><strong>${speedSorted[0].stats[5]}</strong><small>${esc(displayName(speedSorted[0].mon))}</small></div>
        <div class="v-card c-sum-card"><span>Físico / especial</span><strong>${A.phys} / ${A.spec}</strong><small>${A.status} de estado</small></div>
      </div>

      <section class="v-section">
        <h3 class="c-h3">Defensa: lo que recibe cada uno</h3>
        <p class="c-small">Multiplicador de daño de cada tipo atacante. En rojo, tipos súper eficaces contra 3 o más; en ámbar, contra 2 sin nadie que los resista.</p>
        <div class="v-card c-matrix" role="table" aria-label="Tabla de debilidades">
          <div class="c-mx-row c-mx-head"><span class="c-mx-corner">Ataque</span>${head}${'<span class="c-mx-mon"></span>'.repeat(pad)}<span class="c-mx-tot is-weak" title="Débiles">✖</span><span class="c-mx-tot is-res" title="Resisten">🛡</span></div>
          ${matrix}
        </div>
        ${danger.length ? `<div class="v-note is-bad c-mt">${danger.map((r) => `<span><strong>${esc(r.type.es)}</strong>: ${r.weak} débiles${r.resist + r.immune ? `, ${r.resist + r.immune} lo resisten` : " y nadie lo resiste"}.</span>`).join("<br>")}</div>` : `<p class="v-note is-ok c-mt">Sin debilidades acumuladas graves.</p>`}
      </section>

      <section class="v-section">
        <h3 class="c-h3">Ataque: cobertura de los movimientos de daño</h3>
        <p class="c-small">El mejor multiplicador que consigue el equipo contra un Pokémon de cada tipo (tipo único).</p>
        ${A.hasMoves ? `<div class="c-cov">${A.coverage.map((c) => `<div class="c-cov-tile ${c.best > 1 ? "is-se" : c.best === 1 ? "is-neutral" : "is-bad"}" title="${esc(c.hitters.join("\n") || "Nadie lo golpea súper eficaz")}">${typeChip(c.type.index)}<b>${c.best > 1 ? "×2" : c.best === 1 ? "×1" : c.best === 0.5 ? "½" : c.best === 0 ? "0" : "—"}</b><small>${c.hitters.length ? `${c.hitters.length} ataque${c.hitters.length > 1 ? "s" : ""} súper eficaz${c.hitters.length > 1 ? "es" : ""}` : c.best === 1 ? "solo neutro" : "lo resiste todo"}</small></div>`).join("")}</div>
        ${noSE.length ? `<p class="v-note c-mt"><span>Nadie golpea súper eficaz a: <strong>${noSE.map((c) => esc(c.type.es)).join(", ")}</strong>.</span></p>` : `<p class="v-note is-ok c-mt">Golpeas súper eficaz a los 18 tipos.</p>`}` : `<p class="v-note">Ningún Pokémon tiene todavía movimientos de daño.</p>`}
      </section>

      <div class="c-two">
        <section class="v-section">
          <h3 class="c-h3">Ranking de velocidad</h3>
          <div class="v-card c-speed">${speedSorted.map(({ mon, stats }, k) => {
            const scarf = mon.item === "choice_scarf";
            const nat = C.natureById.get(mon.nat);
            const mark = nat.up === 5 ? '<b class="c-up">↑</b>' : nat.down === 5 ? '<b class="c-down">↓</b>' : "";
            return `<div class="c-speed-row"><span class="c-rank">${k + 1}</span><img class="pixel" src="${spriteUrl(spOf(mon))}" alt="" width="40" height="40"><span class="c-speed-name">${esc(displayName(mon))} ${mark}<small>${mon.evs[5]} EVs · IV ${mon.ivs[5]}${scarf ? ` · Pañuelo: ${Math.floor(stats[5] * 1.5)}` : ""} · +1: ${Math.floor(stats[5] * 1.5)}</small></span><span class="c-bar is-hi"><i style="width:${((stats[5] / maxSpe) * 100).toFixed(1)}%"></i></span><b class="c-speed-val">${scarf ? Math.floor(stats[5] * 1.5) : stats[5]}</b></div>`;
          }).join("")}</div>
          <p class="c-small c-mt">Con Espacio Raro el orden se invierte: los más lentos actúan primero.</p>
        </section>
        <section class="v-section">
          <h3 class="c-h3">Reparto físico / especial</h3>
          <div class="v-card">
            <div class="c-split" aria-label="Reparto de movimientos"><i class="is-phys" style="width:${(A.phys / totalMoves) * 100}%"></i><i class="is-spec" style="width:${(A.spec / totalMoves) * 100}%"></i><i class="is-status" style="width:${(A.status / totalMoves) * 100}%"></i></div>
            <p class="c-legend"><span><i class="is-phys"></i>Físicos ${A.phys}</span><span><i class="is-spec"></i>Especiales ${A.spec}</span><span><i class="is-status"></i>Estado ${A.status}</span></p>
            <ul class="c-roles">${A.stats.map(({ mon, stats }) => {
              const d = damaging(mon);
              const p = d.filter((m) => m.cat === 1).length, s = d.filter((m) => m.cat === 2).length;
              const role = !d.length ? "Apoyo" : p && s ? "Mixto" : p ? "Físico" : "Especial";
              const warn = (p && !s && stats[1] < stats[3]) || (s && !p && stats[3] < stats[1]) ? ' <span class="c-hint-warn" title="Su mejor stat ofensiva no es la que usan sus ataques">⚠</span>' : "";
              return `<li><img class="pixel" src="${spriteUrl(spOf(mon))}" alt="" width="32" height="32"><span>${esc(displayName(mon))}</span><span class="v-badge is-dim">${role}</span><small>Atq ${stats[1]} · AtE ${stats[3]}${warn}</small></li>`;
            }).join("")}</ul>
            ${A.phys && !A.spec ? '<p class="v-note c-mt">Todo tu daño es físico: un muro físico con Casco Dentado o Fuegofatuo te frena entero.</p>' : ""}
            ${A.spec && !A.phys ? '<p class="v-note c-mt">Todo tu daño es especial: un muro especial o un Chaleco Asalto te frena entero.</p>' : ""}
          </div>
        </section>
      </div>`;
  }

  $("#c-analysis").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mega]");
    if (!b) return;
    const t = team();
    const i = Number(b.dataset.mega);
    t.noMega = megaOn(t, i) ? [...(t.noMega || []), i] : (t.noMega || []).filter((x) => x !== i);
    save(); renderAnalysis();
    $(`#c-analysis [data-mega="${i}"]`)?.focus();
  });

  // ---------- Checklist ----------
  const SPEED_CONTROL = new Set(["tailwind", "trickroom", "thunderwave", "icywind", "electroweb", "stickyweb", "glare", "stunspore", "nuzzle", "scaryface", "stringshot", "rocktomb", "bulldoze", "lowsweep", "mudshot", "agility", "rockpolish", "dragondance", "shellsmash", "quiverdance", "shiftgear", "autotomize", "flamecharge", "trailblaze", "cottonspore", "bleakwindstorm"]);
  const SPEED_ABIL = new Set(["speedboost", "swiftswim", "chlorophyll", "sandrush", "slushrush", "unburden", "prankster"]);
  const HAZARDS = new Set(["stealthrock", "spikes", "toxicspikes", "stickyweb", "defog", "rapidspin", "mortalspin", "tidyup", "courtchange"]);
  function autoChecks(t) {
    const mons = t.mons.filter(Boolean);
    const A = teamAnalysis(t);
    const res = {};
    const names = (list) => list.map(displayName).join(", ");
    const missingMoves = mons.filter((m) => m.moves.filter(Boolean).length < 4);
    res["seis-cuatro"] = mons.length === t.size && !missingMoves.length
      ? [true, `Equipo completo (${t.size}).`]
      : [false, mons.length < t.size ? `Faltan ${t.size - mons.length} Pokémon.` : `Sin 4 movimientos: ${names(missingMoves)}.`];
    const noItem = mons.filter((m) => !m.item);
    res.objetos = mons.length && !noItem.length ? [true, "Todos equipados."] : [false, mons.length ? `Sin objeto: ${names(noItem)}.` : "No hay Pokémon."];
    const lowEV = mons.filter((m) => C.evTotal(m) < 508);
    res.evs = mons.length && !lowEV.length ? [true, "Todos con sus EVs."] : [false, mons.length ? `EVs sin repartir: ${lowEV.map((m) => `${displayName(m)} (${510 - C.evTotal(m)})`).join(", ")}.` : "No hay Pokémon."];
    const badNat = mons.filter((m) => {
      const nat = C.natureById.get(m.nat);
      const d = damaging(m);
      return (nat.down === 1 && d.some((mv) => mv.cat === 1 && mv.id !== "foulplay")) || (nat.down === 3 && d.some((mv) => mv.cat === 2));
    });
    res.naturaleza = mons.length && !badNat.length ? [true, "Ninguna naturaleza estorba."] : [false, mons.length ? `Revisa: ${names(badNat)}.` : "No hay Pokémon."];
    const danger = A.rows.filter((r) => r.weak >= 3);
    res.debilidades = mons.length && !danger.length ? [true, "Ningún tipo pega súper eficaz a 3 o más."] : [false, mons.length ? `Débiles en grupo a: ${danger.map((r) => `${r.type.es} (${r.weak})`).join(", ")}.` : "No hay Pokémon."];
    const walls = A.coverage.filter((c) => c.best < 1);
    res.cobertura = A.hasMoves && !walls.length ? [true, "Siempre pegas al menos neutro."] : [false, A.hasMoves ? `Te resisten: ${walls.map((c) => c.type.es).join(", ")}.` : "Faltan movimientos de daño."];
    res.reparto = A.phys && A.spec ? [true, `${A.phys} físicos y ${A.spec} especiales.`] : [false, !A.phys && !A.spec ? "Faltan movimientos de daño." : A.phys ? "Solo daño físico." : "Solo daño especial."];
    const speedTools = [];
    for (const m of mons) {
      for (const id of m.moves) {
        const mv = C.moveById.get(id);
        if (mv && ((mv.prio > 0 && mv.cat > 0) || SPEED_CONTROL.has(id))) speedTools.push(mv.es);
      }
      if (m.item === "choice_scarf") speedTools.push("Pañuelo Elección");
      if (SPEED_ABIL.has(m.ab)) speedTools.push(C.abilityById.get(m.ab).es);
    }
    res.velocidad = speedTools.length ? [true, [...new Set(speedTools)].slice(0, 5).join(", ") + "."] : [false, "Ni prioridad ni control de velocidad."];
    const hz = [];
    for (const m of mons) {
      for (const id of m.moves) if (HAZARDS.has(id)) hz.push(C.moveById.get(id).es);
      if (m.item === "heavy_duty_boots") hz.push(`Botas Gruesas (${displayName(m)})`);
    }
    res.hazards = hz.length ? [true, [...new Set(hz)].slice(0, 5).join(", ") + "."] : [false, "Nadie coloca ni retira hazards."];
    return res;
  }
  function renderChecklist() {
    const box = $("#c-checklist");
    const t = team();
    const auto = autoChecks(t);
    const items = window.DIOSESMON_COMP_CHECKLIST || [];
    const done = items.filter((it) => (it.auto ? auto[it.id]?.[0] : t.checks[it.id])).length;
    const pct = Math.round((done / items.length) * 100);
    const groups = [...new Set(items.map((it) => it.group))];
    box.innerHTML = `
      <h2 class="v-title">Checklist de «${esc(t.name)}»</h2>
      <p class="v-intro">Repasa el equipo antes de combatir. Los puntos <span class="v-badge">Auto</span> se comprueban solos con tu equipo; el resto márcalos tú (se guardan en cada equipo).</p>
      <div class="v-card c-progress-card">
        <div class="c-progress-top"><strong>${done} de ${items.length}</strong><span>${pct}%</span></div>
        <div class="c-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${done}" aria-label="Progreso del checklist"><i style="width:${pct}%"></i></div>
        ${done === items.length ? '<p class="v-note is-ok c-mt">¡Equipo listo para el combate!</p>' : ""}
      </div>
      ${groups.map((g) => `<section class="v-section"><h3 class="c-h3">${esc(g)}</h3><div class="c-checks">${items.filter((it) => it.group === g).map((it) => {
        if (it.auto) {
          const [ok, detail] = auto[it.id] || [false, ""];
          return `<div class="c-check v-card ${ok ? "is-done" : "is-todo"}"><span class="c-check-mark" aria-hidden="true">${ok ? "✓" : "✗"}</span><div><h4>${it.ico} ${esc(it.title)} <span class="v-badge">Auto</span></h4><p>${esc(it.text)}</p><p class="c-check-detail ${ok ? "is-ok" : "is-bad"}"><span class="sr-only">${ok ? "Cumplido" : "Pendiente"}: </span>${esc(detail)}</p></div></div>`;
        }
        const on = !!t.checks[it.id];
        return `<label class="c-check v-card ${on ? "is-done" : ""}"><input type="checkbox" data-check="${it.id}"${on ? " checked" : ""}><span class="c-check-mark" aria-hidden="true">${on ? "✓" : ""}</span><div><h4>${it.ico} ${esc(it.title)}</h4><p>${esc(it.text)}</p></div></label>`;
      }).join("")}</div></section>`).join("")}
      <div class="c-row c-mt"><button type="button" class="v-btn is-ghost is-sm" id="c-check-reset">Desmarcar los puntos manuales</button></div>`;
    $$("[data-check]", box).forEach((cb) => cb.addEventListener("change", () => {
      if (cb.checked) t.checks[cb.dataset.check] = true; else delete t.checks[cb.dataset.check];
      save(); renderChecklist();
      $(`[data-check="${cb.dataset.check}"]`)?.focus();
    }));
    $("#c-check-reset").addEventListener("click", () => { t.checks = {}; save(); renderChecklist(); });
  }

  // ---------- Guía ----------
  const GUIDE_CATS = [
    ["todos", "Todo"], ["fundamentos", "🧩 Fundamentos"], ["roles", "⚔️ Roles"], ["estrategia", "🧠 Estrategia"],
    ["objetos", "🎒 Objetos"], ["diosesmon", "🐉 Diosesmon"], ["torneos", "📜 Torneos y reglas"],
  ];
  const ITEM_ICONS = { of: "⚔️", ve: "⚡", de: "🛡️", so: "🧩", ba: "🍓", cr: "🏋️", mg: "💎" };
  let guideCat = "todos";
  let guideItemCat = "";
  let guideEntries = null;
  function buildGuide() {
    const tips = window.DIOSESMON_COMP_ITEM_TIPS || {};
    const base = (window.DIOSESMON_COMP_GUIDE || []).map((g) => ({ ...g, kind: "guide", search: C.norm(`${g.title} ${g.tags} ${g.text} ${g.tip}`) }));
    // Las megapiedras tienen su propia sección (megas.html); aquí solo los objetos de combate.
    const objs = C.items.filter((it) => it.cat !== "mg").map((it) => {
      const extra = tips[it.id] || {};
      return {
        kind: "item", id: `obj-${it.id}`, cat: "objetos", sub: it.cat, ico: ITEM_ICONS[it.cat], title: it.es, en: it.en,
        text: it.effect, tip: extra.tip || "", alias: extra.alias || "",
        search: C.norm(`${it.es} ${it.en} ${C.ITEM_CATS[it.cat]} ${it.effect} ${extra.tip || ""} ${extra.alias || ""} objeto item`),
      };
    });
    guideEntries = base.concat(objs);
  }
  function renderGuide() {
    if (!guideEntries) {
      buildGuide();
      $("#c-guide-cats").innerHTML = GUIDE_CATS.map(([id, label]) => `<button type="button" class="v-chip" data-cat="${id}" aria-pressed="${id === guideCat}">${label}</button>`).join("");
      $("#c-guide-itemcats").innerHTML = [["", "Todos los objetos"], ...Object.entries(C.ITEM_CATS).filter(([id]) => id !== "mg")].map(([id, label]) => `<button type="button" class="v-chip" data-icat="${id}" aria-pressed="${id === guideItemCat}">${id ? ITEM_ICONS[id] + " " : ""}${label}</button>`).join("");
      $("#c-guide-cats").addEventListener("click", (e) => {
        const b = e.target.closest("[data-cat]"); if (!b) return;
        guideCat = b.dataset.cat; guideItemCat = "";
        $$("#c-guide-cats [data-cat]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        $$("#c-guide-itemcats [data-icat]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.icat === "")));
        drawGuide();
      });
      $("#c-guide-itemcats").addEventListener("click", (e) => {
        const b = e.target.closest("[data-icat]"); if (!b) return;
        guideItemCat = b.dataset.icat;
        $$("#c-guide-itemcats [data-icat]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        drawGuide();
      });
      $("#c-guide-q").addEventListener("input", drawGuide);
    }
    drawGuide();
  }
  function drawGuide() {
    const q = C.norm($("#c-guide-q").value);
    $("#c-guide-itemcats").hidden = guideCat !== "objetos";
    const list = guideEntries.filter((g) => (guideCat === "todos" || g.cat === guideCat) && (!guideItemCat || g.sub === guideItemCat) && matchAll(g.search, q));
    const guides = list.filter((g) => g.kind === "guide");
    const objs = list.filter((g) => g.kind === "item");
    const catLabel = Object.fromEntries(GUIDE_CATS);
    $("#c-guide-count").textContent = list.length ? `${guides.length} concepto${guides.length === 1 ? "" : "s"} · ${objs.length} objeto${objs.length === 1 ? "" : "s"}` : "";
    const guideHtml = guides.map((g) => `<article class="v-card c-guide-card${g.cat === "diosesmon" ? " is-gold" : ""}" id="g-${g.id}">
        <div class="c-guide-top"><span class="c-guide-ico" aria-hidden="true">${g.ico}</span><span class="v-badge is-dim">${esc(catLabel[g.cat].replace(/^\S+\s/, ""))}</span></div>
        <h3>${esc(g.title)}</h3><p>${esc(g.text)}</p>
        ${g.tip ? `<p class="c-tip"><span aria-hidden="true">💡</span> ${esc(g.tip)}</p>` : ""}
        ${g.link ? `<a class="c-guide-link" href="${esc(g.link[1])}" target="_blank" rel="noopener">${esc(g.link[0])} ↗</a>` : ""}
      </article>`).join("");
    const objHtml = objs.map((g) => `<article class="c-item-card" id="${g.id}">
        <div class="c-item-top"><span aria-hidden="true">${g.ico}</span><h4>${esc(g.title)}</h4><span class="c-item-en">${esc(g.en)}</span></div>
        <p>${esc(g.text)}</p>
        ${g.tip ? `<p class="c-tip">💡 ${esc(g.tip)}</p>` : ""}
        <div class="c-item-foot"><span class="v-badge is-dim">${C.ITEM_CATS[g.sub]}</span><span class="c-exists" title="Comprobado en los datos de Cobblemon 1.7.3">✓ Cobblemon 1.7.3</span>${g.alias ? `<span class="c-alias">Antes: ${esc(g.alias)}</span>` : ""}</div>
      </article>`).join("");
    $("#c-guide-list").innerHTML = !list.length
      ? `<p class="v-note">No hay nada que coincida con la búsqueda o el filtro.</p>`
      : `${guideHtml ? `<div class="c-guide-cards">${guideHtml}</div>` : ""}${objHtml ? `<h3 class="c-h3 c-mt">Objetos competitivos de Cobblemon 1.7.3 <span class="c-sum-note">${objs.length}</span></h3><p class="c-small">Todos existen en Cobblemon 1.7.3 (comprobado en sus datos) con su nombre oficial en español; entre paréntesis, el inglés de Showdown.</p><div class="c-item-grid">${objHtml}</div>` : ""}`;
  }

  // ---------- Inicio ----------
  renderAll();
  if (loadStripped.length) { save(); toast(loadStripped.length > 1 ? `Solo puede haber una mega por equipo: se han quitado ${loadStripped.length} megapiedras de más.` : loadStripped[0]); }
  let startTab = "equipos";
  try { startTab = localStorage.getItem(TAB_KEY) || "equipos"; } catch (error) { /* nada */ }
  const hashTab = location.hash.replace("#", "");
  if (TABS.includes(hashTab)) startTab = hashTab;
  checkSharedHash().then((shared) => showTab(shared ? "equipos" : startTab));
  window.addEventListener("hashchange", () => { checkSharedHash(); const h = location.hash.replace("#", ""); if (TABS.includes(h)) showTab(h); });
})();
