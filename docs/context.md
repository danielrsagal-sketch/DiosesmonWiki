# Contexto para continuar Wiki-Diosesmon

## Objetivo

Convertir Wiki-Diosesmon en una Pokédex unificada para el servidor Diosesmon. La visión acordada combina:

- Los 1025 números nacionales, mostrando #001–#493 como disponibles y #494–#1025 con candado.
- Las 11 fusiones Diosesmon dentro del mismo índice, con filtro de tipo de registro.
- Un botón de ojo para marcar **Visto** y una Poké Ball para **Capturado**. Capturar activa también Visto. El progreso de fusiones usa claves propias.
- Fichas navegables de Pokémon y fusiones, con URL/hash compartible.
- Diseño inspirado en las referencias de DiosesmonDex y CobbleDex: cabecera roja, fondo oscuro, tarjetas densas, controles compactos e iconos de ojo/Poké Ball.
- Investigar modelos Cobblemon públicos compatibles con web y uso autorizado. Mientras no haya geometría/modelos utilizables, mostrar sprites y PNG existentes.

El usuario pidió iniciar la implementación y después pidió este documento para que otros modelos puedan continuar. No se ha pedido parar el trabajo, pero este archivo sirve como handoff si se cambia de agente.

## Estado Actual

La portada de Wiki-Diosesmon está en `index.html`. La nueva Pokédex está en `pokedex.html`, con lógica en `pokedex-app.js`, estilos aislados en `pokedex-styles.css`, datos nacionales generados en `pokemon-data.js` y fusiones en `fusion-data.js`.

`checkdex.html` y `fusiondex.html` tienen redirecciones JavaScript hacia la Pokédex unificada:

- `checkdex.html` abre `pokedex.html?kind=pokemon`.
- `fusiondex.html` abre `pokedex.html?kind=fusion`; los hashes legacy de fusión se convierten a `#fusion/<id>`.

La copia original de CheckDex en `c:\Users\danie\Downloads\checkdex` no se ha modificado.

El script Python `build_pokemon_data.py` descarga las tablas CSV actuales del repositorio oficial `PokeAPI/pokeapi` y genera 1025 especies con nombres, género, tipos, seis estadísticas, habilidades españolas, ID nacional, generación, altura/peso y sprite. También genera un diccionario de nombres de movimientos en español. El resultado comprobado es 493 habilitados y 532 bloqueados.

Las fichas de especies cargan descripción, experiencia, evoluciones y movimientos desde PokéAPI REST al abrir la ficha. Si esa consulta falla, muestran un detalle reducido con datos base locales y un enlace a la ficha/spawns de DiosesmonDex. Las fichas de fusiones usan las estadísticas, Shiny, movimientos y PNG locales del Excel/generador existente.

## Identidad y Progreso

- Pokémon: `pokemon:<nationalId>`, por ejemplo `pokemon:1`.
- Fusiones: `fusion:<fusionNumber>`, por ejemplo `fusion:9001`.
- Rutas de detalle: `#pokemon/1`, `#fusion/9001`.
- Estado nuevo en `localStorage` bajo `wiki-diosesmon-pokedex-state-v1`.
- Migración de progreso legacy desde `checkdex-caught-<region>`, traduciendo la posición regional al número nacional. Las capturas anteriores pasan a Visto y Capturado; las claves antiguas no se borran.
- Marcado de estados y persistencia se probaron en Pokémon y fusión. Durante la prueba se guardó/restauró el almacenamiento previo.
- La migración solo puede leer claves legacy del mismo origen del navegador. Datos guardados en `file://` o en otro host/puerto no son accesibles por seguridad del navegador.

## Datos y Assets

### Pokémon base

- Fuente del dataset local: `https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/`.
- El endpoint REST `https://pokeapi.co/api/v2/` funciona en el navegador de prueba para Bulbasaur, pero la llamada directa desde el Python local devolvió 403. El CSV de GitHub sí respondió y generó los 1025 registros.
- Sprites actuales: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`.

### Fusiones

- Fuente: `FUSIONES DIOSESMON.xlsx` y `Fusionespng/`.
- `build_data.py` genera `fusion-data.js`; no editar `fusion-data.js` manualmente.
- Hay 11 PNG y ningún archivo 3D/modelo local.
- IDs de fusiones #9001–#9012 según el Excel, con saltos propios de la tabla. Gentoise tiene un alias de hoja `Genstoise`.

### Spawns

DiosesmonDex declara 493 especies disponibles y sus fichas públicas muestran tipos, estadísticas, evoluciones, habilidades, movimientos, altura/peso y spawns por bioma/nivel/método. No se encontró una API pública documentada ni se confirmó permiso para importar esos datos. La ficha nueva enlaza a `https://diosesmondex.onrender.com/pokemon/<id>` en vez de copiar spawns.

### Modelos 3D

No se han integrado modelos 3D. Las imágenes locales son PNG rasterizados y no contienen geometría editable. La inspección de las rutas supuestas del repositorio `Cobblemon/Cobblemon` devolvió 404; la página de la organización Cobblemon que se pudo leer solo mostró repos públicos de Pokémon Showdown, no una fuente pública obvia de modelos del juego. No extraer assets de webs ajenas ni prometer soporte 3D hasta confirmar formato, disponibilidad y licencia. Mantener sprites/PNG como fallback.

## Diseño y Navegación

- La nueva Pokédex implementa la dirección roja/oscura, cuadrícula de tarjetas, filtros laterales, ojos/Poké Ball y fichas detalladas.
- `wiki-nav.css` mantiene el estilo de la portada; `pokedex-styles.css` es independiente para la página nueva.
- CheckDex y FusionDex antiguas son alias, no páginas de trabajo activas.
- Se añadieron versionadores de caché en `pokedex.html`: `pokemon-data.js?v=2` y `pokedex-app.js?v=3`. Si vuelve a aparecer lógica antigua en el navegador, subir esos valores.

## Verificaciones Ya Hechas

- `python build_pokemon_data.py` generó 1025 especies: 493 habilitadas, 532 bloqueadas.
- `node --check pokedex-app.js`, `node --check app.js` y `node --check checkdex-app.js` pasaron en ejecuciones anteriores.
- Diagnósticos de `pokedex.html`, `pokedex-app.js` y `pokedex-styles.css` no reportaron errores en ejecuciones anteriores.
- En navegador: 1036 tarjetas (1025 Pokémon + 11 fusiones), 532 bloqueadas, filtros por nombre/tipo/fuente funcionando.
- Detalle `#pokemon/1`: Bulbasaur con descripción, stats, habilidades españolas, familia evolutiva y movimientos por nivel/MT.
- Detalle `#fusion/9001`: Laprasian con stats, Shiny y learnset.
- Los alias legacy abren el filtro Pokémon/Fusiones; el slug antiguo `#laprasian` abre `#fusion/9001`.
- `#pokemon/1025` queda bloqueado y no abre detalle.
- A 390 px la Pokédex no tiene desbordamiento horizontal.
- El progreso inicial migrado en este entorno fue 1 visto / 1 capturado.

## Actualización 2026-10-08: ficha emergente con datos de Cobblemon

- Se quitó "Fusiones" de la barra superior (`pokedex.html` e `index.html`); las fusiones siguen en el filtro de la Pokédex y en la tarjeta de la portada.
- Iconos de ojo/Poké Ball de las tarjetas centrados (`.card-action` tenía el padding por defecto del navegador).
- El detalle ya no se renderiza bajo el catálogo: es una ventana emergente (`#detail-modal`) con Esc, clic en el fondo y botón ×. Abrir desde tarjeta hace `pushState`; cerrar vuelve atrás. `#pokemon/<id>` y `#fusion/<id>` siguen siendo enlaces compartibles.
- Imagen en la esquina superior izquierda (200 px), datos a su derecha.
- `build_cobblemon_data.py` genera `pokemon-details.js` (≈900 KB, carga diferida al abrir la primera ficha) desde **Cobblemon 1.7.3** (el servidor es anterior a 1.8): stats, habilidades, grupos huevo/ciclos/género, montura, drops, movimientos (nivel, MT, huevo, tutor; sin `legacy`) y spawns. Descripción española de PokéAPI ya incluida localmente (no hay llamadas REST).
- Montura: solo cuenta `riding.behaviours`; el formato antiguo `riding.behaviour` no es montable en el juego. Crobat/Skarmory/Milotic aparecen en la wiki pero son de 1.8.
- Hábitat: etiquetas `#cobblemon:is_*` resueltas con vanilla 1.21.1 (misode/mcmeta), etiquetas `c:` de Fabric 1.21.1 y Terralith 2.6.2 (Modrinth); nombres con las traducciones oficiales es_es de Minecraft y Terralith. Se descartan biomas/estructuras/bloques de mods ausentes (Aether, Bumblezone, BoP, Create...). Nombres españoles de etiquetas en `TAG_NAMES`.
- Descargas cacheadas en `build-cache/` (no publicar). Regenerar: `python build_cobblemon_data.py`.
- Drops nerfeados del servidor: `drop-overrides.js`, editable a mano (clave = identificador inglés). Ahora: Snorlax/Munchlax sin Restos. Se muestran tachados.
- Pendiente de decisión del usuario: extras de Cobbledex (requisitos de evolución, EV, ratio de captura, amistad, grupo de experiencia, megas/formas regionales, stats de montura, comportamiento).

## Pendientes Importantes

1. ~~**Prioridad UX:**~~ (resuelto con la ventana emergente) el detalle de un registro se renderiza actualmente después de todo el catálogo de 1036 tarjetas y `closeDetail()` hace scroll al catálogo incluso en carga inicial sin hash. Cambiar a una vista de detalle enfocada: ocultar temporalmente catálogo/filtros/resumen mientras haya `#pokemon/...` o `#fusion/...`, mantener la cabecera, y volver al catálogo con hash `#catalog`/Atrás. Esto hace que clicar una tarjeta realmente “abra la página” en vez de dejar el detalle bajo una cuadrícula enorme.
2. Revisar la sección “Familia evolutiva”: ahora contiene los otros miembros de la cadena; confirmar si se quiere distinguir pre-evoluciones y evoluciones futuras.
3. Las fusiones actualmente muestran sus PNG 2D. Investigar modelos GLB/glTF o fuente del resource pack del servidor; no usar Three.js hasta disponer de geometría/texturas y permiso claros.
4. Verificar que se quieran los nueve rangos nacionales consecutivos tal como CheckDex, aunque Diosesmon actualmente solo habilite #001–#493.
5. Confirmar si se dispone de fuente/API/archivo autorizado para spawns Diosesmon; si no, dejar el enlace externo en la ficha.
6. Considerar convertir las redirecciones alias actuales en fallback HTML accesible sin JavaScript.
7. Mantener sincronizadas las versiones de caché (`pokemon-data.js?v=...`, `pokedex-app.js?v=...`) al cambiar esos assets.

## Comandos

Desde `c:\Users\danie\Documents\fusionwiki`:

```powershell
python build_pokemon_data.py
python build_data.py
python -m http.server 8000
```

Abrir `http://localhost:8000/` para la portada y `http://localhost:8000/pokedex.html` para la nueva Pokédex. El puerto 8000 puede estar ya ocupado por una instancia anterior; si lo está, usar otro puerto o la instancia existente.
