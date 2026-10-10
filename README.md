# DiosesmonWiki

Wiki comunitaria del servidor de Cobblemon **Diosesmon**: mapa interactivo de la Zona Safari, Pokédex con formas regionales y fusiones, DexRewards, Gimnasios y guías.

Es un sitio estático (HTML, CSS y JavaScript), sin servidor ni base de datos. El progreso de cada jugador (vistos, capturados, gimnasios vencidos) se guarda en su propio navegador.

## Estructura

```
/                     Páginas del sitio (index.html, pokedex.html, gimnasios.html…)
assets/
  css/                Estilos (topbar.css es la barra común; site-base.css la base común)
  js/                 Lógica de cada página (site-nav.js define las pestañas del sitio)
  img/                Logos, favicons, fusiones y teselas del mapa Safari (img/safari/)
data/                 Datos que usan las páginas
  dexrewards-data.js    Hitos y recompensas de /dexrewards        ← editar a mano
  gimnasios-data.js     Líderes, recompensas, equipos y level caps ← editar a mano
  drop-overrides.js     Drops desactivados en el servidor         ← editar a mano
  safari-data.js        Zonas y puntos del mapa de la Zona Safari ← editar a mano
  pokemon-data.js       Generado por tools/build_pokemon_data.py
  pokemon-details.js    Generado por tools/build_cobblemon_data.py
  pokemon-catalog-extra.js  Generado por tools/build_cobblemon_data.py
  fusion-data.js        Generado por tools/build_fusion_data.py
  fosiles-data.js, monturas-data.js  Generados por tools/build_fosiles_monturas.py
  entrenamiento-data.js Generado por tools/build_ev_data.py
  crianza-data.js       Generado por tools/build_crianza_data.py
  kits-data.js          Generado por tools/build_kits_data.py (desde extra/, no publicado)
tools/                Scripts que generan los datos (no forman parte de la web)
  source/               Excel de fusiones, logos originales y mapa original de la Zona Safari
  legacy/               Código antiguo de CheckDex/FusionDex (ya no se usa)
docs/                 Notas del proyecto
```

`checkdex.html` y `fusiondex.html` solo redirigen a la Pokédex para que los enlaces antiguos sigan funcionando.

## Mapa de la Zona Safari

`safari.html` muestra el mapa con zoom (Leaflet) en coordenadas de Minecraft: el centro es X 0 · Z 0 y cada píxel del zoom máximo es un bloque. Los puntos (Poképaradas, Taxis, Entrenadores…) se añaden en `data/safari-data.js`, una línea por punto. Para pasar un waypoint de Xaero's Minimap (`waypoint:Nombre:P:X:Y:Z:…`) se usan X, Y y Z en ese orden. En el propio mapa, al hacer clic en cualquier punto se pueden copiar sus coordenadas.

## Añadir o cambiar secciones

Las pestañas de la barra y las tarjetas de Inicio salen de la lista `SITE_SECTIONS` en `assets/js/site-nav.js`. Con `ready: true` la tarjeta de Inicio deja de mostrarse como «En construcción».

## Probar en local

Desde la carpeta del proyecto:

```
python -m http.server 8000
```

y abrir <http://localhost:8000>. Abrir los `.html` con doble clic (`file://`) no sirve: el formulario de Feedback y algunas cargas de datos necesitan un servidor.

## Regenerar los datos

Requiere Python 3. Los scripts descargan lo que necesitan la primera vez (en `tools/build-cache/`, que no se sube a GitHub).

```
python tools/build_pokemon_data.py     # especies, tipos, stats (PokéAPI)
python tools/build_cobblemon_data.py   # fichas, formas, evoluciones, biomas (Cobblemon 1.7.3 + Terralith)
python tools/build_fusion_data.py      # fusiones desde tools/source/FUSIONES DIOSESMON.xlsx
python tools/build_safari_tiles.py     # teselas con zoom del mapa desde tools/source/ZonaSafari/
python tools/build_fosiles_monturas.py # fósiles, yacimientos y monturas (Cobblemon 1.7.3)
python tools/build_ev_data.py          # EVs y spawns para Entrenamiento EV
python tools/build_crianza_data.py     # grupos huevo y géneros para Crianza (después de build_ev_data)
python tools/build_kits_data.py        # kits desde las capturas de extra/PaginaDioses/DiosesmonKits
```

Al cambiar un archivo de `assets/` o `data/`, sube su número de versión (`?v=N`) en las páginas que lo cargan para que los navegadores no usen la copia antigua.

## Publicar con GitHub Pages

1. Crea un repositorio en GitHub y sube esta carpeta (la raíz del repositorio debe ser la que contiene `index.html`).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En uno o dos minutos la wiki queda en `https://<usuario>.github.io/<repositorio>/`.

Para usar un dominio propio (por ejemplo un subdominio de diosesmon.net), escríbelo en **Settings → Pages → Custom domain** y crea en el DNS un registro `CNAME` que apunte a `<usuario>.github.io`.

El formulario de Feedback usa [FormSubmit](https://formsubmit.co): al publicarlo en el dominio definitivo puede pedir una nueva activación por correo.

## Créditos

Datos de [Cobblemon](https://gitlab.com/cable-mc/cobblemon), [PokéAPI](https://pokeapi.co), Minecraft y [Terralith](https://modrinth.com/datapack/terralith). Sprites de PokéAPI y Pokémon Showdown.
No afiliado con Mojang, Microsoft, Nintendo, Game Freak ni The Pokémon Company.
