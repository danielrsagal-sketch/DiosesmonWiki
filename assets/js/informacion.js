// Información del servidor en Inicio: tarjetas con cuenta atrás y horas en la zona horaria de cada jugador.
const INFO_SERVER_ZONE = "America/Santiago";
const INFO_DAY = 86400000;
const INFO_TAGS = { evento: "Evento", novedad: "Novedad" };

const infoZone = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
})();
const infoZoneLabel = infoZone ? infoZone.split("/").pop().replace(/_/g, " ") : "";

function infoFormat(date, timeZone) {
  const text = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false, ...(timeZone ? { timeZone } : {}) }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function infoState(item, now) {
  const start = Date.parse(item.start);
  const end = item.end ? Date.parse(item.end) : null;
  if (end && now >= end) return "ended";
  if (now < start) return "soon";
  if (end) return "live";
  return now - start < (item.newDays ?? 14) * INFO_DAY ? "new" : "available";
}

function infoCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const parts = [[Math.floor(total / 86400), "días"], [Math.floor(total / 3600) % 24, "horas"], [Math.floor(total / 60) % 60, "min"], [total % 60, "seg"]];
  return parts.map(([value, unit]) => `<span><b>${String(value).padStart(2, "0")}</b><small>${unit}</small></span>`).join("");
}

(function renderInfo() {
  const root = document.getElementById("home-info");
  const section = document.getElementById("home-info-section");
  const items = window.DIOSESMON_INFORMACION ?? [];
  if (!root || !section) return;
  const order = { live: 0, soon: 1, new: 2, available: 3 };
  let signature = "";

  const timeLine = (label, iso) => {
    const date = new Date(iso);
    const sameZone = infoFormat(date) === infoFormat(date, INFO_SERVER_ZONE);
    return `<p class="info-time"><span>${label}</span><strong>${infoFormat(date)}</strong>${infoZoneLabel ? `<em>tu hora · ${infoZoneLabel}</em>` : ""}${sameZone ? "" : `<small>${new Intl.DateTimeFormat("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: INFO_SERVER_ZONE }).format(date)} en Chile</small>`}</p>`;
  };

  const status = (item, state, now) => {
    if (state === "soon") return `<div class="info-count"><p>${item.end ? "Empieza en" : "Disponible en"}</p><div data-count="${item.start}">${infoCountdown(Date.parse(item.start) - now)}</div></div>`;
    if (state === "live") return `<div class="info-count is-live"><p><i aria-hidden="true"></i>¡En curso! Termina en</p><div data-count="${item.end}">${infoCountdown(Date.parse(item.end) - now)}</div></div>`;
    return `<div class="info-count is-done"><p><i aria-hidden="true"></i>¡Ya disponible en el servidor!</p></div>`;
  };

  const draw = () => {
    const now = Date.now();
    const visible = items.map((item) => ({ item, state: infoState(item, now) }))
      .filter(({ state }) => state !== "ended")
      .sort((a, b) => order[a.state] - order[b.state] || Date.parse(a.item.start) - Date.parse(b.item.start));
    signature = visible.map(({ item, state }) => `${item.id}:${state}`).join("|");
    section.hidden = visible.length === 0;
    root.innerHTML = visible.map(({ item, state }) => {
      const badge = state === "new" ? `<span class="info-badge is-new">¡Nuevo!</span>` : state === "live" ? `<span class="info-badge is-live">En curso</span>` : state === "soon" ? `<span class="info-badge">Próximamente</span>` : "";
      return `<article class="info-event is-${state}" id="info-${item.id}">
        <a class="info-event-img" href="${item.image}" target="_blank" rel="noreferrer"><span class="info-event-bg" style="background-image:url('${item.image}')" aria-hidden="true"></span><img src="${item.image}" alt="${item.title}" loading="lazy" width="1200" height="800"></a>
        <div class="info-event-body">
          <div class="info-tags"><span class="info-tag is-${item.tag}">${INFO_TAGS[item.tag] ?? "Información"}</span>${badge}</div>
          <h3>${item.title}</h3>
          <p class="info-text">${item.text}</p>
          <div class="info-times">${timeLine(item.end ? "Empieza" : "Llega", item.start)}${item.end ? timeLine("Termina", item.end) : ""}</div>
          ${status(item, state, now)}
          ${item.link ? `<a class="info-event-link" href="${item.link[1]}">${item.link[0]} →</a>` : ""}
        </div>
      </article>`;
    }).join("");
  };

  draw();
  setInterval(() => {
    const now = Date.now();
    const current = items.map((item) => ({ item, state: infoState(item, now) })).filter(({ state }) => state !== "ended").map(({ item, state }) => `${item.id}:${state}`).join("|");
    if (current !== signature) return draw();
    root.querySelectorAll("[data-count]").forEach((box) => { box.innerHTML = infoCountdown(Date.parse(box.dataset.count) - now); });
  }, 1000);
})();
