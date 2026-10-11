// Trabajos: los 7 oficios del servidor (datos del menú /trabajos y del Excel del staff).
(function renderJobs() {
  const ITEMS = "assets/img/items";
  const JOBS = [
    {
      key: "cosechador", name: "Cosechador", icon: `${ITEMS}/minecraft/golden_hoe.png`, color: "#7fd35b", xp: 13,
      action: "Recolectando bayas y bonguris (apricorns).",
      details: ["Cosecha con la mano cualquier tipo de baya o bonguri."],
      tip: "Planta varias bayas juntas cerca de casa: también te sirven para la crianza y el entrenamiento EV.",
    },
    {
      key: "minero", name: "Minero", icon: `${ITEMS}/minecraft/diamond_pickaxe.png`, color: "#5ee1ff", xp: 175,
      action: "Minando piedra o minerales.",
      details: ["Cuenta la piedra y los minerales naturales del mundo.", "Los bloques colocados por jugadores (por ejemplo, cobblestone puesta) no cuentan."],
      tip: "Un pico con Eficiencia y Fortuna (como los de los kits) acelera muchísimo el progreso.",
    },
    {
      key: "excavador", name: "Excavador", icon: `${ITEMS}/minecraft/golden_shovel.png`, color: "#e8c45a", xp: 175,
      action: "Excavando tierra o arena.",
      details: ["Cuenta excavar tierra o arena."],
      tip: "Las playas y los desiertos tienen arena de sobra; de paso puedes buscar yacimientos de fósiles.",
    },
    {
      key: "coleccionista", name: "Coleccionista", icon: `${ITEMS}/cobblemon/poke_ball.png`, color: "#ff5a5a", xp: 3,
      action: "Capturando Pokémon.",
      details: ["Cuenta capturar Pokémon tanto fuera como dentro de combate.", "Cada captura suma, da igual la especie."],
      tip: "Encaja con completar la Pokédex: cada captura te acerca también a las recompensas de DexRewards.",
    },
    {
      key: "combatiente", name: "Combatiente", icon: `${ITEMS}/minecraft/iron_sword.png`, color: "#ff8a3d", xp: 4,
      action: "Derrotando Pokémon en combate.",
      details: ["Solo cuenta derrotar Pokémon dentro de un combate."],
      tip: "Sube el trabajo mientras haces el entrenamiento EV de tu equipo: matas dos pájaros de un tiro.",
    },
    {
      key: "pescador", name: "Pescador", icon: "assets/img/trabajos/pescador.png", color: "#4bb6ff", xp: 3,
      action: "Pescando Pokémon.",
      details: ["Tienes que pescar el Pokémon con la caña y además capturarlo: hacen falta las dos cosas.", "Pescar sin capturar no suma."],
      tip: "Lleva Poké Balls de sobra y usa cebos con bayas para atraer lo que buscas.",
    },
    {
      key: "criador", name: "Criador", icon: "assets/img/trabajos/criador.png", color: "#ff6fb1", xp: 2,
      action: "Eclosionando huevos de la guardería.",
      details: ["Progresa haciendo crianza y eclosionando los huevos.", "Cuantos más IVs perfectos tenga la cría, más experiencia ganas."],
      tip: "Haz cadenas de crianza con pesas y brazales: cada huevo con muchos 31 da más experiencia.",
    },
  ];
  // Trabajos activos a la vez según el rango (tienda de Diosesmon).
  const RANKS = [
    { name: "Usuario", jobs: 1, color: "#e8ecf4" },
    { name: "Entrenador", jobs: 1, color: "#ff5a5a" },
    { name: "AS", jobs: 1, color: "#6f9bff" },
    { name: "Líder", jobs: 2, color: "#ffa64d" },
    { name: "Maestro", jobs: 3, color: "#b67bff" },
  ];
  // XP para pasar del nivel L al L+1 = base × L (comprobado en el servidor).
  // XP total para llegar al nivel N desde el 1 = base × N × (N − 1) / 2.
  const MAX_LEVEL = 125;
  const xpForLevel = (job, level) => job.xp * level;
  const xpToReach = (job, level) => (job.xp * level * (level - 1)) / 2;
  const number = (value) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

  document.getElementById("job-tips").innerHTML = JOBS.map((job) => `<li><img src="${job.icon}" alt="">${job.name}</li>`).join("");
  document.getElementById("job-grid").innerHTML = JOBS.map((job) => `
    <article class="job-card" id="${job.key}" style="--job-color:${job.color}">
      <header>
        <span class="job-icon"><img src="${job.icon}" alt="" width="48" height="48"></span>
        <div>
          <h3>${job.name}</h3>
          <p class="job-action">${escapeHtml(job.action)}</p>
        </div>
      </header>
      <ul class="job-details">${job.details.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
      <div class="job-meta">
        <span><small>XP por nivel</small><strong>${job.xp} × nivel</strong></span>
        <span><small>XP total hasta el 125</small><strong>${number(xpToReach(job, MAX_LEVEL))}</strong></span>
      </div>
      <p class="job-tip"><strong>Consejo:</strong> ${escapeHtml(job.tip)}</p>
    </article>`).join("");
  // Calculadora: cuánto falta para un nivel.
  const calc = document.getElementById("job-calc");
  calc.innerHTML = `
    <div class="ev-calc-form">
      <label><span>Trabajo</span><select data-job>${JOBS.map((job) => `<option value="${job.key}">${job.name}</option>`).join("")}</select></label>
      <label><span>Nivel actual</span><input data-level type="number" min="1" max="${MAX_LEVEL - 1}" value="1" inputmode="numeric"></label>
      <label><span>XP actual</span><input data-xp type="number" min="0" value="0" inputmode="numeric"></label>
      <label><span>Nivel objetivo</span><input data-target type="number" min="2" max="${MAX_LEVEL}" value="${MAX_LEVEL}" inputmode="numeric"></label>
    </div>
    <div class="ev-calc-out" data-out aria-live="polite"></div>`;
  const clampLevel = (value, min, max) => Math.min(max, Math.max(min, Number.parseInt(value, 10) || min));
  function updateCalc() {
    const job = JOBS.find((entry) => entry.key === calc.querySelector("[data-job]").value);
    const level = clampLevel(calc.querySelector("[data-level]").value, 1, MAX_LEVEL - 1);
    const target = clampLevel(calc.querySelector("[data-target]").value, level + 1, MAX_LEVEL);
    const current = Math.max(0, Number.parseInt(calc.querySelector("[data-xp]").value, 10) || 0);
    const next = xpForLevel(job, level);
    const missing = Math.max(0, xpToReach(job, target) - xpToReach(job, level) - current);
    calc.querySelector("[data-out]").innerHTML = `
      <div class="ev-calc-result"><strong>${number(next)}</strong><span>XP del nivel ${level} al ${level + 1}</span></div>
      <div class="ev-calc-result"><strong>${number(Math.max(0, next - current))}</strong><span>te faltan para el nivel ${level + 1}</span></div>
      <div class="ev-calc-result is-best"><strong>${number(missing)}</strong><span>XP hasta el nivel ${target}</span></div>
      <div class="ev-calc-result"><strong>${number(xpToReach(job, MAX_LEVEL))}</strong><span>XP total del 1 al ${MAX_LEVEL}</span></div>`;
  }
  calc.addEventListener("input", updateCalc);
  calc.addEventListener("change", updateCalc);
  updateCalc();

  document.getElementById("job-ranks").innerHTML = RANKS.map((rank) => `
    <li style="--rank-color:${rank.color}"><strong>${rank.name}</strong><span>${"●".repeat(rank.jobs)}<i>${"●".repeat(3 - rank.jobs)}</i></span><small>${rank.jobs} ${rank.jobs === 1 ? "trabajo activo" : "trabajos activos"}</small></li>`).join("");
})();
