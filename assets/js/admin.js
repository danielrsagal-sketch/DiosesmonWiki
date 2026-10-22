// Admin de Cazas: edita las cazas actuales y las guarda en /api/cazas (Cloudflare Pages Function + KV).
(function adminCazas() {
  const PASS_KEY = "wiki-diosesmon-admin-pass";
  const SLOTS = 3;
  const HOURS = window.DIOSESMON_CAZAS?.rotationHours ?? 12;
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const species = (window.POKEDEX_SPECIES ?? []).filter((entry) => entry.kind === "pokemon" || !entry.kind);
  const byName = new Map(species.map((entry) => [entry.name.toLowerCase(), entry]));
  const byId = new Map(species.map((entry) => [entry.id, entry]));
  // Datos extra que trae el mod (rareza, Poké Ball, habilidad, grupo huevo, recompensas): se conservan al guardar.
  const EXTRAS = ["rarity", "ball", "ability", "eggGroup", "rewards"];
  let extras = {};
  let expiresAt = null;
  const tiers = Object.fromEntries((window.DIOSESMON_CAZAS?.kinds ?? []).map((kind) => [kind.kind, kind.tiers]));
  const $ = (id) => document.getElementById(id);
  const form = $("adm-form");
  const pass = $("adm-pass");
  const remember = $("adm-remember");
  const start = $("adm-start");
  const status = $("adm-status");

  $("adm-species").innerHTML = species.map((entry) => `<option value="${entry.name}">#${entry.id}</option>`).join("");
  try {
    const saved = localStorage.getItem(PASS_KEY);
    if (saved) { pass.value = saved; remember.checked = true; }
  } catch { /* sin almacenamiento */ }

  // <input type="datetime-local"> trabaja en la hora local del navegador.
  const toLocalInput = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };
  const fromLocalInput = (value) => new Date(value);
  const showEnds = () => {
    const begin = fromLocalInput(start.value);
    if (Number.isNaN(begin.getTime())) { $("adm-ends").textContent = ""; return; }
    const end = new Date(begin.getTime() + HOURS * 3600000);
    const fmt = new Intl.DateTimeFormat("es", { weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false });
    $("adm-ends").textContent = `Rotan el ${fmt.format(end)} (tu hora). En Chile: ${new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" }).format(end)}.`;
  };

  const slotHtml = (kind, index) => `
    <div class="adm-hunt" data-kind="${kind}" data-index="${index}">
      <img src="" alt="" width="64" height="64" data-sprite hidden>
      <label class="adm-field"><span>Pokémon ${index + 1}</span><input list="adm-species" data-name placeholder="Nombre…"></label>
      <label class="adm-field is-small"><span>Estrellas</span><select data-stars>${[1, 2, 3, 4, 5].map((value) => `<option value="${value}">${"★".repeat(value)}</option>`).join("")}</select></label>
      ${kind === "crianza" ? `<label class="adm-field is-small"><span>IVs perfectos</span><select data-ivs>${[1, 2, 3, 4, 5, 6].map((value) => `<option value="${value}">${value}/6</option>`).join("")}</select></label>` : ""}
      <p class="adm-reward" data-reward></p>
    </div>`;
  $("adm-captura").innerHTML = Array.from({ length: SLOTS }, (_, index) => slotHtml("captura", index)).join("");
  $("adm-crianza").innerHTML = Array.from({ length: SLOTS }, (_, index) => slotHtml("crianza", index)).join("");

  const refreshSlot = (slot) => {
    const entry = byName.get(slot.querySelector("[data-name]").value.trim().toLowerCase());
    const sprite = slot.querySelector("[data-sprite]");
    sprite.hidden = !entry;
    if (entry) sprite.src = `${SPRITES}/${entry.id}.png`;
    slot.querySelector("[data-name]").classList.toggle("is-bad", Boolean(slot.querySelector("[data-name]").value.trim()) && !entry);
    const tier = tiers[slot.dataset.kind]?.find((item) => item.stars === Number(slot.querySelector("[data-stars]").value));
    slot.querySelector("[data-reward]").textContent = tier ? `Recompensa: ${tier.money.toLocaleString("es", { useGrouping: "always" })} $ + ${tier.balls.map(([count, , name]) => `${count} ${name}`).join(", ")}` : "Recompensa: sin datos para estas estrellas";
  };

  const fill = (data) => {
    start.value = toLocalInput(new Date(data.startedAt));
    expiresAt = data.expiresAt ?? null;
    extras = {};
    for (const kind of ["captura", "crianza"]) for (const hunt of data[kind] ?? []) {
      const extra = Object.fromEntries(EXTRAS.filter((key) => hunt[key]).map((key) => [key, hunt[key]]));
      if (Object.keys(extra).length) extras[`${kind}:${hunt.id}`] = extra;
    }
    for (const kind of ["captura", "crianza"]) {
      document.querySelectorAll(`.adm-hunt[data-kind="${kind}"]`).forEach((slot, index) => {
        const hunt = data[kind]?.[index];
        slot.querySelector("[data-name]").value = (hunt && byId.get(hunt.id)?.name) ?? hunt?.name ?? "";
        slot.querySelector("[data-stars]").value = String(hunt?.stars ?? index + 1);
        const ivs = slot.querySelector("[data-ivs]");
        if (ivs) ivs.value = String(hunt?.ivs ?? tiers.crianza?.find((tier) => tier.stars === (hunt?.stars ?? index + 1))?.ivs ?? 2);
        refreshSlot(slot);
      });
    }
    showEnds();
  };

  form.addEventListener("input", (event) => {
    const slot = event.target.closest(".adm-hunt");
    if (slot) refreshSlot(slot);
    if (event.target === start) showEnds();
  });
  form.addEventListener("change", (event) => {
    // Al cambiar las estrellas de una caza de crianza, propone los IVs habituales de esa dificultad.
    if (event.target.matches("[data-stars]")) {
      const slot = event.target.closest(".adm-hunt");
      const ivs = slot.querySelector("[data-ivs]");
      const usual = tiers.crianza?.find((tier) => tier.stars === Number(event.target.value))?.ivs;
      if (ivs && usual) ivs.value = String(usual);
      refreshSlot(slot);
    }
  });
  $("adm-now").addEventListener("click", () => { start.value = toLocalInput(new Date()); showEnds(); });
  $("adm-next").addEventListener("click", () => {
    const begin = fromLocalInput(start.value);
    start.value = toLocalInput(new Date((Number.isNaN(begin.getTime()) ? Date.now() : begin.getTime()) + HOURS * 3600000));
    showEnds();
  });
  $("adm-ago").addEventListener("click", () => {
    const minutes = Number($("adm-ago-h").value || 0) * 60 + Number($("adm-ago-m").value || 0);
    start.value = toLocalInput(new Date(Date.now() - minutes * 60000));
    showEnds();
  });

  const collect = () => {
    const read = (kind) => [...document.querySelectorAll(`.adm-hunt[data-kind="${kind}"]`)].flatMap((slot) => {
      const entry = byName.get(slot.querySelector("[data-name]").value.trim().toLowerCase());
      if (!entry) return [];
      const hunt = { id: entry.id, name: entry.name, stars: Number(slot.querySelector("[data-stars]").value) };
      if (kind === "crianza") hunt.ivs = Number(slot.querySelector("[data-ivs]").value);
      return [{ ...hunt, ...(extras[`${kind}:${entry.id}`] ?? {}) }];
    });
    const startedAt = fromLocalInput(start.value).toISOString();
    const body = { startedAt, captura: read("captura"), crianza: read("crianza") };
    // La hora de rotación del mod solo vale si no se ha cambiado el inicio a mano.
    if (expiresAt && Math.abs(Date.parse(expiresAt) - Date.parse(startedAt) - HOURS * 3600000) < 60000) body.expiresAt = expiresAt;
    return body;
  };

  const say = (text, tone) => { status.textContent = text; status.className = `adm-status is-${tone}`; };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (document.querySelector("[data-name].is-bad")) return say("Hay un Pokémon con el nombre mal escrito (en rojo). Elígelo de la lista.", "bad");
    const body = collect();
    try {
      if (remember.checked) localStorage.setItem(PASS_KEY, pass.value);
      else localStorage.removeItem(PASS_KEY);
    } catch { /* nada */ }
    $("adm-submit").disabled = true;
    say("Guardando…", "info");
    try {
      const response = await fetch("/api/cazas", {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${pass.value}` },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) say(`¡Guardado! Ya se ven en Inicio (${body.captura.length + body.crianza.length} cazas).`, "ok");
      else say(result.error ?? `Error ${response.status}.`, "bad");
    } catch {
      say("No se pudo conectar con /api/cazas. En local (python -m http.server) no hay servidor: usa «Copiar como respaldo».", "bad");
    } finally {
      $("adm-submit").disabled = false;
    }
  });

  // Respaldo: el bloque «current» listo para pegar en data/cazas-data.js.
  $("adm-copy").addEventListener("click", async () => {
    const body = collect();
    const text = `  current: ${JSON.stringify(body, null, 2).replace(/\n/g, "\n  ")},`;
    try {
      await navigator.clipboard.writeText(text);
      say("Copiado: pégalo en data/cazas-data.js en lugar del bloque «current».", "ok");
    } catch {
      say("No se pudo copiar automáticamente.", "bad");
    }
  });

  // Pegar lo que copia el mod con /wikicazas.
  $("adm-paste").addEventListener("click", async () => {
    $("adm-paste-card").hidden = false;
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim().startsWith("{")) $("adm-paste-text").value = text;
    } catch { /* sin permiso para leer el portapapeles: se pega a mano */ }
    $("adm-paste-text").focus();
  });
  $("adm-paste-fill").addEventListener("click", () => {
    let data;
    try {
      data = JSON.parse($("adm-paste-text").value);
    } catch {
      return say("Eso no es lo que copia /wikicazas (no es JSON válido).", "bad");
    }
    if (!data || !data.startedAt || !Array.isArray(data.captura) || !Array.isArray(data.crianza)) return say("Faltan datos: copia otra vez con /wikicazas.", "bad");
    fill(data);
    $("adm-paste-card").hidden = true;
    say(`Rellenado con ${data.captura.length + data.crianza.length} cazas del mod. Revisa y pulsa «Guardar cazas».`, "ok");
  });

  // Carga lo guardado; si no hay nada, el respaldo de la wiki.
  (async () => {
    try {
      const response = await fetch("/api/cazas", { cache: "no-store" });
      if (!response.ok) throw new Error();
      fill(await response.json());
    } catch {
      if (window.DIOSESMON_CAZAS?.current) fill(window.DIOSESMON_CAZAS.current);
    }
  })();
})();
