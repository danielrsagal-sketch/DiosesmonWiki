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
    title: "Shiny Safari Day (ampliado)",
    text: "¡Se amplía hasta el domingo! <strong>+25 % de probabilidad shiny</strong> en la Zona Safari: de 1/8192 pasa a <strong>1/6554</strong> sin otros boosts. Se suma al bonus de tu armadura y al del ticket premium.",
    image: "assets/img/informacion/safari-shiny-activo.webp",
    link: ["Calcula tu probabilidad", "safari.html#sf-info-title"],
    start: "2026-10-16T06:00:00-03:00",
    // Anunciado para el domingo 18 a las 11:00 de España (UTC+2 en octubre).
    end: "2026-10-18T11:00:00+02:00",
  },
  {
    id: "shiny-exploracion",
    tag: "evento",
    title: "Más shiny en los mundos de exploración",
    text: "Aumenta la aparición de <strong>Pokémon shiny en los mundos de exploración</strong>, no solo en el Safari. Entra con el reinicio diario del sábado: más oportunidades de encontrar ese shiny que llevas tiempo buscando.",
    image: "assets/img/informacion/shiny-exploracion.webp",
    // Reinicio diario de las 11:00 de España (UTC+2 en octubre). Sin fecha de fin anunciada.
    start: "2026-10-17T11:00:00+02:00",
    newDays: 3,
  },
  {
    id: "quiz-pokemon",
    tag: "evento",
    title: "Quiz Pokémon de la comunidad",
    text: "Un quiz Pokémon para toda la comunidad: ronda tras ronda se van eliminando participantes, y quienes lleguen hasta el final se llevan <strong>llaves de legendarios</strong>. ¿Cuánto sabes de Pokémon?",
    image: "assets/img/informacion/quiz-pokemon.webp",
    // Sábado a la hora habitual de los eventos: 11:00 de España (UTC+2 en octubre). Sin hora de fin anunciada:
    // el cartel se quita solo con el siguiente reinicio diario.
    start: "2026-10-17T11:00:00+02:00",
    end: "2026-10-18T11:00:00+02:00",
    link: ["Tesoros: llaves de legendarios", "tesoros.html#legendario"],
  },
  {
    id: "pokemon-day-beldum",
    tag: "evento",
    title: "Pokémon Day: Beldum",
    text: "Empieza justo cuando termina el Shiny Safari Day. Durante <strong>24 horas</strong>, Beldum es el protagonista del servidor. ¡Aprovecha para conseguir el tuyo!",
    image: "assets/img/informacion/pokemon-day-beldum.webp?v=2",
    start: "2026-10-18T11:00:00+02:00",
    end: "2026-10-19T11:00:00+02:00",
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
