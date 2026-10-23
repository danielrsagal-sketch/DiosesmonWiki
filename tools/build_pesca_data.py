"""Genera data/pesca-data.js: cebos (bayas y frutas) con sus efectos, Poké Cañas y Pokémon que se pescan.

Datos de Cobblemon 1.7.3 (tools/build-cache) y de data/pokemon-details.js (spawns ya traducidos).
Uso: python tools/build_pesca_data.py
"""
import json
import re
import tarfile

from build_fosiles_monturas import CACHE, ROOT, download_icons
from diosesmon_config import AVAILABLE_THROUGH

MAX_NATIONAL_ID = AVAILABLE_THROUGH  # Generaciones activas en el servidor (diosesmon_config).
STATS = {"hp": "PS", "atk": "Ataque", "def": "Defensa", "spa": "At. Esp.", "spd": "Def. Esp.", "spe": "Velocidad"}
TYPES = {"normal": "Normal", "fire": "Fuego", "water": "Agua", "grass": "Planta", "electric": "Eléctrico", "ice": "Hielo",
         "fighting": "Lucha", "poison": "Veneno", "ground": "Tierra", "flying": "Volador", "psychic": "Psíquico", "bug": "Bicho",
         "rock": "Roca", "ghost": "Fantasma", "dragon": "Dragón", "dark": "Siniestro", "steel": "Acero", "fairy": "Hada"}
EGG_GROUPS = {"monster": "Monstruo", "water_1": "Agua 1", "water_2": "Agua 2", "water_3": "Agua 3", "bug": "Bicho", "flying": "Volador",
              "field": "Campo", "fairy": "Hada", "grass": "Planta", "human_like": "Humanoide", "mineral": "Mineral",
              "amorphous": "Amorfo", "dragon": "Dragón", "ditto": "Ditto"}
# Categoría de cada efecto para filtrar en la página.
CATEGORIES = {
    "bite_time": "Pican antes", "nature": "Naturaleza", "iv": "IVs", "ev": "EVs", "egg_group": "Grupo huevo", "typing": "Tipo",
    "shiny_reroll": "Shiny", "rarity_bucket": "Rareza", "level_raise": "Nivel", "ha_chance": "Habilidad oculta",
    "gender_chance": "Sexo", "friendship": "Amistad", "pokemon_chance": "Solo Pokémon", "drops_reroll": "Objeto",
}


def stat_name(sub):
    return STATS.get((sub or "").split(":")[-1], sub)


def describe(effect):
    kind = effect["type"].split(":")[-1]
    sub = effect.get("subcategory")
    value = effect.get("value")
    chance = effect.get("chance", 1.0)
    pct = f"{chance * 100:g}% de probabilidad: " if chance < 1 else ""
    if kind == "bite_time":
        text = f"Los Pokémon pican un {value * 100:g}% antes"
    elif kind == "nature":
        text = f"{pct}naturaleza que sube {stat_name(sub)}"
    elif kind == "iv":
        text = f"+{value:g} IV de {stat_name(sub)}"
    elif kind == "ev":
        text = f"Atrae Pokémon que dan EVs de {stat_name(sub)}"
    elif kind == "egg_group":
        text = f"Más probable el grupo huevo {EGG_GROUPS.get(sub, sub)} (×{value:g})"
    elif kind == "typing":
        text = f"Más probable el tipo {TYPES.get(sub, sub)} (×{value:g})"
    elif kind == "shiny_reroll":
        text = f"{value:g} tirada{'s' if value != 1 else ''} extra para que salga shiny"
    elif kind == "rarity_bucket":
        text = f"Sube la rareza del Pokémon (+{value:g})"
    elif kind == "level_raise":
        text = f"El Pokémon sale {value:g} niveles más alto"
    elif kind == "ha_chance":
        text = f"{chance * 100:g}% de que tenga habilidad oculta"
    elif kind == "gender_chance":
        text = f"{chance * 100:g}% de que salga {'hembra' if 'female' in (sub or '') else 'macho'}"
    elif kind == "friendship":
        text = f"Sale con +{value:g} de amistad"
    elif kind == "pokemon_chance":
        text = "Siempre pica un Pokémon (nunca objetos)"
    elif kind == "drops_reroll":
        text = "Más probabilidad de que lleve objeto"
    else:
        text = kind
    return {"category": CATEGORIES.get(kind, kind), "text": text[:1].upper() + text[1:]}


def js_value(path, name):
    source = (ROOT / path).read_text(encoding="utf-8")
    return json.loads(re.search(rf"window\.{name} = (.*?);\n", source, re.S).group(1))


def main():
    cobble_lang = json.loads((CACHE / "cobblemon-1.7.3-es_es.json").read_text(encoding="utf-8-sig"))
    mc_lang = json.loads((CACHE / "minecraft-1.21.1-es_es.json").read_text(encoding="utf-8-sig"))

    def item_name(item_id):
        namespace, _, path = item_id.partition(":")
        return cobble_lang.get(f"item.{namespace}.{path}") or mc_lang.get(f"item.{namespace}.{path}") or mc_lang.get(f"block.{namespace}.{path}") or path

    baits, rods = [], []
    with tarfile.open(CACHE / "cobblemon-1.7.3-data.tar.gz") as tar:
        files = {member.name.split("/data/", 1)[-1]: member for member in tar.getmembers() if member.isfile()}
        read = lambda path: json.loads(tar.extractfile(files[path]).read())
        for path in sorted(files):
            if path.startswith("cobblemon/spawn_bait_effects/") and "/poke_bait" not in path:
                data = read(path)
                if data["effects"]:
                    baits.append({"item": data["item"], "name": item_name(data["item"]), "fruit": "/fruits/" in path or data["item"].startswith("minecraft:"),
                                  "effects": [describe(effect) for effect in data["effects"]]})
            if path.startswith("cobblemon/pokerods/") and "ancient_" not in path:
                data = read(path)
                rod = path.split("/")[-1][:-5]
                rods.append({"item": f"cobblemon:{rod}", "ball": item_name(data["pokeBallId"]), "ballId": data["pokeBallId"]})

    icons = download_icons({bait["item"] for bait in baits} | {rod["item"] for rod in rods} | {rod["ballId"] for rod in rods}
                           | {"cobblemon:deep_sea_scale", "cobblemon:deep_sea_tooth", "cobblemon:dragon_scale", "cobblemon:kings_rock", "cobblemon:prism_scale",
                              "cobblemon:pokerod_smithing_template", "minecraft:fishing_rod", "minecraft:enchanted_book"})
    for bait in baits:
        bait["icon"] = icons.get(bait["item"])
    for rod in rods:
        rod["icon"] = icons.get(rod["item"]) or icons.get(rod["ballId"])
        rod["ballIcon"] = icons.get(rod["ballId"])
        del rod["ballId"]
    baits.sort(key=lambda bait: (bait["fruit"], bait["name"]))
    rods.sort(key=lambda rod: (rod["item"] != "cobblemon:poke_rod", rod["ball"]))

    # Pokémon que se pescan (spawns de la Pokédex con posición «Pesca»).
    details = js_value("data/pokemon-details.js", "POKEDEX_DETAILS")
    biome_tags = js_value("data/pokemon-details.js", "POKEDEX_BIOME_TAGS")
    species = {entry["id"]: entry for entry in json.loads(re.search(r"window\.POKEDEX_SPECIES = (\[.*?\]);", (ROOT / "data" / "pokemon-data.js").read_text(encoding="utf-8"), re.S).group(1))}
    order = {"common": 0, "uncommon": 1, "rare": 2, "ultra-rare": 3}
    fish = []
    for national, entry in sorted(species.items()):
        if entry.get("kind") != "pokemon" or national > MAX_NATIONAL_ID or not entry.get("available", True):
            continue
        spawns = [spawn for spawn in (details.get(str(national), {}).get("spawns") or []) if spawn["position"] == "Pesca"]
        if not spawns:
            continue
        spawns.sort(key=lambda spawn: order[spawn["rarity"]])
        places = list(dict.fromkeys(biome_tags.get(tag, {}).get("name", tag) for spawn in spawns for tag in spawn["biomes"]))
        def lure_of(spawn):
            return next((int(match.group(1)) for note in spawn["notes"] if (match := re.match(r"Señuelo nivel (\d)", note))), 0)
        plain = [spawn for spawn in spawns if lure_of(spawn) == 0]
        lured = [spawn for spawn in spawns if lure_of(spawn) > 0]
        levels = [int(value) for spawn in spawns for value in spawn["level"].split("-")]
        notes = list(dict.fromkeys(note for spawn in spawns for note in spawn["notes"] if not note.startswith("Señuelo") and note not in ("A cielo abierto", "Sin ver el cielo")))
        fish.append({"id": national, "name": entry["name"], "types": entry["types"], "rarity": spawns[0]["rarity"],
                     "level": f"{min(levels)}-{max(levels)}", "places": places[:6], "notes": notes[:4],
                     # Rareza sin encantamiento y, si mejora con Atracción, con qué nivel y a qué rareza.
                     "plain": plain[0]["rarity"] if plain else None,
                     "lure": min(lure_of(spawn) for spawn in lured) if lured else 0,
                     "lured": lured[0]["rarity"] if lured else None})

    treasure = [{"name": item_name(item), "icon": icons.get(item)} for item in
                ["cobblemon:deep_sea_scale", "cobblemon:deep_sea_tooth", "cobblemon:dragon_scale", "cobblemon:kings_rock", "cobblemon:prism_scale"]]
    values = {"FISHING_BAITS": baits, "FISHING_RODS": rods, "FISHING_POKEMON": fish, "FISHING_TREASURE": treasure,
              "FISHING_ICONS": {"template": icons.get("cobblemon:pokerod_smithing_template"), "rod": icons.get("minecraft:fishing_rod"), "book": icons.get("minecraft:enchanted_book")}}
    lines = ["// Generado por build_pesca_data.py desde Cobblemon 1.7.3. No editar a mano."]
    lines += [f"window.{name} = {json.dumps(value, ensure_ascii=False, separators=(',', ':'))};" for name, value in values.items()]
    (ROOT / "data" / "pesca-data.js").write_text("\n".join(lines) + "\n", encoding="utf-8")
    missing = [entry["name"] for entry in baits + rods if not entry.get("icon")]
    print(f"{len(baits)} cebos, {len(rods)} cañas, {len(fish)} Pokémon que se pescan; sin icono: {missing}")


if __name__ == "__main__":
    main()
