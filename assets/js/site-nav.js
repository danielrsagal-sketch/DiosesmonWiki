// Secciones de la wiki: pestañas de la barra superior y tarjetas de Inicio.
// Para añadir, quitar o reordenar una sección basta con editar esta lista.
// Las pestañas que no caben a lo ancho pasan solas al menú «Más».
//   icon: sprite de PokéAPI (items/<nombre> o pokemon/<número>)
//   ready: false muestra la tarjeta de Inicio como «En construcción»
const SITE_SECTIONS = [
  { href: "index.html", label: "Inicio" },
  { href: "pokedex.html", label: "Pokédex", ready: true, icon: "items/poke-ball", color: "#ff5a5a", description: "Pokémon, formas regionales y fusiones con stats, hábitat, movimientos y captura." },
  { href: "dexrewards.html", label: "DexRewards", ready: true, icon: "items/coupon-1", color: "#5ee1ff", description: "Premios por completar la Pokédex general y la de cada generación." },
  { href: "gimnasios.html", label: "Gimnasios", ready: true, icon: "badges/1", color: "#ffd442", description: "Líderes, Alto Mando, Campeones y level caps de cada región." },
  { href: "misiones.html", label: "Misiones", icon: "items/town-map", color: "#9ce35a", description: "Misiones del servidor, requisitos y recompensas." },
  { href: "trabajo.html", label: "Trabajo", icon: "items/amulet-coin", color: "#ffa64d", description: "Oficios, pagos por acción y niveles de cada trabajo." },
  { href: "kits.html", label: "Kits", icon: "items/premier-ball", color: "#e8ecf4", description: "Qué trae cada kit y cada cuánto se reclama." },
  { href: "tesoros.html", label: "Tesoros", icon: "items/big-nugget", color: "#ffd442", description: "Tesoros escondidos, dónde buscarlos y qué guardan." },
  { href: "torre-batalla.html", label: "Torre Batalla", icon: "items/muscle-band", color: "#b38cff", description: "Formato, rangos y premios de la Torre Batalla." },
  { href: "crianza.html", label: "Crianza", icon: "items/oval-charm", color: "#ff6fb1", description: "Herencia, objetos útiles y huevos de 3.000 pasos." },
  { href: "fosiles.html", label: "Fósiles", icon: "items/old-amber", color: "#c9a26b", description: "Fósiles, dónde encontrarlos y cómo revivirlos." },
  { href: "monturas.html", label: "Monturas", icon: "items/air-balloon", color: "#4bb6ff", description: "Pokémon montables por tierra, agua y aire." },
  { href: "entrenamiento-ev.html", label: "Entrenamiento EV", icon: "items/power-bracer", color: "#43db95", description: "Cómo repartir EVs y sacar el máximo a tu equipo." },
  { href: "pesca.html", label: "Pesca", icon: "items/super-rod", color: "#4bb6ff", description: "Cañas, cebos y qué se pesca en cada agua." },
  { href: "feedback.html", label: "Feedback", ready: true, icon: "items/poke-ball", color: "#ffd442", description: "Envía ideas, errores o datos que falten en la wiki." },
];

(function renderSiteNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  const link = ({ href, label }) => `<a href="${href}"${href === current ? ' class="active" aria-current="page"' : ""}>${label}</a>`;

  document.querySelectorAll("[data-site-nav]").forEach((nav, index) => {
    const menuId = `nav-more-menu-${index}`;
    nav.innerHTML = `${SITE_SECTIONS.map(link).join("")}
      <div class="nav-more">
        <button class="nav-more-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="${menuId}">Más <i aria-hidden="true"></i></button>
        <div class="nav-more-menu" id="${menuId}" hidden>${SITE_SECTIONS.map(link).join("")}</div>
      </div>`;
    const more = nav.querySelector(".nav-more");
    const button = more.querySelector(".nav-more-btn");
    const menu = more.querySelector(".nav-more-menu");
    const barLinks = [...nav.querySelectorAll(":scope > a")];
    const menuLinks = [...menu.querySelectorAll("a")];
    let closeTimer = null;

    const setOpen = (open) => {
      clearTimeout(closeTimer);
      menu.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      more.classList.toggle("is-open", open);
    };

    // Muestra en la barra todas las pestañas que caben; el resto va al menú «Más».
    const layout = () => {
      barLinks.forEach((item) => { item.hidden = false; });
      more.hidden = false;
      const gap = parseFloat(getComputedStyle(nav).columnGap) || 0;
      const available = nav.clientWidth;
      const widths = barLinks.map((item) => item.offsetWidth + gap);
      const total = widths.reduce((sum, width) => sum + width, 0);
      let visible = barLinks.length;
      if (total > available) {
        let used = more.offsetWidth + gap;
        visible = 0;
        while (visible < barLinks.length && used + widths[visible] <= available) {
          used += widths[visible];
          visible += 1;
        }
      }
      barLinks.forEach((item, position) => { item.hidden = position >= visible; });
      menuLinks.forEach((item, position) => { item.hidden = position < visible; });
      more.hidden = visible === barLinks.length;
      if (more.hidden) setOpen(false);
      // Si la página actual quedó dentro del menú, el botón «Más» se marca como activo.
      button.classList.toggle("active", menuLinks.some((item, position) => position >= visible && item.classList.contains("active")));
    };

    button.addEventListener("click", () => {
      // Con ratón el menú ya se abrió al pasar por encima: el clic no lo cierra.
      if (!menu.hidden && more.matches(":hover") && matchMedia("(hover: hover)").matches) return;
      setOpen(menu.hidden);
    });
    more.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) setOpen(true); });
    more.addEventListener("mouseleave", () => {
      if (matchMedia("(hover: hover)").matches) closeTimer = setTimeout(() => setOpen(false), 180);
    });
    document.addEventListener("click", (event) => { if (!more.contains(event.target)) setOpen(false); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        setOpen(false);
        button.focus();
      }
    });
    layout();
    window.addEventListener("resize", layout);
    document.fonts?.ready.then(layout);
  });
})();
