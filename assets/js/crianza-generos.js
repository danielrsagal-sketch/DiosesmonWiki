// Pokémon de un solo sexo o sin género (data/crianza-data.js): cómo se crían y enlace al planificador.
(function crianzaGeneros() {
  const root = document.getElementById("br-genders");
  const species = window.BREEDING_SPECIES ?? [];
  if (!root || !species.length) return;
  const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const NIDORAN = new Set([29, 30, 31, 32, 33, 34]);
  const GROUPS = [
    {
      key: "female", title: "Solo hembra", symbol: "♀", test: (entry) => entry.male === 0,
      text: "Ella es la madre: crúzala con un <strong>macho de su mismo grupo huevo</strong> (o con Ditto) y el huevo sale de su especie. Los IVs del macho pasan igual, así que la cadena es normal.",
    },
    {
      key: "male", title: "Solo macho", symbol: "♂", test: (entry) => entry.male === 1,
      text: "No hay hembra de su especie: <strong>siempre hace falta Ditto</strong> como pareja, y el huevo sale de la especie del macho (de su forma base). Volbeat es la excepción: lo da una Illumise madre.",
    },
    {
      key: "none", title: "Sin género", symbol: "⚲", test: (entry) => entry.male < 0,
      text: "Solo crían con <strong>Ditto</strong>, y Ditto no cría con otro Ditto. Muchos legendarios están en el grupo Desconocido y <strong>no pueden criar</strong>.",
    },
  ];

  const card = (entry) => {
    const noBreed = entry.egg.includes("Desconocido");
    const note = NIDORAN.has(entry.id) ? "Bug: no criar" : noBreed ? "No cría" : entry.egg.join(" · ");
    return `<a class="br-gender-mon${noBreed || NIDORAN.has(entry.id) ? " is-off" : ""}" href="#${entry.id}" data-gender-target title="Planificar la crianza de ${escapeHtml(entry.name)}">
      <img src="${SPRITES}/${entry.id}.png" alt="" width="64" height="64" loading="lazy">
      <strong>${escapeHtml(entry.name)}</strong>
      <small>${escapeHtml(note)}</small>
    </a>`;
  };

  root.innerHTML = GROUPS.map((group) => {
    const list = species.filter(group.test);
    const breedable = list.filter((entry) => !entry.egg.includes("Desconocido") && !NIDORAN.has(entry.id));
    const hidden = list.length - breedable.length;
    return `<details class="br-gender is-${group.key}"${group.key === "none" ? "" : " open"}>
      <summary><span class="br-gender-symbol" aria-hidden="true">${group.symbol}</span><span><strong>${group.title}</strong><small>${list.length} Pokémon${hidden ? ` · ${hidden} no crían` : ""}</small></span></summary>
      <p>${group.text}</p>
      <div class="br-gender-grid">${breedable.map(card).join("")}${hidden ? `<p class="br-gender-sub">No se pueden criar</p>${list.filter((entry) => !breedable.includes(entry)).map(card).join("")}` : ""}</div>
    </details>`;
  }).join("");

  // Al elegir uno se abre en el planificador (crianza.js escucha el cambio de #).
  root.addEventListener("click", (event) => {
    if (!event.target.closest("[data-gender-target]")) return;
    setTimeout(() => document.getElementById("br-plan-title")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  });
})();
