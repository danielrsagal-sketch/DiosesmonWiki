// Secciones de la wiki: pestañas de la barra superior y tarjetas de Inicio.
// Para añadir, quitar o reordenar una sección basta con editar esta lista.
// Las pestañas que no caben a lo ancho pasan solas al menú «Más».
//   icon: sprite de PokéAPI (items/<nombre> o pokemon/<número>)
//   ready: false muestra la tarjeta de Inicio como «En construcción»
//   badge: etiqueta destacada en la pestaña y en la tarjeta (p. ej. «NUEVO»)
//   nav: false la deja fuera de las pestañas (Feedback va como botón fijo en la barra)
const SITE_SECTIONS = [
  { href: "safari.html", label: "Safari", badge: "NUEVO", ready: true, icon: "items/safari-ball", color: "#43db95", description: "Mapa interactivo con zoom: zonas, spawn, taxis, Poképaradas y entrenadores." },
  { href: "index.html", label: "Inicio" },
  { href: "pokedex.html", label: "Pokédex", ready: true, icon: "items/poke-ball", color: "#ff5a5a", description: "Pokémon, formas regionales y fusiones con stats, hábitat, movimientos y captura." },
  { href: "dexrewards.html", label: "DexRewards", ready: true, icon: "items/coupon-1", color: "#5ee1ff", description: "Premios por completar la Pokédex general y la de cada generación." },
  { href: "gimnasios.html", label: "Gimnasios", ready: true, icon: "badges/1", color: "#ffd442", description: "Líderes, Alto Mando, Campeones y level caps de cada región." },
  { href: "kits.html", label: "Kits", ready: true, icon: "items/premier-ball", color: "#e8ecf4", description: "Kits de rango y exclusivos: qué trae cada uno, ventajas y precio." },
  { href: "misiones.html", label: "Misiones", icon: "items/town-map", color: "#9ce35a", description: "Misiones del servidor, requisitos y recompensas." },
  { href: "fosiles.html", label: "Fósiles", ready: true, icon: "items/old-amber", color: "#c9a26b", description: "Los 7 fósiles revivibles, los 23 yacimientos y la Máquina Restauradora." },
  { href: "entrenamiento-ev.html", label: "Entrenamiento EV", ready: true, icon: "items/power-bracer", color: "#ff8a3d", description: "Piezas recias, vitaminas, combates 3v3, los mejores Pokémon para cada stat y los EVs de todos." },
  { href: "crianza.html", label: "Crianza", ready: true, icon: "items/oval-charm", color: "#ff6fb1", description: "Planificador de cadena de crianza: 4, 5 o 6 IVs con breeders fáciles y costes." },
  { href: "monturas.html", label: "Monturas", ready: true, icon: "items/air-balloon", color: "#4bb6ff", description: "54 Pokémon montables por tierra, agua y aire, con las mejores recomendaciones." },
  { href: "tesoros.html", label: "Tesoros", icon: "items/big-nugget", color: "#ffd442", description: "Tesoros escondidos, dónde buscarlos y qué guardan." },
  { href: "trabajo.html", label: "Trabajos", icon: "items/amulet-coin", color: "#ffa64d", description: "Oficios, pagos por acción y niveles de cada trabajo." },
  { href: "torre-batalla.html", label: "Torre Batalla", icon: "items/muscle-band", color: "#b38cff", description: "Formato, rangos y premios de la Torre Batalla." },
  { href: "pesca.html", label: "Pesca", icon: "items/super-rod", color: "#4bb6ff", description: "Cañas, cebos y qué se pesca en cada agua." },
  { href: "feedback.html", label: "Feedback", nav: false, ready: true, icon: "items/poke-ball", color: "#ffd442", description: "Envía ideas, errores o datos que falten en la wiki." },
];

(function renderSiteNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  const link = ({ href, label, badge }) => `<a href="${href}"${href === current ? ' class="active" aria-current="page"' : ""}>${label}${badge ? `<span class="nav-badge">${badge}</span>` : ""}</a>`;

  document.querySelectorAll("[data-site-nav]").forEach((nav, index) => {
    const menuId = `nav-more-menu-${index}`;
    const tabs = SITE_SECTIONS.filter((section) => section.nav !== false);
    nav.innerHTML = `${tabs.map(link).join("")}
      <div class="nav-more">
        <button class="nav-more-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="${menuId}">Más <i aria-hidden="true"></i></button>
        <div class="nav-more-menu" id="${menuId}" hidden>${tabs.map(link).join("")}</div>
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
    nav.classList.add("is-ready");
    window.addEventListener("resize", layout);
    document.fonts?.ready.then(layout);
  });
})();
