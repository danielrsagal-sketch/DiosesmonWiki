"""Genera data/pokemon-details.js con datos de Cobblemon 1.7.3 para la ficha emergente.

Fuentes (se descargan una vez en tools/build-cache/):
- Cobblemon 1.7.3 (GitLab oficial): especies, movimientos, grupos huevo, drops,
  montura y spawns. El servidor usa Cobblemon anterior a 1.8.
- Minecraft 1.21.1 (misode/mcmeta) y Fabric 1.21.1: etiquetas de bioma vanilla y c:.
- Terralith 2.6.2 para 1.21.x (Modrinth): biomas, etiquetas y traducción es_es.
- PokéAPI CSV: nombres españoles de movimientos/habilidades y descripción.

El servidor solo tiene biomas vanilla y Terralith; los spawns que dependen de
otros mods (Aether, Bumblezone, BoP...) se descartan.
"""

import csv
import io
import json
import re
import tarfile
import urllib.request
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / "build-cache"
OUTPUT = ROOT / "data" / "pokemon-details.js"
CATALOG_OUTPUT = ROOT / "data" / "pokemon-catalog-extra.js"
AVAILABLE_THROUGH = 493
MAX_NATIONAL_ID = 1025
SPANISH_LANGUAGE_ID = "7"
POKEAPI_CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"
SOURCES = {
    "cobblemon-1.7.3-data.tar.gz": "https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository/archive.tar.gz?sha=1.7.3&path=common/src/main/resources/data/cobblemon",
    "cobblemon-1.7.3-es_es.json": "https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository/files/common%2Fsrc%2Fmain%2Fresources%2Fassets%2Fcobblemon%2Flang%2Fes_es.json/raw?ref=1.7.3",
    "mcmeta-1.21.1-data.tar.gz": "https://codeload.github.com/misode/mcmeta/tar.gz/refs/tags/1.21.1-data",
    "fabric-1.21.1.tar.gz": "https://codeload.github.com/FabricMC/fabric/tar.gz/refs/heads/1.21.1",
    "minecraft-1.21.1-es_es.json": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.1/assets/minecraft/lang/es_es.json",
    "terralith-1.21.x-2.6.2.jar": "https://cdn.modrinth.com/data/8oi3bsk5/versions/eWDLFabb/Terralith_1.21.x_v2.6.2.jar",
}

TAG_NAMES = {
    "cobblemon:is_overworld": "Superficie",
    "cobblemon:is_ocean": "Océano",
    "cobblemon:is_jungle": "Jungla",
    "cobblemon:is_swamp": "Pantano",
    "cobblemon:is_freshwater": "Agua dulce",
    "cobblemon:is_forest": "Bosque",
    "cobblemon:is_coast": "Costa",
    "cobblemon:is_tropical_island": "Isla tropical",
    "cobblemon:is_hills": "Colinas",
    "cobblemon:is_temperate": "Templado",
    "cobblemon:is_taiga": "Taiga",
    "cobblemon:is_arid": "Árido",
    "cobblemon:is_mountain": "Montaña",
    "cobblemon:is_magical": "Mágico",
    "cobblemon:is_frozen_ocean": "Océano helado",
    "cobblemon:is_lush": "Frondoso",
    "cobblemon:is_badlands": "Tierras baldías",
    "cobblemon:is_savanna": "Sabana",
    "cobblemon:is_sky": "Cielo",
    "cobblemon:is_warm_ocean": "Océano cálido",
    "cobblemon:is_grassland": "Pradera",
    "cobblemon:is_floral": "Floral",
    "cobblemon:is_mushroom": "Champiñones",
    "cobblemon:is_spooky": "Tenebroso",
    "cobblemon:is_cold_ocean": "Océano frío",
    "cobblemon:is_snowy_forest": "Bosque nevado",
    "cobblemon:is_plains": "Llanuras",
    "cobblemon:is_tundra": "Tundra",
    "cobblemon:is_desert": "Desierto",
    "cobblemon:is_beach": "Playa",
    "cobblemon:is_end": "El End",
    "cobblemon:is_freezing": "Gélido",
    "cobblemon:is_bamboo": "Bambú",
    "cobblemon:is_volcanic": "Volcánico",
    "cobblemon:is_dripstone": "Cuevas kársticas",
    "cobblemon:is_river": "Río",
    "cobblemon:is_lukewarm_ocean": "Océano tibio",
    "cobblemon:is_temperate_ocean": "Océano templado",
    "cobblemon:is_deep_ocean": "Océano profundo",
    "cobblemon:is_deep_dark": "Oscuridad profunda",
    "cobblemon:is_island": "Isla",
    "cobblemon:is_peak": "Cumbres",
    "cobblemon:is_glacial": "Glaciar",
    "cobblemon:is_thermal": "Termal",
    "cobblemon:is_snowy_taiga": "Taiga nevada",
    "cobblemon:is_snowy": "Nevado",
    "cobblemon:is_cherry_blossom": "Cerezal",
    "cobblemon:is_highlands": "Tierras altas",
    "cobblemon:is_cold": "Frío",
    "cobblemon:is_plateau": "Meseta",
    "cobblemon:is_shrubland": "Matorral",
    "cobblemon:is_sandy": "Arenoso",
    "cobblemon:is_cave": "Cueva",
    "cobblemon:is_mirage_island": "Isla espejismo",
    "cobblemon:has_block/mud": "Con barro",
    "minecraft:is_nether": "Nether",
    "cobblemon:nether/is_forest": "Nether · Bosque",
    "cobblemon:nether/is_overgrowth": "Nether · Vegetación",
    "cobblemon:nether/is_basalt": "Nether · Basalto",
    "cobblemon:nether/is_fungus": "Nether · Hongos",
    "cobblemon:nether/is_wasteland": "Nether · Desiertos",
    "cobblemon:nether/is_frozen": "Nether · Helado",
    "cobblemon:nether/is_crimson": "Nether · Carmesí",
    "cobblemon:nether/is_desert": "Nether · Arena",
    "cobblemon:nether/is_quartz": "Nether · Cuarzo",
    "cobblemon:nether/is_warped": "Nether · Distorsionado",
    "cobblemon:nether/is_toxic": "Nether · Tóxico",
    "cobblemon:nether/is_mountain": "Nether · Montaña",
    "cobblemon:nether/is_soul_sand": "Nether · Arena de almas",
    "cobblemon:nether/is_soul_fire": "Nether · Fuego de almas",
}
BUCKETS = {"common": "Común", "uncommon": "Poco común", "rare": "Raro", "ultra-rare": "Ultra raro"}
POSITIONS = {"grounded": "Suelo", "fishing": "Pesca", "submerged": "Bajo el agua", "surface": "Superficie del agua", "seafloor": "Fondo marino"}
TIMES = {"day": "De día", "night": "De noche", "dusk": "Atardecer", "dawn": "Amanecer", "morning": "Mañana", "noon": "Mediodía", "twilight": "Crepúsculo", "midnight": "Medianoche"}
PRESETS = {
    "treetop": "Copas de árboles", "urban": "Zonas urbanas", "mansion": "Mansión del bosque",
    "mansion_dining": "Mansión (comedor)", "mansion_bedrooms": "Mansión (dormitorios)",
    "trail_ruins": "Ruinas de senderos", "derelict": "Estructuras abandonadas",
    "jungle_pyramid": "Templo de la jungla", "desert_pyramid": "Templo del desierto",
    "ocean_ruins": "Ruinas oceánicas", "nether_structures": "Estructuras del Nether",
    "foliage": "Entre follaje", "illager_structures": "Estructuras illager", "redstone": "Cerca de redstone",
    "ocean_monument": "Monumento oceánico", "ruined_portal": "Portal en ruinas", "webs": "Cerca de telaraña",
    "lava": "En lava", "pillager_outpost": "Puesto de saqueadores", "end_city": "Ciudad del End",
    "ancient_city": "Ciudad antigua", "stronghold": "Fortaleza", "salt": "Cerca de sal",
    "nether_fossil": "Fósil del Nether",
}
RIDE_ENVIRONMENTS = {"LAND": "Tierra", "LIQUID": "Agua", "AIR": "Aire"}
RIDE_STYLES = {
    "horse": "Estándar", "bird": "Pájaro", "jet": "Jet", "hover": "Flotante", "rocket": "Cohete",
    "dolphin": "Delfín", "submarine": "Submarino", "boat": "Barca",
}
# Etiquetas de bloques/estructuras usadas en condiciones de spawn.
CONDITION_NAMES = {
    "#minecraft:village": "Aldea", "#cobblemon:ruin": "Ruinas", "#cobblemon:ruins/arch": "Arco en ruinas",
    "#cobblemon:shipwreck_cove": "Cala de naufragio",
    "cobblemon:shipwreck_coves/submerged_shipwreck_cove": "Cala de naufragio sumergida",
    "cobblemon:shipwreck_coves/lush_shipwreck_cove": "Cala de naufragio frondosa",
    "cobblemon:ruins/luna_henge_ruins": "Ruinas del círculo lunar",
    "cobblemon:ruins/sol_henge_ruins": "Ruinas del círculo solar",
    "cobblemon:ruins/stonjourner_henge_ruins": "Ruinas del círculo de Stonjourner",
    "minecraft:monument": "Monumento oceánico", "minecraft:pillager_outpost": "Puesto de saqueadores",
    "minecraft:mansion": "Mansión del bosque", "minecraft:lightning_rod": "pararrayos", "minecraft:swamp_hut": "Cabaña de bruja",
    "#minecraft:shipwreck": "Barco naufragado", "minecraft:igloo": "Iglú", "minecraft:desert_well": "Pozo del desierto",
    "#cobblemon:flowers": "flores", "#cobblemon:saccharine_trees": "árboles de sacarino",
    "#cobblemon:white_flowers": "flores blancas", "#cobblemon:red_flowers": "flores rojas",
    "#cobblemon:yellow_flowers": "flores amarillas", "#cobblemon:orange_flowers": "flores naranjas",
    "#cobblemon:blue_flowers": "flores azules", "#cobblemon:pink_flowers": "flores rosas",
    "#cobblemon:dead_coral": "coral muerto", "#cobblemon:gemstones": "gemas", "#cobblemon:apricorns": "bonguris",
    "#cobblemon:berries": "bayas", "#minecraft:iron_ores": "menas de hierro", "#minecraft:coal_ores": "menas de carbón",
    "#minecraft:redstone_ores": "menas de redstone", "#c:redstone_ores": "menas de redstone",
    "#minecraft:diamond_ores": "menas de diamante", "#minecraft:corals": "corales", "#minecraft:coral_blocks": "bloques de coral",
}
SERVER_NAMESPACES = ("minecraft", "cobblemon", "c", "terralith")
ITEM_ALIASES = {"minecraft:eye_of_ender": "minecraft:ender_eye"}
ITEM_NAMES = {"cobblemon:sacred_ash": "Ceniza Sagrada"}
MOVE_ALIASES = {"visegrip": "vicegrip"}
REGIONAL_ASPECTS = {"alolan", "galarian", "hisuian", "paldean"}
FORM_LABELS = {
    "alola": "Alola", "galar": "Galar", "hisui": "Hisui", "paldea": "Paldea",
    "paldea-combat": "Paldea (Combatiente)", "paldea-blaze": "Paldea (Ardiente)", "paldea-aqua": "Paldea (Acuática)",
}
POKEAPI_FORM_SUFFIX = {"paldea-combat": "paldea-combat-breed", "paldea-blaze": "paldea-blaze-breed", "paldea-aqua": "paldea-aqua-breed"}
TYPE_NAMES = {
    "normal": "Normal", "fire": "Fuego", "water": "Agua", "grass": "Planta", "electric": "Eléctrico", "ice": "Hielo",
    "fighting": "Lucha", "poison": "Veneno", "ground": "Tierra", "flying": "Volador", "psychic": "Psíquico", "bug": "Bicho",
    "rock": "Roca", "ghost": "Fantasma", "dragon": "Dragón", "dark": "Siniestro", "steel": "Acero", "fairy": "Hada",
}
EXPERIENCE_GROUPS = {
    "erratic": "Errático", "fast": "Rápido", "medium_fast": "Medio", "medium_slow": "Parabólico",
    "slow": "Lento", "fluctuating": "Fluctuante",
}
STAT_NAMES = {"hp": "PS", "attack": "Ataque", "defence": "Defensa", "special_attack": "At. Esp.", "special_defence": "Def. Esp.", "speed": "Velocidad"}
MOON_PHASES = {
    "FULL_MOON": "Luna llena", "WANING_GIBBOUS": "Luna gibosa menguante", "THIRD_QUARTER": "Cuarto menguante",
    "WANING_CRESCENT": "Luna menguante", "NEW_MOON": "Luna nueva", "WAXING_CRESCENT": "Luna creciente",
    "FIRST_QUARTER": "Cuarto creciente", "WAXING_GIBBOUS": "Luna gibosa creciente",
}
BALLS = [
    "poke_ball", "great_ball", "ultra_ball", "master_ball", "premier_ball", "safari_ball", "sport_ball", "park_ball",
    "quick_ball", "timer_ball", "dusk_ball", "dive_ball", "net_ball", "nest_ball", "fast_ball", "heavy_ball",
    "level_ball", "love_ball", "lure_ball", "moon_ball", "repeat_ball", "dream_ball", "beast_ball",
    "friend_ball", "luxury_ball", "heal_ball", "cherish_ball",
    "citrine_ball", "verdant_ball", "azure_ball", "roseate_ball", "slate_ball",
]


def cached(filename):
    path = CACHE / filename
    if not path.exists():
        CACHE.mkdir(exist_ok=True)
        print(f"Descargando {filename}...")
        request = urllib.request.Request(SOURCES[filename], headers={"User-Agent": "WikiDiosesmon-Builder/1.0"})
        with urllib.request.urlopen(request, timeout=120) as response:
            path.write_bytes(response.read())
    return path


def pokeapi_csv(filename):
    path = CACHE / f"pokeapi-{filename}"
    if not path.exists():
        CACHE.mkdir(exist_ok=True)
        print(f"Descargando PokéAPI {filename}...")
        request = urllib.request.Request(POKEAPI_CSV + filename, headers={"User-Agent": "WikiDiosesmon-Builder/1.0"})
        with urllib.request.urlopen(request, timeout=120) as response:
            path.write_bytes(response.read())
    return list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8"))))


def read_json(raw):
    # Algunos JSON de Cobblemon traen comas finales.
    text = raw.decode("utf-8-sig") if isinstance(raw, bytes) else raw
    return json.loads(re.sub(r",(\s*[}\]])", r"\1", text))


def compact(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


class BiomeIndex:
    """Etiquetas de bioma combinadas de vanilla, c:, Cobblemon y Terralith."""

    def __init__(self):
        self.tags = {}
        self.biomes = {}

    def add_tag(self, tag_id, data):
        values = data.get("values", [])
        if data.get("replace"):
            self.tags[tag_id] = []
        self.tags.setdefault(tag_id, []).extend(values)

    def resolve(self, reference, seen=None):
        seen = seen or set()
        if not reference.startswith("#"):
            return {reference} if reference in self.biomes else set()
        tag_id = reference[1:]
        if tag_id in seen:
            return set()
        seen.add(tag_id)
        result = set()
        for value in self.tags.get(tag_id, []):
            entry = value["id"] if isinstance(value, dict) else value
            result |= self.resolve(entry, seen)
        return result


def tag_member(path, marker):
    match = re.search(r"data/([^/]+)/tags/worldgen/biome/(.+)\.json$", path)
    if match and marker in path:
        return f"{match.group(1)}:{match.group(2)}"
    return None


def load_biomes(mc_lang, terralith_lang):
    index = BiomeIndex()
    with tarfile.open(cached("mcmeta-1.21.1-data.tar.gz")) as archive:
        for member in archive.getmembers():
            if not member.isfile():
                continue
            if tag_id := tag_member(member.name, "/data/minecraft/tags/"):
                index.add_tag(tag_id, read_json(archive.extractfile(member).read()))
            elif match := re.search(r"/data/minecraft/worldgen/biome/(.+)\.json$", member.name):
                biome_id = f"minecraft:{match.group(1)}"
                index.biomes[biome_id] = {"name": mc_lang.get(f"biome.minecraft.{match.group(1)}", match.group(1)), "source": "vanilla"}
    with tarfile.open(cached("fabric-1.21.1.tar.gz")) as archive:
        for member in archive.getmembers():
            if member.isfile() and "fabric-convention-tags-v2/src/generated/resources/" in member.name:
                if tag_id := tag_member(member.name, "/data/c/tags/"):
                    index.add_tag(tag_id, read_json(archive.extractfile(member).read()))
    with zipfile.ZipFile(cached("terralith-1.21.x-2.6.2.jar")) as archive:
        for name in archive.namelist():
            if tag_id := tag_member(name, "data/"):
                index.add_tag(tag_id, read_json(archive.read(name)))
            elif match := re.match(r"data/terralith/worldgen/biome/(.+)\.json$", name):
                path = match.group(1)
                index.biomes[f"terralith:{path}"] = {
                    "name": terralith_lang.get(f"biome.terralith.{path.replace('/', '.')}", path),
                    "source": "terralith",
                }
    return index


def load_cobblemon():
    species, spawns = {}, []
    tags = []
    with tarfile.open(cached("cobblemon-1.7.3-data.tar.gz")) as archive:
        for member in archive.getmembers():
            if not member.isfile() or not member.name.endswith(".json"):
                continue
            name = member.name
            if "/data/cobblemon/species/" in name:
                data = read_json(archive.extractfile(member).read())
                species[Path(name).stem] = data
            elif "/data/cobblemon/spawn_pool_world/" in name:
                data = read_json(archive.extractfile(member).read())
                if data.get("enabled", True) and not data.get("neededInstalledMods"):
                    spawns.extend(data.get("spawns", []))
            elif tag_id := tag_member(name, "/data/cobblemon/tags/"):
                tags.append((tag_id, read_json(archive.extractfile(member).read())))
    return species, spawns, tags


def main():
    mc_lang = read_json(cached("minecraft-1.21.1-es_es.json").read_bytes())
    cobble_lang = read_json(cached("cobblemon-1.7.3-es_es.json").read_bytes())
    with zipfile.ZipFile(cached("terralith-1.21.x-2.6.2.jar")) as archive:
        terralith_lang = read_json(archive.read("assets/terralith/lang/es_es.json"))
    biomes = load_biomes(mc_lang, terralith_lang)
    species_files, spawn_entries, cobble_tags = load_cobblemon()
    for tag_id, data in cobble_tags:
        biomes.add_tag(tag_id, data)

    move_ids = {row["id"]: row["identifier"] for row in pokeapi_csv("moves.csv")}
    move_names = {
        compact(move_ids[row["move_id"]]): row["name"]
        for row in pokeapi_csv("move_names.csv")
        if row["local_language_id"] == SPANISH_LANGUAGE_ID and row["move_id"] in move_ids
    }
    ability_ids = {row["id"]: row["identifier"] for row in pokeapi_csv("abilities.csv")}
    ability_names = {
        compact(ability_ids[row["ability_id"]]): row["name"]
        for row in pokeapi_csv("ability_names.csv")
        if row["local_language_id"] == SPANISH_LANGUAGE_ID and row["ability_id"] in ability_ids
    }
    descriptions = {}
    for row in pokeapi_csv("pokemon_species_flavor_text.csv"):
        if row["language_id"] != SPANISH_LANGUAGE_ID:
            continue
        species_id = int(row["species_id"])
        version = int(row["version_id"])
        if species_id not in descriptions or version < descriptions[species_id][0]:
            descriptions[species_id] = (version, " ".join(row["flavor_text"].split()))

    def item_name(item_id):
        if item_id in ITEM_NAMES:
            return ITEM_NAMES[item_id]
        item_id = ITEM_ALIASES.get(item_id, item_id)
        namespace, _, path = item_id.partition(":")
        for prefix in ("item", "block"):
            key = f"{prefix}.{namespace}.{path}"
            if key in cobble_lang:
                return cobble_lang[key]
            if key in mc_lang:
                return mc_lang[key]
        return path.replace("_", " ").capitalize()

    def on_server(identifier):
        return identifier.lstrip("#").split(":")[0] in SERVER_NAMESPACES

    def block_label(block_id):
        if block_id in CONDITION_NAMES:
            return CONDITION_NAMES[block_id]
        if block_id.startswith("#"):
            return block_id[1:].split(":")[-1].split("/")[-1].replace("_", " ")
        return item_name(block_id).lower() if block_id.startswith("minecraft:") or block_id.startswith("cobblemon:") else block_id

    move_list, move_index = [], {}

    def move_ref(move_id):
        name = move_names.get(MOVE_ALIASES.get(compact(move_id), compact(move_id)), move_id)
        if name not in move_index:
            move_index[name] = len(move_list)
            move_list.append(name)
        return move_index[name]

    by_stem = {stem: data for stem, data in species_files.items()}
    national_by_stem = {stem: data["nationalPokedexNumber"] for stem, data in species_files.items()}
    species_names = {
        int(row["pokemon_species_id"]): row["name"]
        for row in pokeapi_csv("pokemon_species_names.csv")
        if row["local_language_id"] == SPANISH_LANGUAGE_ID
    }
    pokeapi_ids = {row["identifier"]: int(row["id"]) for row in pokeapi_csv("pokemon.csv")}
    default_identifier = {int(row["id"]): row["identifier"] for row in pokeapi_csv("pokemon_species.csv")}
    used_tags = {}

    def register_tag(reference):
        """Registra una etiqueta/bioma con biomas del servidor; devuelve su clave o None."""
        resolved = sorted(biomes.resolve(reference), key=lambda biome: biomes.biomes[biome]["name"])
        if not resolved:
            return None
        key = reference.lstrip("#")
        if key not in used_tags:
            label = TAG_NAMES.get(key) if reference.startswith("#") else biomes.biomes[reference]["name"]
            used_tags[key] = {"name": label or key.split(":")[-1].replace("is_", "").replace("_", " ").capitalize(), "biomes": resolved}
        return key

    def register_condition_tags(reference):
        """Las etiquetas de evolución regional se muestran como sus etiquetas hijas."""
        key = reference.lstrip("#")
        if reference.startswith("#") and key not in TAG_NAMES and "/regional/" in key:
            keys = []
            for value in biomes.tags.get(key, []):
                child = value["id"] if isinstance(value, dict) else value
                keys.extend(register_condition_tags(child))
            return keys
        registered = register_tag(reference)
        return [registered] if registered else []

    def regional_forms(data):
        return [
            form for form in data.get("forms", [])
            if not form.get("battleOnly") and REGIONAL_ASPECTS & set(form.get("aspects", []))
        ]

    def match_form(data, tokens):
        aspects = {token for token in tokens if "=" not in token}
        # Los Tauros de Paldea usan bull_breed=blaze/aqua en los spawns y blaze-breed/aqua-breed como aspecto.
        aspects |= {token.split("=")[1] + "-breed" for token in tokens if token.startswith("bull_breed=")}
        best = None
        for form in regional_forms(data):
            form_aspects = set(form.get("aspects", []))
            if form_aspects <= aspects and (best is None or len(form_aspects) > len(best.get("aspects", []))):
                best = form
        return best["name"].lower() if best else ""

    # Spawns: solo biomas que existen en el servidor (vanilla + Terralith).
    spawns_by_node = {}
    for entry in spawn_entries:
        if entry.get("type", "pokemon") != "pokemon" or not entry.get("pokemon"):
            continue
        tokens = entry["pokemon"].split()
        national_id = national_by_stem.get(tokens[0])
        if not national_id or national_id > AVAILABLE_THROUGH:
            continue
        condition = dict(entry.get("condition", {}))
        anticondition = dict(entry.get("anticondition", {}))
        groups = [key for key in map(register_tag, condition.get("biomes", [])) if key]
        if condition.get("biomes") and not groups:
            continue  # Solo aparece en biomas de mods que el servidor no tiene.
        nearby = [block for block in condition.get("neededNearbyBlocks", []) if on_server(block)]
        structures = [item for item in condition.get("structures", []) if on_server(item)]
        if (condition.get("neededNearbyBlocks") and not nearby) or (condition.get("structures") and not structures):
            continue  # Requiere bloques o estructuras de mods que el servidor no tiene.
        excluded = [key for key in map(register_tag, anticondition.get("biomes", [])) if key]
        notes = []
        if condition.get("timeRange"):
            notes.append(TIMES.get(condition["timeRange"], condition["timeRange"]))
        if "isRaining" in condition:
            notes.append("Con lluvia" if condition["isRaining"] else "Sin lluvia")
        if "isThundering" in condition:
            notes.append("Con tormenta" if condition["isThundering"] else "Sin tormenta")
        if condition.get("canSeeSky") is True:
            notes.append("A cielo abierto")
        elif condition.get("canSeeSky") is False:
            notes.append("Sin ver el cielo")
        if "minY" in condition and "maxY" in condition:
            notes.append(f"Altura Y {condition['minY']} a {condition['maxY']}")
        elif "minY" in condition:
            notes.append(f"Altura Y ≥ {condition['minY']}")
        elif "maxY" in condition:
            notes.append(f"Altura Y ≤ {condition['maxY']}")
        if condition.get("moonPhase") is not None:
            notes.append(f"Fase lunar {condition['moonPhase']}")
        if condition.get("isSlimeChunk"):
            notes.append("Chunk de slime")
        if condition.get("minLureLevel"):
            notes.append(f"Señuelo nivel {condition['minLureLevel']}+")
        if nearby and not any(p in ("urban", "redstone", "salt", "webs", "lava", "foliage") for p in entry.get("presets", [])):
            notes.append("Cerca de " + ", ".join(dict.fromkeys(block_label(block) for block in nearby)))
        if structures:
            notes.append("En " + ", ".join(dict.fromkeys(block_label(item) for item in structures)))
        preset_labels = [PRESETS[preset] for preset in entry.get("presets", []) if preset in PRESETS]
        notes = [note for note in notes if note.removeprefix("En ") not in preset_labels] + preset_labels
        form_key = match_form(by_stem[tokens[0]], tokens[1:])
        node = f"{national_id}-{form_key}" if form_key else str(national_id)
        spawns_by_node.setdefault(node, []).append({
            "bucket": BUCKETS.get(entry.get("bucket"), entry.get("bucket")),
            "rarity": entry.get("bucket"),
            "level": entry.get("level") or entry.get("levelRange") or "",
            "position": POSITIONS.get(entry.get("spawnablePositionType"), entry.get("spawnablePositionType")),
            "biomes": groups,
            "excluded": excluded,
            "notes": notes,
        })

    def parse_moves(raw_moves):
        moves = {"level": [], "tm": [], "egg": [], "tutor": []}
        seen_moves = set()
        for raw in raw_moves:
            method, _, move_id = raw.partition(":")
            if method.isdigit():
                key = ("level", int(method), move_id)
                if key not in seen_moves:
                    moves["level"].append([int(method), move_ref(move_id)])
            elif method in moves:
                key = (method, move_id)
                if key not in seen_moves:
                    moves[method].append(move_ref(move_id))
            else:
                continue
            seen_moves.add(key)
        moves["level"].sort(key=lambda move: move[0])
        for method in ("tm", "egg", "tutor"):
            moves[method].sort(key=lambda index: move_list[index])
        return moves

    def parse_riding(riding_data):
        behaviours = (riding_data or {}).get("behaviours")
        if not behaviours:
            return None
        order = ["LAND", "LIQUID", "AIR"]
        return {
            "seats": len(riding_data.get("seats", [])) or 1,
            "modes": [
                {
                    "environment": RIDE_ENVIRONMENTS.get(environment, environment),
                    "style": RIDE_STYLES.get(value.get("key", "").split("/")[-1], value.get("key", "")),
                }
                for environment, value in sorted(behaviours.items(), key=lambda item: order.index(item[0]) if item[0] in order else 9)
            ],
        }

    def parse_drops(drops):
        drops = drops or {}
        return {
            "rolls": drops.get("amount", 0),
            "entries": [
                {
                    "item": entry["item"],
                    "name": item_name(entry["item"]),
                    **({"chance": entry["percentage"]} if "percentage" in entry else {}),
                    **({"quantity": entry["quantityRange"]} if "quantityRange" in entry else {}),
                }
                for entry in drops.get("entries", [])
            ],
        }

    def build_entry(base, form=None):
        def pick(key, default=None):
            if form is not None and key in form:
                return form[key]
            return base.get(key, default)

        source = form if form is not None and "primaryType" in form else base
        types = [source["primaryType"]] + ([source["secondaryType"]] if source.get("secondaryType") else [])
        stats = pick("baseStats")
        national_id = base["nationalPokedexNumber"]
        description = descriptions.get(national_id, (0, ""))[1]
        if form is not None:
            description = next((cobble_lang[key] for key in form.get("pokedex", []) if key in cobble_lang), description)
        return {
            "description": description,
            "types": [TYPE_NAMES.get(kind, kind) for kind in types],
            "stats": {
                "hp": stats["hp"], "attack": stats["attack"], "defense": stats["defence"],
                "specialAttack": stats["special_attack"], "specialDefense": stats["special_defence"], "speed": stats["speed"],
            },
            "abilities": [
                {"name": ability_names.get(compact(ability.removeprefix("h:")), ability.removeprefix("h:")), "hidden": ability.startswith("h:")}
                for ability in pick("abilities", [])
            ],
            "baseExperience": pick("baseExperienceYield"),
            "catchRate": pick("catchRate"),
            "baseFriendship": pick("baseFriendship"),
            "experienceGroup": EXPERIENCE_GROUPS.get(pick("experienceGroup"), pick("experienceGroup")),
            "height": pick("height"),
            "weight": pick("weight"),
            "breeding": {
                "eggGroups": [cobble_lang.get(f"cobblemon.egg_group.{group}", group) for group in pick("eggGroups", [])],
                "maleRatio": pick("maleRatio", -1),
            },
            "riding": parse_riding(pick("riding")),
            "drops": parse_drops(pick("drops")),
            "moves": parse_moves(pick("moves", [])),
        }

    def form_sprite(national_id, form_key):
        identifier = default_identifier.get(national_id, "")
        suffix = POKEAPI_FORM_SUFFIX.get(form_key, form_key)
        for candidate in (f"{identifier}-{suffix}", f"{identifier}-{suffix}-standard"):
            if candidate in pokeapi_ids:
                return f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{pokeapi_ids[candidate]}.png"
        return f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{national_id}.png"

    def species_label(stem_or_id):
        national_id = stem_or_id if isinstance(stem_or_id, int) else national_by_stem.get(stem_or_id)
        return species_names.get(national_id, str(stem_or_id).capitalize())

    def requirement(req):
        variant = req.get("variant")
        if variant == "level":
            if req.get("maxLevel") and req.get("minLevel"):
                return {"text": f"Nivel {req['minLevel']}–{req['maxLevel']}"}
            if req.get("maxLevel"):
                return {"text": f"Nivel ≤ {req['maxLevel']}"}
            return {"text": f"Nivel {req.get('minLevel', 1)}"}
        if variant == "friendship":
            return {"text": f"Amistad ≥ {req['amount']}"}
        if variant == "time_range":
            return {"text": TIMES.get(req.get("range"), req.get("range"))}
        if variant == "held_item":
            return {"text": f"Llevando {item_name(req['itemCondition']) if not req['itemCondition'].startswith('#') else block_label(req['itemCondition'])}"}
        if variant == "biome":
            reference = req.get("biomeCondition") or req.get("biomeAnticondition")
            keys = register_condition_tags(reference) if reference else []
            return {"biomes": keys, "negate": not req.get("biomeCondition")} if keys else None
        if variant == "has_move":
            return {"text": f"Conociendo {move_list[move_ref(req['move'])]}"}
        if variant == "has_move_type":
            return {"text": f"Conociendo un movimiento de tipo {TYPE_NAMES.get(req['type'], req['type'])}"}
        if variant == "use_move":
            return {"text": f"Usar {move_list[move_ref(req['move'])]} {req.get('amount', 1)} veces"}
        if variant == "properties":
            target = req.get("target", "")
            if "gender=male" in target:
                return {"text": "Solo machos"}
            if "gender=female" in target:
                return {"text": "Solo hembras"}
            if "nature=" in target:
                return {"text": "Naturaleza " + target.split("nature=")[1]}
            return {"text": target}
        if variant == "party_member":
            return {"text": f"Con {species_label(req['target'].split()[0])} en el equipo"}
        if variant == "stat_compare":
            return {"text": f"{STAT_NAMES.get(req['highStat'], req['highStat'])} > {STAT_NAMES.get(req['lowStat'], req['lowStat'])}"}
        if variant == "stat_equal":
            return {"text": f"{STAT_NAMES.get(req['statOne'], req['statOne'])} = {STAT_NAMES.get(req['statTwo'], req['statTwo'])}"}
        if variant == "weather":
            if req.get("isThundering"):
                return {"text": "Con tormenta"}
            return {"text": "Con lluvia" if req.get("isRaining") else "Sin lluvia"}
        if variant == "moon_phase":
            return {"text": MOON_PHASES.get(req.get("moonPhase"), req.get("moonPhase"))}
        if variant == "structure":
            if req.get("structureCondition"):
                return {"text": f"En {block_label(req['structureCondition'])}"}
            return {"text": f"Fuera de {block_label(req['structureAnticondition'])}"}
        if variant == "battle_critical_hits":
            return {"text": f"{req['amount']} golpes críticos en un combate"}
        if variant == "recoil":
            return {"text": f"Recibir {req['amount']} PS de daño de retroceso"}
        if variant == "damage_taken":
            return {"text": f"Recibir {req['amount']} PS de daño"}
        if variant == "defeat":
            return {"text": f"Derrotar {req.get('amount', 1)} × {species_label(req['target'].split()[0])}"}
        if variant == "blocks_traveled":
            return {"text": f"Recorrer {req['amount']} bloques"}
        return {"text": variant}

    def evolution_method(evolution):
        variant = evolution.get("variant")
        context = evolution.get("requiredContext")
        if variant == "item_interact":
            return f"Usar {item_name(context)}"
        if variant == "trade":
            return f"Intercambio por {species_label(context)}" if context and ":" not in context else "Intercambio"
        return "Subir de nivel"

    def node_for_result(result):
        tokens = result.split()
        target = by_stem.get(tokens[0])
        if not target:
            return None
        national_id = target["nationalPokedexNumber"]
        form_key = match_form(target, tokens[1:])
        return f"{national_id}-{form_key}" if form_key else str(national_id)

    evolutions = []
    nodes = {}
    bias_notes = {}
    for stem, data in by_stem.items():
        national_id = data["nationalPokedexNumber"]
        sources = [(str(national_id), data.get("evolutions", []))]
        sources += [(f"{national_id}-{form['name'].lower()}", form.get("evolutions", [])) for form in regional_forms(data)]
        for node, entries in sources:
            for evolution in entries:
                target = node_for_result(evolution.get("result", ""))
                if not target:
                    continue
                evolutions.append({
                    "from": node,
                    "to": target,
                    "method": evolution_method(evolution),
                    "requirements": [item for item in map(requirement, evolution.get("requirements", [])) if item],
                    "moves": [move_list[move_ref(move)] for move in evolution.get("learnableMoves", [])],
                })
        for form in data.get("forms", []):
            bias = next((aspect for aspect in form.get("aspects", []) if aspect.startswith("region-bias-")), None)
            if not bias:
                continue
            region = bias.removeprefix("region-bias-").capitalize()
            targets = [node_for_result(evolution.get("result", "")) for evolution in form.get("evolutions", [])]
            regional_to = next((target for target in targets if target and "-" in target), None)
            if not regional_to:
                continue  # Su evolución directa no tiene forma regional.
            exceptions = []
            for evolution, target in zip(form.get("evolutions", []), targets):
                conditions = [req for req in evolution.get("requirements", []) if req.get("variant") == "biome" and req.get("biomeCondition")]
                keys = [key for req in conditions for key in register_condition_tags(req["biomeCondition"])]
                if keys and target and "-" not in target:
                    exceptions.append({"to": target, "biomes": keys})
            bias_notes[str(national_id)] = {"region": region, "regionalTo": regional_to, "exceptions": exceptions}

    details = {}
    egg_groups = {}
    for stem, data in sorted(by_stem.items(), key=lambda item: item[1]["nationalPokedexNumber"]):
        national_id = data["nationalPokedexNumber"]
        if national_id > MAX_NATIONAL_ID:
            continue
        egg_groups[national_id] = [cobble_lang.get(f"cobblemon.egg_group.{group}", group) for group in data.get("eggGroups", [])]
        nodes[str(national_id)] = {"id": national_id, "form": "", "label": "", "sprite": ""}
        for form in regional_forms(data):
            key = form["name"].lower()
            nodes[f"{national_id}-{key}"] = {"id": national_id, "form": key, "label": FORM_LABELS.get(key, form["name"]), "sprite": form_sprite(national_id, key)}
        if national_id > AVAILABLE_THROUGH:
            continue
        entry = build_entry(data)
        entry["spawns"] = spawns_by_node.get(str(national_id), [])
        entry["forms"] = {}
        for form in regional_forms(data):
            key = form["name"].lower()
            form_entry = build_entry(data, form)
            form_entry["spawns"] = spawns_by_node.get(f"{national_id}-{key}", [])
            form_entry["label"] = FORM_LABELS.get(key, form["name"])
            form_entry["sprite"] = form_sprite(national_id, key)
            entry["forms"][key] = form_entry
        if str(national_id) in bias_notes:
            entry["biasNote"] = bias_notes[str(national_id)]
        details[national_id] = entry

    ball_names = {ball: cobble_lang.get(f"item.cobblemon.{ball}", ball) for ball in BALLS}
    biome_table = {
        biome_id: info
        for biome_id, info in biomes.biomes.items()
        if any(biome_id in tag["biomes"] for tag in used_tags.values())
    }
    dump = lambda value: json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    OUTPUT.write_text(
        "// Generado por build_cobblemon_data.py desde Cobblemon 1.7.3. No editar a mano.\n"
        f"window.POKEDEX_DETAIL_MOVES = {dump(move_list)};\n"
        f"window.POKEDEX_BIOME_TAGS = {dump(used_tags)};\n"
        f"window.POKEDEX_BIOMES = {dump(biome_table)};\n"
        f"window.POKEDEX_BALL_NAMES = {dump(ball_names)};\n"
        f"window.POKEDEX_EVOLUTION_NODES = {dump(nodes)};\n"
        f"window.POKEDEX_EVOLUTIONS = {dump(evolutions)};\n"
        f"window.POKEDEX_DETAILS = {dump(details)};\n",
        encoding="utf-8",
    )
    # En Diosesmon las regiones de las formas (Alola, Galar, Hisui, Paldea) aún no están activas:
    # sus spawns salvajes no ocurren. Solo se consiguen las formas que salen al evolucionar
    # un Pokémon normal disponible (p. ej. Exeggcute -> Exeggutor de Alola).
    obtainable = {str(national_id): "base" for national_id in details}
    in_range = lambda node: int(node.split("-")[0]) <= AVAILABLE_THROUGH
    changed = True
    while changed:
        changed = False
        for edge in evolutions:
            if edge["from"] in obtainable and edge["to"] not in obtainable and in_range(edge["to"]):
                obtainable[edge["to"]] = "evolución"
                changed = True
    regional_records = []
    for national_id, entry in details.items():
        for key, form in entry["forms"].items():
            node = f"{national_id}-{key}"
            regional_records.append({
                "id": national_id,
                "form": key,
                "label": form["label"],
                "types": form["types"],
                "sprite": form["sprite"],
                "eggGroups": form["breeding"]["eggGroups"],
                "obtainable": obtainable.get(node),
            })
    CATALOG_OUTPUT.write_text(
        "// Generado por build_cobblemon_data.py desde Cobblemon 1.7.3. No editar a mano.\n"
        f"window.POKEDEX_EGG_GROUPS = {dump(egg_groups)};\n"
        f"window.POKEDEX_REGIONAL_FORMS = {dump(regional_records)};\n",
        encoding="utf-8",
    )
    for record in regional_records:
        print(f"  #{record['id']} {record['label']}: {record['obtainable'] or 'NO CONSEGUIBLE'}")
    with_spawns = sum(bool(item["spawns"]) for item in details.values())
    rideable = sum(bool(item["riding"]) for item in details.values())
    forms_count = sum(len(item["forms"]) for item in details.values())
    print(
        f"Generadas {len(details)} fichas en {OUTPUT.name}: {with_spawns} con spawns, {rideable} montables, "
        f"{forms_count} formas regionales, {len(evolutions)} evoluciones, {len(used_tags)} etiquetas de bioma, {len(biome_table)} biomas."
    )

if __name__ == "__main__":
    main()
