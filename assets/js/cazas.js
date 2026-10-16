// Tablas de recompensas de las Cazas (data/cazas-data.js).
// Se pintan en cada <div data-cazas="captura|crianza|todas"> de la página.
(function renderCazas() {
  const data = window.DIOSESMON_CAZAS;
  if (!data) return;
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";
  const stars = (count) => `<span class="caza-stars" aria-label="${count} de 5 estrellas">${"★".repeat(count)}<i>${"★".repeat(5 - count)}</i></span>`;
  const money = (value) => `${value.toLocaleString("es", { useGrouping: "always" })} $`;

  const kindHtml = (kind, withPlanner) => `
    <article class="caza-kind is-${kind.kind}">
      <header><img src="${SPRITES}/${kind.icon}.png" alt="" width="40" height="40"><div><h3>${kind.title}</h3><p>${kind.text}</p></div></header>
      <div class="caza-tiers">${kind.tiers.map((tier) => `
        <div class="caza-tier">
          <div class="caza-tier-head">${stars(tier.stars)}<span class="caza-need">${tier.need}</span></div>
          <p class="caza-money">${money(tier.money)}</p>
          <ul class="caza-balls">${tier.balls.map(([count, id, name]) => `<li title="${name}"><img src="${SPRITES}/items/${id}.png" alt="" width="30" height="30"><span>${count}× ${name}</span></li>`).join("")}</ul>
          ${withPlanner && tier.ivs >= 4 ? `<a class="caza-plan" href="crianza.html" data-caza-ivs="${tier.ivs}">Planifica la cadena de ${tier.ivs} IVs →</a>` : ""}
        </div>`).join("")}
      </div>
    </article>`;

  document.querySelectorAll("[data-cazas]").forEach((root) => {
    const which = root.dataset.cazas;
    const kinds = data.kinds.filter((kind) => which === "todas" || kind.kind === which);
    root.innerHTML = `<div class="caza-grid">${kinds.map((kind) => kindHtml(kind, root.dataset.planner !== undefined)).join("")}</div>
      <p class="caza-foot">⏱ Las Cazas <strong>rotan cada ${data.rotationHours} horas</strong>: los Pokémon cambian, pero las recompensas según las estrellas suelen ser las mismas. Complétalas antes de que roten.</p>`;
  });

  // En Crianza, el botón lleva al planificador con el objetivo de IVs de la caza.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-caza-ivs]");
    if (!link || !document.getElementById("br-plan-title")) return;
    event.preventDefault();
    document.getElementById("br-plan-title").scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
