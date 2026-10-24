// Evento de Halloween: ticket, Bingo con progreso guardado en el navegador, Casa Encantada y tienda.
(function halloweenEvent() {
  const EV = window.HALLOWEEN_EVENT;
  if (!EV) return;
  const KEY = "wiki-diosesmon-halloween-2026";
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const money = (value) => value.toLocaleString("es", { useGrouping: "always" });
  const icon = (ref) => (ref.startsWith("assets/") ? ref : `${SPRITES}/${ref}.png`);
  const missions = EV.bingo.missions;
  // Casillas del cartón 3×3: la del centro es libre.
  const CELLS = [0, 1, 2, 3, 5, 6, 7, 8];
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (error) { progress = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (error) { /* modo privado */ } };
  const valueOf = (m) => Math.min(m.goal, Math.max(0, Number(progress[m.id]) || 0));
  const isDone = (m) => valueOf(m) >= m.goal;

  // ---------- Ticket ----------
  $("#hw-ticket-price").innerHTML = `<b>${money(EV.ticket.price)}</b> PokéDólares`;
  $("#hw-includes").innerHTML = EV.ticket.includes.map((name, i) => `<li><span aria-hidden="true">${i === 0 ? "🎟️" : "🏚️"}</span>${esc(name)}</li>`).join("");

  // ---------- Tienda: lo que vende el evento y el resto de decoraciones, con visor 3D ----------
  const decor = window.HALLOWEEN_DECOR || [];
  const decorByName = new Map(decor.map((item) => [item.name, item]));
  const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  const norm = (text) => String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const priceTag = (item) => (item.cur === "dc"
    ? `<small class="is-coins">🪙 ${money(item.price)} DiosesCoins</small>`
    : `<small>${money(item.price)} $</small>`);
  const shopItems = EV.shop.groups.flatMap((group) => group.items);
  const shopDecor = shopItems.map((item) => decorByName.get(item.name)).filter(Boolean);
  const shopIds = new Set(shopDecor.map((item) => item.id));
  const extraDecor = decor.filter((item) => !shopIds.has(item.id));
  const lists = { shop: shopDecor, extra: extraDecor };
  let shownExtra = extraDecor;

  $("#hw-shop").innerHTML = EV.shop.groups.map((group) => `
    <h3 class="hw-shop-group">${esc(group.name)} <span>${group.items.length}</span></h3>
    ${group.text ? `<p class="hw-group-text">${group.text}</p>` : ""}
    <ul class="hw-decor">${group.items.map((item) => {
      const model = decorByName.get(item.name);
      const inner = `<img src="${model ? `assets/img/halloween3d/${model.id}.png` : `assets/img/eventos/halloween/tienda/${item.img}.png`}" alt="" width="128" height="128" loading="lazy">
        <b>${esc(item.name)}</b>${priceTag(item)}${model ? '<span class="hw-3d">3D</span>' : ""}${item.perk ? `<span class="hw-perk">✨ ${esc(item.perk)}</span>` : ""}${item.note ? `<em class="hw-small">${esc(item.note)}</em>` : ""}`;
      return model
        ? `<li><button type="button" class="hw-decor-card v-card" data-list="shop" data-decor="${shopDecor.indexOf(model)}">${inner}</button></li>`
        : `<li><div class="hw-decor-card v-card is-static">${inner}</div></li>`;
    }).join("")}</ul>`).join("");

  $("#hw-decor-count").textContent = extraDecor.length;
  function renderDecor() {
    const q = norm($("#hw-decor-search").value.trim());
    shownExtra = extraDecor.filter((item) => !q || norm(item.name).includes(q));
    lists.extra = shownExtra;
    $("#hw-decor-shown").textContent = q ? `${shownExtra.length} de ${extraDecor.length}` : "";
    $("#hw-decor").innerHTML = shownExtra.map((item, i) => `<li><button type="button" class="hw-decor-card v-card" data-list="extra" data-decor="${i}">
        <img src="assets/img/halloween3d/${item.id}.png" alt="" width="128" height="128" loading="lazy">
        <b>${esc(item.name)}</b><span class="hw-3d">3D</span>
      </button></li>`).join("") || '<li class="hw-small">Ninguna decoración coincide.</li>';
  }
  $("#hw-decor-search").addEventListener("input", renderDecor);
  renderDecor();

  // Visor 3D: three.js se carga solo la primera vez que se abre.
  const dialog = $("#hw-viewer");
  let viewer = null;
  let current = 0;
  let currentList = "shop";
  let threeReady = null;
  const loadThree = () => threeReady || (threeReady = new Promise((resolve, reject) => {
    if (window.THREE) return resolve();
    const script = document.createElement("script");
    script.src = THREE_URL;
    script.onload = resolve;
    script.onerror = () => { threeReady = null; reject(new Error("three.js")); };
    document.head.append(script);
  }));
  async function openDecor(i, listName = currentList) {
    const list = lists[listName];
    if (!list.length) return;
    currentList = listName;
    current = (i + list.length) % list.length;
    const item = list[current];
    $("#hw-viewer-title").textContent = item.name;
    $("#hw-viewer-loading").hidden = false;
    $("#hw-viewer-loading").textContent = "Cargando modelo…";
    if (!dialog.open) dialog.showModal();
    try {
      await loadThree();
      if (!viewer) viewer = window.MCModel3D.create($("#hw-viewer-stage"));
      await viewer.load(`assets/models3d/halloween/${item.id}.json`);
      $("#hw-viewer-loading").hidden = true;
    } catch (error) {
      $("#hw-viewer-loading").textContent = "No se pudo cargar la vista 3D en este navegador.";
    }
  }
  document.querySelector("#tienda").addEventListener("click", (event) => {
    const card = event.target.closest("[data-decor]");
    if (card) openDecor(Number(card.dataset.decor), card.dataset.list);
  });
  $("#hw-viewer-close").addEventListener("click", () => dialog.close());
  $("#hw-viewer-prev").addEventListener("click", () => openDecor(current - 1));
  $("#hw-viewer-next").addEventListener("click", () => openDecor(current + 1));
  $("#hw-viewer-reset").addEventListener("click", () => viewer?.reset());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") openDecor(current - 1);
    if (event.key === "ArrowRight") openDecor(current + 1);
  });

  // ---------- Bingo ----------
  const monChip = ([id, name]) => `<a class="hw-mon" href="pokedex.html#pokemon/${id}" title="${esc(name)}"><img src="${SPRITES}/pokemon/${id}.png" alt="" width="48" height="48" loading="lazy"><span>${esc(name)}</span></a>`;
  function missionHtml(m, index) {
    const value = valueOf(m);
    const done = value >= m.goal;
    const extra = [
      m.mons ? `<div class="hw-mons">${m.mons.map(monChip).join("")}</div>` : "",
      m.lines ? `<div class="hw-lines">${m.lines.map((line) => `<div class="hw-line">${line.map(monChip).join('<i aria-hidden="true">›</i>')}</div>`).join("")}</div>` : "",
      m.recipe ? `<div class="hw-recipe"><img src="${m.recipe}" alt="Receta: una calabaza en el centro rodeada por las 8 bayas" width="277" height="192"><img src="${m.icon}" alt="Baya Calabaza" width="66" height="66"></div>
        <div class="hw-berries">${m.berries.map(([id, name]) => `<a class="hw-berry" href="bayas.html#baya-${id}"><img src="assets/img/bayas/${id}_berry.png" alt="" width="32" height="32">Baya ${esc(name)}</a>`).join("")}</div>` : "",
      m.image ? `<img class="hw-mission-img" src="${m.image}" alt="Así es un Litwick escondido" width="142" height="196" loading="lazy">` : "",
      m.link ? `<a class="v-btn is-ghost is-sm hw-link" href="${m.link[1]}">${esc(m.link[0])} →</a>` : "",
    ].join("");
    return `<li class="hw-mission v-card${done ? " is-done" : ""}" data-mission="${m.id}">
      <div class="hw-mission-head">
        <span class="hw-mission-num">${index + 1}</span>
        <img class="hw-mission-ico" src="${icon(m.icon)}" alt="" width="48" height="48">
        <div class="hw-mission-title"><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p></div>
        <div class="hw-counter" role="group" aria-label="Progreso de la misión ${index + 1}">
          <button type="button" class="hw-step" data-step="-1" aria-label="Restar uno">−</button>
          <input class="hw-value" type="number" inputmode="numeric" min="0" max="${m.goal}" value="${value}" aria-label="Llevas">
          <span class="hw-goal">/${m.goal}</span>
          <button type="button" class="hw-step" data-step="1" aria-label="Sumar uno">+</button>
          <button type="button" class="hw-done" aria-pressed="${done}" title="${done ? "Completada" : "Marcar como completada"}">${done ? "✓" : "Hecha"}</button>
        </div>
      </div>
      <details class="hw-tips"${index === 0 ? " open" : ""}><summary>Cómo hacerla</summary><p class="hw-tip">${m.tip}</p>${extra}</details>
    </li>`;
  }
  function renderCard() {
    const done = missions.map(isDone);
    const filled = new Set([4, ...CELLS.filter((cell, i) => done[i])]);
    $("#hw-card").innerHTML = Array.from({ length: 9 }, (_, cell) => {
      if (cell === 4) return '<span class="hw-cell is-free"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="" width="56" height="56"></span>';
      const i = CELLS.indexOf(cell);
      const m = missions[i];
      return `<span class="hw-cell${done[i] ? " is-done" : ""}" title="${esc(m.title)}">${done[i] ? `<img src="${icon(m.icon)}" alt="" width="52" height="52">` : `<b>${i + 1}</b><i>?</i>`}</span>`;
    }).join("");
    const lines = LINES.filter((line) => line.every((cell) => filled.has(cell))).length;
    const count = done.filter(Boolean).length;
    $("#hw-card-count").innerHTML = `Casillas <b>${count}/8</b>${count === 8 ? " · <strong>¡BINGO!</strong>" : lines ? ` · <strong>¡${lines === 1 ? "Línea" : `${lines} líneas`}!</strong>` : ""}`;
    $("#hw-rewards").innerHTML = EV.bingo.rewards.map((reward) => {
      const got = reward.key === "linea" ? lines > 0 : count === 8;
      const prizes = reward.items.map(([name, img, note]) => `<li title="${esc(note || name)}">${img ? `<img src="${img}" alt="" width="32" height="32" loading="lazy">` : '<span aria-hidden="true">💰</span>'}<span>${esc(name)}${note ? `<small>${esc(note)}</small>` : ""}</span></li>`).join("");
      return `<div class="hw-reward${got ? " is-got" : ""}"><span aria-hidden="true">${reward.key === "linea" ? "🧰" : "🎁"}</span><b>${esc(reward.name)}</b><small>${esc(reward.text)}</small>${prizes ? `<ul class="hw-prizes">${prizes}</ul>` : ""}</div>`;
    }).join("");
  }
  function renderMissions() {
    $("#hw-missions").innerHTML = missions.map(missionHtml).join("");
  }
  function setValue(id, value) {
    const m = missions.find((x) => x.id === id);
    if (!m) return;
    progress[id] = Math.min(m.goal, Math.max(0, Math.round(Number(value) || 0)));
    save();
    const item = document.querySelector(`[data-mission="${id}"]`);
    const done = progress[id] >= m.goal;
    item.classList.toggle("is-done", done);
    item.querySelector(".hw-value").value = progress[id];
    const doneBtn = item.querySelector(".hw-done");
    doneBtn.setAttribute("aria-pressed", String(done));
    doneBtn.textContent = done ? "✓" : "Hecha";
    renderCard();
  }
  $("#hw-missions").addEventListener("click", (event) => {
    const item = event.target.closest("[data-mission]");
    if (!item) return;
    const m = missions.find((x) => x.id === item.dataset.mission);
    const step = event.target.closest("[data-step]");
    if (step) setValue(m.id, valueOf(m) + Number(step.dataset.step));
    if (event.target.closest(".hw-done")) setValue(m.id, isDone(m) ? 0 : m.goal);
  });
  $("#hw-missions").addEventListener("change", (event) => {
    if (!event.target.matches(".hw-value")) return;
    setValue(event.target.closest("[data-mission]").dataset.mission, event.target.value);
  });
  $("#hw-reset").addEventListener("click", () => {
    if (!confirm("¿Borrar tu progreso del Bingo en este navegador?")) return;
    progress = {};
    save();
    renderMissions();
    renderCard();
  });
  renderMissions();
  renderCard();

  // ---------- El Adivinador: equipo y preguntas para practicar ----------
  const ADV = EV.adivinador;
  if (ADV && $("#hw-adv-team")) {
    const TYPE_HEX = { Siniestro: "#624d4e", Fuego: "#e62829", Veneno: "#9141cb", Volador: "#81b9ef" };
    $("#hw-adv-team").innerHTML = `${ADV.skin ? `<img class="hw-adv-skin" src="${ADV.skin}" alt="El Adivinador" width="64" height="128">` : ""}<h3>Equipo del ${esc(ADV.name)} <span>Nv. ${ADV.level}</span></h3>
      <ul>${ADV.team.map((mon) => `<li><a href="pokedex.html#pokemon/${mon.id}"><img src="${SPRITES}/pokemon/${mon.id}.png" alt="" width="72" height="72" loading="lazy"><b>${esc(mon.name)}</b>
        <span class="hw-types">${mon.types.map((type) => `<i style="--t:${TYPE_HEX[type] || "#666"}">${esc(type)}</i>`).join("")}</span></a></li>`).join("")}</ul>
      <p class="hw-tip">💡 Un Pokémon de tipo <strong>Roca</strong> pega súper eficaz a los tres (Fuego y Volador son débiles a Roca). El tipo <strong>Eléctrico</strong> y el <strong>Hielo</strong> van muy bien contra Crobat y Honchkrow.</p>`;
    $("#hw-quiz").innerHTML = ADV.questions.map((question, qi) => `<li class="hw-q v-card" data-q="${qi}">
        <p class="hw-q-text"><span>Pregunta ${qi + 1} de ${ADV.questions.length}</span>${esc(question.q)}</p>
        <div class="hw-q-options">${question.options.map((option, oi) => `<button type="button" class="hw-q-opt" data-o="${oi}"><b>${"ABCD"[oi]}</b>${esc(option)}</button>`).join("")}</div>
        <p class="hw-q-result" hidden></p>
      </li>`).join("");
    $("#hw-quiz").addEventListener("click", (event) => {
      const button = event.target.closest("[data-o]");
      if (!button) return;
      const item = button.closest("[data-q]");
      const question = ADV.questions[Number(item.dataset.q)];
      const right = Number(button.dataset.o) === question.answer;
      item.querySelectorAll("[data-o]").forEach((option) => {
        option.disabled = true;
        option.classList.toggle("is-right", Number(option.dataset.o) === question.answer);
      });
      if (!right) button.classList.add("is-wrong");
      const result = item.querySelector(".hw-q-result");
      result.hidden = false;
      result.className = `hw-q-result ${right ? "is-right" : "is-wrong"}`;
      result.textContent = `${right ? "✔ ¡Correcto!" : `✘ Era la ${"ABCD"[question.answer]}: ${question.options[question.answer]}.`}${question.why ? ` ${question.why}` : ""}`;
    });
  }

  // ---------- Recorrido: Entrenadores Misteriosos, laberinto y parkour ----------
  if (EV.route && $("#hw-route")) {
    let battle = 0;
    const monCard = (mon) => `<a class="hw-route-mon" href="pokedex.html#pokemon/${mon.id}" title="${esc(mon.label || mon.name)}">
        <img src="${SPRITES}/pokemon/${mon.sprite || mon.id}.png" alt="" width="64" height="64" loading="lazy">
        <span>${esc(mon.label || mon.name)}</span></a>`;
    const reward = ([text, img, note]) => `<li>${img ? `<img src="${img}" alt="" width="40" height="40" loading="lazy">` : '<span class="hw-coin" aria-hidden="true">💰</span>'}<b>${esc(text)}</b>${note ? `<small>${esc(note)}</small>` : ""}</li>`;
    $("#hw-route").innerHTML = EV.route.map((step) => {
      if (step.kind === "battle") {
        battle += 1;
        return `<li class="hw-route-step is-battle v-card">
          <img class="hw-route-skin" src="${step.skin}" alt="" width="64" height="128" loading="lazy">
          <div class="hw-route-body">
            <p class="hw-route-kicker">${esc(step.title)} · Nv. ${step.level}</p>
            <h3>${esc(step.name)}</h3>
            <p class="hw-small">${esc(step.where)}</p>
            <div class="hw-route-team">${step.team.map(monCard).join("")}</div>
            <p class="hw-route-label">Recompensa</p>
            <ul class="hw-route-rewards">${step.rewards.map(reward).join("")}</ul>
          </div>
        </li>`;
      }
      return `<li class="hw-route-step is-step v-card">
          <span class="hw-route-icon" aria-hidden="true">${step.icon}</span>
          <div class="hw-route-body">
            <h3>${esc(step.name)}</h3>
            <p>${step.text}</p>
            ${step.maze ? `<button type="button" class="v-btn is-ghost is-sm" data-maze aria-expanded="false">👀 Ver la ruta del laberinto (spoiler)</button>
              <figure class="hw-maze" hidden><img src="${step.maze}" alt="Mapa del laberinto con la ruta marcada en rojo" width="446" height="858" loading="lazy">
              <figcaption class="hw-small">Sigue la línea roja: empieza arriba a la izquierda (P) y baja hasta la salida.</figcaption></figure>` : ""}
          </div>
        </li>`;
    }).join("");
    $("#hw-route").addEventListener("click", (event) => {
      const button = event.target.closest("[data-maze]");
      if (!button) return;
      const figure = button.nextElementSibling;
      figure.hidden = !figure.hidden;
      button.setAttribute("aria-expanded", String(!figure.hidden));
      button.textContent = figure.hidden ? "👀 Ver la ruta del laberinto (spoiler)" : "🙈 Ocultar la ruta";
    });
  }

  // ---------- Mapa de la Mansión (Leaflet): 1 píxel = 1 bloque; latlng = [-z, x] ----------
  const M = EV.mansion;
  if (M && window.L && $("#hw-map")) {
    const { minX, maxX, minZ, maxZ } = M.bounds;
    const toLatLng = ([x, , z]) => L.latLng(-z, x);
    const box = L.latLngBounds([-maxZ, minX], [-minZ, maxX]);
    const map = L.map("hw-map", { crs: L.CRS.Simple, minZoom: -1, maxZoom: 3, zoomSnap: 0.25, maxBounds: box.pad(0.15), attributionControl: false });
    L.imageOverlay(M.image, box, { className: "hw-map-image" }).addTo(map);
    map.fitBounds(box);
    const pin = (html, cls) => L.divIcon({ className: `hw-pin ${cls}`, html, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -14] });
    const coords = ([x, y, z]) => `X ${x} · Y ${y} · Z ${z}`;
    L.marker(toLatLng(M.adivinador), { icon: pin(`<img src="${EV.adivinador?.face || `${SPRITES}/pokemon/202.png`}" alt="" class="is-face">`, "is-npc"), title: "Adivinador" })
      .bindPopup(`<strong>Adivinador</strong> · Gimnasio Psíquico<br>${coords(M.adivinador)}<br><a href="#adivinador">Ver su equipo y sus preguntas</a>`).addTo(map);
    // Los Entrenadores Misteriosos: casi en la misma X/Z, a distinta altura (centro, encima y más arriba).
    (EV.route || []).filter((step) => step.pos).forEach((step, i, list) => {
      const offset = (i - (list.length - 1) / 2) * 30;
      const latlng = toLatLng(step.pos);
      L.marker(L.latLng(latlng.lat, latlng.lng + offset), { icon: pin(`<img src="${step.face}" alt="" class="is-face">`, "is-npc"), title: step.name, zIndexOffset: 500 })
        .bindPopup(`<strong>${esc(step.name)}</strong> · ${esc(step.title)}<br>${coords(step.pos)}<br>${esc(step.where)}<br><a href="#recorrido">Ver el recorrido</a>`).addTo(map);
    });

    // Litwick: ocultos hasta pulsar «Mostrar»; los encontrados se guardan y cuentan en la misión.
    // Los encontrados se guardan por coordenadas («x,y,z»): no se descuadran si cambia la lista.
    const keyOf = (point) => point.join(",");
    const found = new Set((Array.isArray(progress.litwickFound) ? progress.litwickFound : []).filter((key) => typeof key === "string"));
    const mission = missions.find((m) => m.id === "litwick");
    const floors = [["all", "Todos"], ["low", "Abajo (Y −24 a −22)"], ["mid", "Medio (Y −17 a −14)"], ["high", "Arriba (Y −8 a −2)"], ["tower", "Torres (Y 36 a 95)"]];
    const floorOf = (y) => (y <= -20 ? "low" : y <= -10 ? "mid" : y <= 10 ? "high" : "tower");
    let floor = "all";
    const layer = L.layerGroup();
    const markers = M.litwicks.map((point, i) => {
      const marker = L.marker(toLatLng(point), { title: `Litwick ${i + 1}` });
      marker.on("popupopen", (event) => {
        event.popup.getElement().querySelector("[data-found]")?.addEventListener("click", () => {
          const key = keyOf(M.litwicks[i]);
          if (found.has(key)) found.delete(key); else found.add(key);
          progress.litwickFound = [...found];
          if (mission) setValue(mission.id, Math.min(mission.goal, found.size));
          save();
          paint();
          marker.closePopup();
        });
      });
      return marker;
    });
    function paint() {
      markers.forEach((marker, i) => {
        const point = M.litwicks[i];
        const done = found.has(keyOf(point));
        marker.setIcon(pin(`<img src="${SPRITES}/pokemon/607.png" alt=""><b>${i + 1}</b>`, done ? "is-found" : "is-lit"));
        marker.bindPopup(`<strong>Litwick ${i + 1}</strong><br>${coords(point)}<br><button type="button" class="hw-pin-btn" data-found>${done ? "Marcar como pendiente" : "✓ Lo encontré"}</button>`);
        const visible = floor === "all" || floorOf(point[1]) === floor;
        if (visible) layer.addLayer(marker); else layer.removeLayer(marker);
      });
      $("#hw-map-count").innerHTML = `Encontrados <b>${found.size}</b> de ${M.litwicks.length} · hay más de los necesarios: la misión pide ${mission ? mission.goal : 20}`;
    }
    $("#hw-map-floors").innerHTML = floors.map(([key, label]) => `<button type="button" class="v-chip" data-floor="${key}" aria-pressed="${key === floor}">${label}</button>`).join("");
    $("#hw-map-floors").addEventListener("click", (event) => {
      const button = event.target.closest("[data-floor]");
      if (!button) return;
      floor = button.dataset.floor;
      $$("#hw-map-floors [data-floor]").forEach((chip) => chip.setAttribute("aria-pressed", String(chip === button)));
      paint();
    });
    $("#hw-map-spoiler").addEventListener("click", (event) => {
      const show = event.currentTarget.getAttribute("aria-pressed") !== "true";
      event.currentTarget.setAttribute("aria-pressed", String(show));
      event.currentTarget.textContent = show ? "🙈 Ocultar los Litwick" : "👀 Mostrar los Litwick (spoiler)";
      $("#hw-map-floors").hidden = !show;
      if (show) { layer.addTo(map); paint(); } else layer.remove();
    });
    // Si el contador de la misión se reinicia, también los marcados en el mapa.
    $("#hw-reset").addEventListener("click", () => { if (!progress.litwickFound) { found.clear(); paint(); } });
  }
})();
