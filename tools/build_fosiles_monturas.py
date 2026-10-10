"""Genera data/fosiles-data.js y data/monturas-data.js desde Cobblemon 1.7.3.

Lee el mismo tarball que build_cobblemon_data.py (tools/build-cache) y los nombres
en español de data/pokemon-data.js y de las traducciones de Cobblemon/Minecraft.
Uso: python tools/build_fosiles_monturas.py
"""
import csv
import json
import re
import tarfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / "build-cache"
MAX_NATIONAL_ID = 493  # Generaciones activas en el servidor: 1 a 4.
# Formas regionales montables que se pueden conseguir en el servidor (al evolucionar un Pokémon normal).
AVAILABLE_FORMS = {(122, "galar")}

FORM_LABELS = {"galar": "de Galar", "alola": "de Alola", "hisui": "de Hisui", "paldea": "de Paldea"}
RIDE_ENVIRONMENTS = {"LAND": "tierra", "LIQUID": "agua", "AIR": "aire"}
RIDE_STATS = {"SPEED": "speed", "ACCELERATION": "acceleration", "SKILL": "skill", "JUMP": "jump", "STAMINA": "stamina"}

# Fósil → Pokémon que revive (nombre de objeto en Cobblemon).
FOSSIL_ORDER = [
    "helix_fossil", "dome_fossil", "old_amber_fossil", "root_fossil", "claw_fossil", "skull_fossil", "armor_fossil",
    "cover_fossil", "plume_fossil", "jaw_fossil", "sail_fossil",
    "fossilized_bird", "fossilized_fish", "fossilized_drake", "fossilized_dino",
]
# Correcciones a la traducción de Cobblemon.
NAME_FIXES = {"Fósil Craneo": "Fósil Cráneo"}

# Yacimientos: el fósil garantizado (según la wiki de Cobblemon) y dónde aparecen, en español.
DIG_SITES = {
    "birch_tree": ("Abedul prehistórico", ["plume_fossil"], "Superficie", "Biomas con abedules",
                   "Un gran abedul caído y sin hojas. Excava bajo los restos: las raíces de abedul descortezado esconden grava sospechosa."),
    "dripstone_oasis": ("Oasis kárstico prehistórico", ["claw_fossil"], "Subterráneo", "Cuevas kársticas (Y 10 a −37)",
                        "Un pequeño oasis bajo tierra, dentro de las cuevas kársticas, con grava sospechosa alrededor."),
    "enhydro_agate": ("Ágata enhidra prehistórica", ["fossilized_fish"], "Subterráneo", "Cuevas frondosas (Y 10 a −37)",
                      "Geoda subterránea en las cuevas frondosas. Siempre trae mena de Piedra Agua de pizarra profunda."),
    "eroded_pillar": ("Pilar erosionado prehistórico", ["jaw_fossil"], "Superficie", "Biomas con arena roja",
                      "Un pilar torcido de materiales naturales, de tamaño variable, con grava sospechosa en su interior."),
    "frozen_pond": ("Estanque helado prehistórico", ["sail_fossil"], "Superficie", "Biomas donde se forma hielo (no océanos)",
                    "Un pequeño estanque congelado con coral muerto sobre el hielo. Bajo el agua hay grava sospechosa."),
    "frozen_spike": ("Pico helado prehistórico", ["fossilized_dino"], "Superficie", "Biomas donde se forma hielo (no océanos)",
                     "Una pequeña aguja de hielo con depósitos de grava sospechosa en su interior."),
    "hydrothermal_vents": ("Fumarolas hidrotermales prehistóricas", ["dome_fossil"], "Fondo marino", "Océanos templados (ni cálidos ni fríos)",
                           "Columnas de basalto con bloques de magma en el fondo del océano. La grava sospechosa aparece debajo y alrededor."),
    "lush_den": ("Guarida frondosa prehistórica", ["jaw_fossil"], "Superficie", "Junglas",
                 "Una pequeña cueva cubierta de hojas de jungla. Dentro puede aparecer grava sospechosa."),
    "mossy_pond": ("Estanque musgoso prehistórico", ["claw_fossil"], "Subterráneo", "Cuevas frondosas (Y 10 a −37)",
                   "Estanque cubierto de musgo bajo tierra. Siempre trae mena de Piedra Agua de pizarra profunda."),
    "mud_pit": ("Fosa de barro prehistórica", ["skull_fossil"], "Bajo la superficie", "Junglas",
                "Una fosa de barro enterrada en la jungla, con grava sospechosa."),
    "oak_tree": ("Roble prehistórico", ["old_amber_fossil"], "Superficie", "Biomas con robles",
                 "Un gran roble caído y sin hojas. Excava bajo los restos: las raíces de roble descortezado esconden grava sospechosa."),
    "powdered_deposit": ("Depósito de nieve prehistórico", ["sail_fossil"], "Superficie", "Biomas nevados",
                         "Un montículo de nieve polvo. Excava debajo para encontrar grava sospechosa."),
    "preserved_skeleton": ("Esqueleto conservado prehistórico", ["fossilized_bird", "fossilized_fish", "fossilized_drake", "fossilized_dino"],
                           "Océano helado", "Océanos helados",
                           "Un bloque de hielo con bloques de hueso, arena sospechosa y grava sospechosa en su interior."),
    "rooted_pit": ("Fosa de raíces prehistórica", ["root_fossil"], "Bajo la superficie", "Pantanos",
                   "Un montón de raíces de mangle, arcilla y barro, junto con grava sospechosa."),
    "sandy_den": ("Guarida arenosa prehistórica", ["helix_fossil"], "Superficie", "Biomas con arena (no playas)",
                  "Un saliente de arenisca y arena con una estalactita colgando dentro. Lo rodea arena sospechosa."),
    "spruce_tree": ("Abeto prehistórico", ["old_amber_fossil"], "Superficie", "Biomas con abetos",
                    "Un gran abeto caído y sin hojas. Excava bajo los restos: las raíces de abeto descortezado esconden grava sospechosa."),
    "submerged_impact": ("Impacto sumergido prehistórico", ["fossilized_fish"], "Fondo marino", "Océanos",
                         "Un cráter en el fondo del mar de grava, piedra, granito, espeleotemas y magma. Lo rodea grava sospechosa."),
    "submerged_spike": ("Pico sumergido prehistórico", ["cover_fossil"], "Fondo marino", "Océanos helados",
                        "Una aguja de hielo sobre un montón de arena en el fondo del mar. La rodea arena sospechosa."),
    "sunscorched_den": ("Guarida calcinada prehistórica", ["armor_fossil"], "Superficie", "Biomas con arena roja",
                        "Un saliente de arena roja, terracota y grava, con algo de grava sospechosa."),
    "sunscorched_remains": ("Restos calcinados prehistóricos", ["fossilized_drake"], "Superficie", "Biomas con arena roja",
                            "Un saliente de arena roja, basalto liso y grava, con algo de grava sospechosa."),
    "suspicious_mound": ("Montículo sospechoso prehistórico", ["fossilized_bird"], "Superficie", "Llanuras",
                         "Un montículo de hierba, tierra, toba, roca musgosa y agua, con algo de grava sospechosa."),
    "underwater_fissure": ("Fisura submarina prehistórica", ["cover_fossil"], "Fondo marino", "Océanos profundos",
                           "Una grieta en el fondo del océano con bloques de magma y algo de grava sospechosa."),
    "vibrant_hydrothermal_vents": ("Fumarolas vivas prehistóricas", ["cover_fossil"], "Fondo marino", "Océanos tibios y cálidos",
                                   "Columnas de basalto con bloques de magma en mares cálidos. La arena sospechosa aparece debajo y alrededor."),
}
# Ambiente de cada yacimiento para colorear la tarjeta.
SITE_THEMES = {
    "Superficie": "surface", "Bajo la superficie": "surface", "Subterráneo": "cave", "Fondo marino": "ocean", "Océano helado": "ocean",
}

# Iconos de objetos: texturas del juego copiadas a assets/img/items/<namespace>/<objeto>.png.
COBBLEMON_TEXTURES = "https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository"
MINECRAFT_TEXTURES = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.1/assets/minecraft/textures"
# Iconos extra para la guía (pincel y bloques sospechosos).
EXTRA_ICONS = {"minecraft:brush": "item/brush", "minecraft:suspicious_sand": "block/suspicious_sand_0", "minecraft:suspicious_gravel": "block/suspicious_gravel_0"}


def cobblemon_texture_index():
    paths, page = {}, 1
    while True:
        query = urllib.parse.urlencode({"path": "common/src/main/resources/assets/cobblemon/textures/item", "ref": "1.7.3", "recursive": "true", "per_page": 100, "page": page})
        batch = json.load(urllib.request.urlopen(f"{COBBLEMON_TEXTURES}/tree?{query}", timeout=30))
        if not batch:
            return paths
        for entry in batch:
            if entry["type"] == "blob" and entry["path"].endswith(".png"):
                stem = Path(entry["path"]).stem
                # Los iconos van antes que las texturas de modelos 3D (p. ej. poke_balls/models/).
                if stem not in paths or ("/models/" in paths[stem] and "/models/" not in entry["path"]):
                    paths[stem] = entry["path"]
        page += 1


def download_icons(item_ids):
    """Descarga las texturas que falten y devuelve {item_id: ruta local}."""
    icons, index = {}, None
    for item_id in sorted(item_ids):
        namespace, _, path = item_id.partition(":")
        target = ROOT / "assets" / "img" / "items" / namespace / f"{path}.png"
        if not target.exists():
            if namespace == "cobblemon":
                index = index if index is not None else cobblemon_texture_index()
                if path not in index:
                    continue
                url = f"{COBBLEMON_TEXTURES}/files/{urllib.parse.quote(index[path], safe='')}/raw?ref=1.7.3"
            elif namespace == "minecraft":
                url = f"{MINECRAFT_TEXTURES}/{EXTRA_ICONS.get(item_id, f'item/{path}')}.png"
            else:
                continue  # Objetos de otros mods: sin textura descargable.
            try:
                data = urllib.request.urlopen(url, timeout=30).read()
            except urllib.error.HTTPError:
                continue  # Sin textura plana (p. ej. bloques): quien llama decide el icono.
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        icons[item_id] = target.relative_to(ROOT).as_posix()
    return icons


def species_files(tar):
    for member in tar.getmembers():
        if member.isfile() and "/data/cobblemon/species/" in member.name and member.name.endswith(".json"):
            yield json.loads(tar.extractfile(member).read())


def stat_range(text):
    low, _, high = str(text).partition("-")
    return [int(low), int(high or low)]


def main():
    cobble_lang = json.loads((CACHE / "cobblemon-1.7.3-es_es.json").read_text(encoding="utf-8-sig"))
    mc_lang = json.loads((CACHE / "minecraft-1.21.1-es_es.json").read_text(encoding="utf-8-sig"))
    source = (ROOT / "data" / "pokemon-data.js").read_text(encoding="utf-8")
    species = {entry["id"]: entry for entry in json.loads(re.search(r"window\.POKEDEX_SPECIES = (\[.*?\]);", source, re.S).group(1))}
    with open(CACHE / "pokeapi-pokemon.csv", encoding="utf-8") as handle:
        pokeapi_ids = {row["identifier"]: int(row["id"]) for row in csv.DictReader(handle)}

    def item_name(item_id):
        namespace, _, path = item_id.partition(":")
        for key in (f"item.{namespace}.{path}", f"block.{namespace}.{path}"):
            name = cobble_lang.get(key) or mc_lang.get(key)
            if name:
                return NAME_FIXES.get(name, name)
        return path.replace("_", " ").capitalize()

    tar = tarfile.open(CACHE / "cobblemon-1.7.3-data.tar.gz")
    files = {member.name.split("/data/", 1)[-1]: member for member in tar.getmembers() if member.isfile()}

    def read(path):
        return json.loads(tar.extractfile(files[path]).read())

    # --- Fósiles ---
    revives = {}
    by_national = {}
    for data in species_files(tar):
        by_national[data["name"].lower().replace(" ", "")] = data["nationalPokedexNumber"]
    for path in files:
        if path.startswith("cobblemon/fossils/"):
            recipe = read(path)
            national = by_national.get(recipe["result"].replace("_", "").replace(" ", ""))
            for fossil in recipe["fossils"]:
                revives.setdefault(fossil.split(":")[1], []).append(national)

    sites = []
    fossil_sites = {key: {"guaranteed": [], "possible": []} for key in FOSSIL_ORDER}
    for key, (name, guaranteed, layer, biome, description) in DIG_SITES.items():
        loot = []
        for tier, rarity in (("uncommon", "Poco común"), ("common", "Común")):
            table = read(f"cobblemon/loot_table/fossils/{tier}/prehistoric_{key}.json")
            entries = sorted(table["pools"][0]["entries"], key=lambda entry: -entry.get("weight", 1))
            for entry in entries:
                item_id = entry["name"]
                fossil = item_id.split(":")[1] if item_id.split(":")[1] in fossil_sites else None
                loot.append({
                    "name": item_name(item_id), "item": item_id, "rarity": rarity,
                    "weight": entry.get("weight", 1), **({"fossil": fossil} if fossil else {}),
                })
        possible = [entry["fossil"] for entry in loot if "fossil" in entry]
        for fossil in guaranteed:
            fossil_sites[fossil]["guaranteed"].append(key)
        for fossil in dict.fromkeys(possible):
            if fossil not in guaranteed:
                fossil_sites[fossil]["possible"].append(key)
        sites.append({
            "id": key, "name": name, "layer": layer, "theme": SITE_THEMES[layer], "biome": biome, "description": description,
            "guaranteed": guaranteed, "fossils": list(dict.fromkeys(possible)), "loot": loot,
        })

    icons = download_icons({entry["item"] for site in sites for entry in site["loot"]}
                           | {f"cobblemon:{key}" for key in FOSSIL_ORDER} | set(EXTRA_ICONS))
    for site in sites:
        for entry in site["loot"]:
            entry["icon"] = icons.get(entry.pop("item"))

    fossils = []
    for key in FOSSIL_ORDER:
        results = sorted(set(revives.get(key, [])))
        fossils.append({
            "id": key, "name": item_name(f"cobblemon:{key}"), "icon": icons[f"cobblemon:{key}"],
            "pokemon": [{"id": national, "name": species[national]["name"], "types": species[national]["types"],
                         "generation": species[national]["generation"]} for national in results],
            "available": all(national <= MAX_NATIONAL_ID for national in results),
            "galar": key.startswith("fossilized_"),
            **fossil_sites[key],
        })

    write_js("fosiles-data.js", {"FOSSILS": fossils, "FOSSIL_SITES": sites, "FOSSIL_GUIDE_ICONS": {key.split(":")[1]: icons[key] for key in EXTRA_ICONS}})

    # --- Monturas ---
    mounts = []
    for data in species_files(tar):
        national = data["nationalPokedexNumber"]
        candidates = [(None, data)] + [(form["name"].lower(), form) for form in data.get("forms", []) if form.get("riding")]
        for form_key, source_data in candidates:
            riding = source_data.get("riding") or (data.get("riding") if form_key is None else None)
            if not riding or not riding.get("behaviours"):
                continue
            if form_key is None and national > MAX_NATIONAL_ID:
                continue
            if form_key is not None and (national, form_key) not in AVAILABLE_FORMS:
                continue
            base = species[national]
            modes = []
            for environment in ("LAND", "LIQUID", "AIR"):
                behaviour = riding["behaviours"].get(environment)
                if not behaviour:
                    continue
                modes.append({
                    "env": RIDE_ENVIRONMENTS[environment],
                    "style": behaviour.get("key", "").split("/")[-1],
                    "stats": {RIDE_STATS[stat]: stat_range(value) for stat, value in behaviour.get("stats", {}).items() if stat in RIDE_STATS},
                })
            entry = {
                "id": national, "name": base["name"], "types": base["types"], "generation": base["generation"],
                "seats": len(riding.get("seats", [])) or 1, "modes": modes,
                "legendary": bool({"legendary", "mythical"} & set(data.get("labels", []))),
                "sprite": base["sprite"],
            }
            if form_key is not None:
                identifier = f"{base['identifier']}-{form_key}"
                entry.update({
                    "form": form_key, "name": f"{base['name']} {FORM_LABELS.get(form_key, form_key)}",
                    "types": [TYPE_ES.get(kind, kind) for kind in [source_data.get("primaryType"), source_data.get("secondaryType")] if kind] or base["types"],
                    "sprite": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{pokeapi_ids[identifier]}.png",
                })
            mounts.append(entry)
    mounts.sort(key=lambda mount: (mount["id"], mount.get("form", "")))
    write_js("monturas-data.js", {"MOUNTS": mounts})
    print(f"{len(fossils)} fósiles, {len(sites)} yacimientos, {len(mounts)} monturas")


TYPE_ES = {
    "normal": "Normal", "fire": "Fuego", "water": "Agua", "grass": "Planta", "electric": "Eléctrico", "ice": "Hielo",
    "fighting": "Lucha", "poison": "Veneno", "ground": "Tierra", "flying": "Volador", "psychic": "Psíquico", "bug": "Bicho",
    "rock": "Roca", "ghost": "Fantasma", "dragon": "Dragón", "dark": "Siniestro", "steel": "Acero", "fairy": "Hada",
}


def write_js(filename, values):
    lines = ["// Generado por build_fosiles_monturas.py desde Cobblemon 1.7.3. No editar a mano."]
    lines += [f"window.{name} = {json.dumps(value, ensure_ascii=False, separators=(',', ':'))};" for name, value in values.items()]
    (ROOT / "data" / filename).write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
