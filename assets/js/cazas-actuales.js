// Cazas actuales en Inicio: las lee de /api/cazas (las guarda el admin) o, si no hay, de data/cazas-data.js.
(function cazasActuales() {
  const section = document.getElementById("home-cazas-section");
  const root = document.getElementById("home-cazas");
  const config = window.DIOSESMON_CAZAS;
  if (!section || !root || !config) return;
  const HOURS = config.rotationHours ?? 12;
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const money = (value) => `${value.toLocaleString("es", { useGrouping: "always" })} $`;
  const tierOf = (kind, stars) => config.kinds.find((entry) => entry.kind === kind)?.tiers.find((tier) => tier.stars === stars);
  const stars = (count) => `<span class="caza-stars">${"★".repeat(count)}<i>${"★".repeat(5 - count)}</i></span>`;
  const pad = (value) => String(value).padStart(2, "0");
  let current = null;
  // Fin de la rotación: la hora exacta que manda el mod, o inicio + 12 h.
  const endOf = (data) => (data.expiresAt ? Date.parse(data.expiresAt) : Date.parse(data.startedAt) + HOURS * 3600000);
  const extraChips = (hunt) => {
    const chips = [
      hunt.ball && `<span title="Poké Ball">◓ ${escapeHtml(hunt.ball)}</span>`,
      hunt.ability && `<span title="Habilidad">✦ ${escapeHtml(hunt.ability)}</span>`,
      hunt.eggGroup && `<span title="Grupo huevo">🥚 ${escapeHtml(hunt.eggGroup)}</span>`,
      hunt.rarity && `<span title="Rareza">${escapeHtml(hunt.rarity)}</span>`,
    ].filter(Boolean);
    return chips.length ? `<span class="hc-extra">${chips.join("")}</span>` : "";
  };

  const huntCard = (hunt, kind) => {
    const tier = tierOf(kind, hunt.stars);
    const href = kind === "crianza" ? `crianza.html#${hunt.id}${hunt.ivs === 4 ? "-4" : ""}` : `pokedex.html#pokemon/${hunt.id}`;
    const rewards = Array.isArray(hunt.rewards) && hunt.rewards.length ? ` title="Recompensas: ${escapeHtml(hunt.rewards.join(" · "))}"` : "";
    return `<a class="hc-hunt" href="${href}"${rewards}>
      <img src="${SPRITES}/${hunt.id}.png" alt="" width="72" height="72" loading="lazy">
      <span class="hc-hunt-body">
        <strong>${escapeHtml(hunt.name)}</strong>
        ${stars(hunt.stars)}
        ${kind === "crianza" ? `<small class="hc-ivs">${hunt.ivs}/6 IVs</small>` : ""}
        ${extraChips(hunt)}
        <b class="hc-money">${tier ? money(tier.money) : "—"}</b>
      </span>
    </a>`;
  };

  const draw = () => {
    if (!current) return;
    const end = endOf(current);
    const now = Date.now();
    section.hidden = false;
    if (now >= end) {
      // Ya rotaron y aún no se han actualizado en la wiki: se cuenta hasta la siguiente rotación.
      const next = end + Math.ceil((now - end + 1) / (HOURS * 3600000)) * HOURS * 3600000;
      const left = Math.max(0, next - now);
      root.innerHTML = `<p class="hc-stale">Las Cazas ya rotaron y las nuevas todavía no están en la wiki. Míralas en el menú de <strong>Cazas</strong> del juego.<span>Próxima rotación en <b>${Math.floor(left / 3600000)} h ${pad(Math.floor(left / 60000) % 60)} min</b></span></p>`;
      return;
    }
    const left = end - now;
    const timer = `${Math.floor(left / 3600000)} h ${pad(Math.floor(left / 60000) % 60)} min ${pad(Math.floor(left / 1000) % 60)} s`;
    const column = (kind, title, list) => `<div class="hc-col is-${kind}"><h3>${title}</h3><div class="hc-list">${list.map((hunt) => huntCard(hunt, kind)).join("") || '<p class="hc-empty">Sin cazas</p>'}</div></div>`;
    root.innerHTML = `
      <div class="hc-timer"><span><i aria-hidden="true"></i>Rotan en</span><b data-hc-timer>${timer}</b><small>Completa las Cazas antes de que roten</small></div>
      <div class="hc-cols">${column("captura", "Captura", current.captura)}${column("crianza", "Crianza · IVs perfectos", current.crianza)}</div>`;
  };

  const load = async () => {
    try {
      const response = await fetch("/api/cazas", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const saved = await response.json();
      // Si el respaldo de la wiki es más nuevo que lo guardado, gana el respaldo.
      current = !config.current || Date.parse(saved.startedAt) >= Date.parse(config.current.startedAt) ? saved : config.current;
    } catch {
      current = config.current ?? null;
    }
    draw();
  };

  load();
  setInterval(() => {
    const box = root.querySelector("[data-hc-timer]");
    if (!box) return draw();
    const left = endOf(current) - Date.now();
    if (left <= 0) return draw();
    box.textContent = `${Math.floor(left / 3600000)} h ${pad(Math.floor(left / 60000) % 60)} min ${pad(Math.floor(left / 1000) % 60)} s`;
  }, 1000);
  setInterval(load, 5 * 60000);
})();
