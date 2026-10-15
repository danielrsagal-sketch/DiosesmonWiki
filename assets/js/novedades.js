// Novedades: línea de tiempo con filtro por tipo de cambio.
const NEWS_TAGS = {
  nuevo: { label: "Nuevo", color: "#43db95" },
  mejora: { label: "Mejora", color: "#4bb6ff" },
  arreglo: { label: "Arreglo", color: "#ffb347" },
};
const NEWS_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatNewsDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} de ${NEWS_MONTHS[month - 1]} de ${year}`;
}

(function renderNews() {
  const entries = window.DIOSESMON_NOVEDADES ?? [];
  const list = document.getElementById("news-list");
  const filter = document.getElementById("news-filter");
  const count = document.getElementById("news-count");
  let active = "todo";

  const chips = [["todo", "Todo", null], ...Object.entries(NEWS_TAGS).filter(([key]) => entries.some((entry) => entry.tag === key)).map(([key, tag]) => [key, tag.label, tag.color])];
  filter.innerHTML = chips.map(([key, label, color]) => {
    const total = key === "todo" ? entries.length : entries.filter((entry) => entry.tag === key).length;
    return `<button class="guide-chip" type="button" data-tag="${key}" aria-pressed="${key === active}"${color ? ` style="--section-color:${color}"` : ""}>${label} · ${total}</button>`;
  }).join("");

  const draw = () => {
    const shown = entries.filter((entry) => active === "todo" || entry.tag === active);
    count.textContent = `${shown.length} ${shown.length === 1 ? "cambio" : "cambios"}`;
    list.innerHTML = shown.map((entry) => {
      const tag = NEWS_TAGS[entry.tag] ?? NEWS_TAGS.mejora;
      const links = entry.links?.length
        ? `<div class="info-links">${entry.links.map(([label, href]) => `<a class="info-link" style="--section-color:${tag.color}" href="${href}">${label} →</a>`).join("")}</div>`
        : "";
      return `<li class="news-item" style="--tag-color:${tag.color}">
        <div class="news-head"><span class="news-tag">${tag.label}</span><h3>${entry.title}</h3><time class="news-date" datetime="${entry.date}">${formatNewsDate(entry.date)}</time></div>
        <ul>${entry.items.map((item) => `<li>${item}</li>`).join("")}</ul>${links}
      </li>`;
    }).join("");
  };

  filter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tag]");
    if (!button) return;
    active = button.dataset.tag;
    filter.querySelectorAll("[data-tag]").forEach((chip) => chip.setAttribute("aria-pressed", String(chip === button)));
    draw();
  });
  if (entries.length) document.getElementById("news-last").textContent = formatNewsDate(entries[0].date);
  draw();
})();
