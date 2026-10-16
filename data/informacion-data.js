// Información del servidor en Inicio: eventos y novedades con cuenta atrás.
// Para añadir una, copia un bloque y cámbialo:
//   id: identificador corto sin espacios
//   tag: "evento" (dura un tiempo) · "novedad" (algo que llega al servidor y se queda)
//   title / text: título y descripción (el texto admite HTML sencillo: <strong>, <a href="…">)
//   image: ruta de la imagen (guárdala en assets/img/informacion/)
//   start: cuándo empieza, con la hora de Chile y su desfase: "AAAA-MM-DDTHH:MM:00-03:00"
//   end: cuándo termina (solo eventos). Al pasar esa fecha la tarjeta desaparece sola.
//   newDays: cuántos días se marca como NUEVO después de empezar (por defecto 14)
//   link: botón opcional ["Texto", "pagina.html"]
// Cada jugador ve las horas convertidas a su zona horaria.
window.DIOSESMON_INFORMACION = [
  {
    id: "safari-shiny",
    tag: "evento",
    title: "Más shiny en el Safari",
    text: "<strong>+25 % de probabilidad shiny</strong> en la Zona Safari: de 1/8192 pasa a <strong>1/6554</strong> sin otros boosts. Se suma al bonus de tu armadura y al del ticket premium.",
    image: "assets/img/informacion/safari-shiny-activo.webp",
    link: ["Calcula tu probabilidad", "safari.html#sf-info-title"],
    start: "2026-10-16T06:00:00-03:00",
    end: "2026-10-17T06:00:00-03:00",
  },
  {
    id: "pokemon-day-beldum",
    tag: "evento",
    title: "Pokémon Day: Beldum",
    text: "Durante <strong>24 horas</strong>, Beldum es el protagonista del servidor. ¡Aprovecha para conseguir el tuyo!",
    image: "assets/img/informacion/pokemon-day-beldum.webp?v=2",
    start: "2026-10-18T06:00:00-03:00",
    end: "2026-10-19T06:00:00-03:00",
    link: ["Beldum en la Pokédex", "pokedex.html#pokemon/374"],
  },
  {
    id: "5ta-generacion",
    tag: "novedad",
    title: "Llega la 5.ª generación",
    text: "Los Pokémon de <strong>Teselia</strong> llegan a Diosesmon: Snivy, Tepig, Oshawott, Reshiram, Zekrom y muchos más.",
    image: "assets/img/informacion/5ta-generacion.webp",
    start: "2026-10-23T06:00:00-03:00",
  },
];
