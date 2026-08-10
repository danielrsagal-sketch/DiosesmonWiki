# DiosesWiki

## Visión general

DiosesWiki es una wiki web estática diseñada para el servidor de Minecraft DiosesMon. Su propósito es ofrecer una guía rápida y visual sobre los Pokémon del servidor, incluyendo datos de aparición, estadísticas, rarezas, biomas, métodos de captura y detalles adicionales útiles para los jugadores.

## Cómo luciría el proyecto terminado

La experiencia final se verá como una interfaz moderna, ligera y de alto contraste, con enfoque en la legibilidad de información técnica.

### Experiencia visual

- Tema oscuro por defecto para mejorar la lectura y la coherencia visual.
- Paleta de colores consistente con el estilo del servidor:
  - Amarillo para botones y elementos destacados.
  - Azul para enlaces e interacciones.
  - Verde para estados de éxito o indicadores positivos.
- Diseño limpio, con tarjetas bien estructuradas que muestran la información principal sin saturar la vista.

### Funcionalidades visibles

- Barra de búsqueda rápida para encontrar criaturas por nombre o ID.
- Filtros avanzados para refinar resultados por generación, tipo, rareza, bioma y método de captura.
- Tarjetas interactivas que pueden expandirse para mostrar detalles más profundos.
- Sistema de favoritos persistente en el navegador para guardar criaturas de interés.
- Carga rápida y navegación fluida, sin depender de una base de datos externa.

## Arquitectura general

- El proyecto se basa en archivos estáticos y un archivo JSON maestro generado desde datos locales.
- El frontend consume este archivo mediante JavaScript y renderiza la interfaz directamente en el navegador.
- La actualización del contenido no requiere cambios en el código frontend, solo regenerar el archivo de datos.

## Estructura conceptual del proyecto

- data/: archivos JSON generados y fuente de información.
- scripts/: herramientas para procesar y transformar datos.
- src/: lógica frontend, renderizado y manejo de filtros.
- assets/: estilos, imágenes y recursos visuales.
- index.html: punto de entrada principal de la wiki.

## Resultado esperado

El proyecto terminado debería sentirse como una wiki útil, profesional y fácil de mantener, pensada para ser consultada en segundos por jugadores que necesitan información precisa sobre la progresión y captura de criaturas en DiosesMon.
