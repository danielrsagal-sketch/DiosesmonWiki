"""Genera data/entrenamiento-data.js (EVs de cada especie y su spawn) desde Cobblemon 1.7.3.

Usa los EVs del tarball de Cobblemon (tools/build-cache), los spawns ya traducidos de
data/pokemon-details.js y descarga los iconos de objetos que falten en assets/img/items.
Uso: python tools/build_ev_data.py
"""
import json
import re
import tarfile
from pathlib import Path

from build_fosiles_monturas import CACHE, ROOT, download_icons

MAX_NATIONAL_ID = 493  # Generaciones activas en el servidor: 1 a 4.
STATS = ["hp", "attack", "defence", "special_attack", "special_defence", "speed"]
RARITY_ORDER = {"common": 0, "uncommon": 1, "rare": 2, "ultra-rare": 3}

# Objetos que aparecen en la guía (los iconos se copian del juego).
ITEMS = [
    "power_weight", "power_bracer", "power_belt", "power_lens", "power_band", "power_anklet",
    "hp_up", "protein", "iron", "calcium", "zinc", "carbos",
    "health_mochi", "muscle_mochi", "resist_mochi", "genius_mochi", "clever_mochi", "swift_mochi", "fresh_start_mochi",
    "health_feather", "muscle_feather", "resist_feather", "genius_feather", "clever_feather", "swift_feather",
    "pomeg_berry", "kelpsy_berry", "qualot_berry", "hondew_berry", "grepa_berry", "tamato_berry",
    "white_mint_leaf", "red_mint_leaf", "blue_mint_leaf", "cyan_mint_leaf", "pink_mint_leaf", "green_mint_leaf",
    "exp_share", "pp_up", "hearty_grains", "exp_candy_l", "poke_rod", "poke_snack",
]


def js_value(source, name):
    return json.loads(re.search(rf"window\.{name} = (.*?);\n", source, re.S).group(1))


def main():
    details_source = (ROOT / "data" / "pokemon-details.js").read_text(encoding="utf-8")
    details = js_value(details_source, "POKEDEX_DETAILS")
    biome_tags = js_value(details_source, "POKEDEX_BIOME_TAGS")
    species_source = (ROOT / "data" / "pokemon-data.js").read_text(encoding="utf-8")
    species = {entry["id"]: entry for entry in json.loads(re.search(r"window\.POKEDEX_SPECIES = (\[.*?\]);", species_source, re.S).group(1))}

    yields = {}
    with tarfile.open(CACHE / "cobblemon-1.7.3-data.tar.gz") as tar:
        for member in tar.getmembers():
            if member.isfile() and "/data/cobblemon/species/" in member.name and member.name.endswith(".json"):
                data = json.loads(tar.extractfile(member).read())
                if data["nationalPokedexNumber"] <= MAX_NATIONAL_ID:
                    yields[data["nationalPokedexNumber"]] = [data.get("evYield", {}).get(stat, 0) for stat in STATS]

    pokemon = []
    for national, ev in sorted(yields.items()):
        base = species[national]
        if not base.get("available", True) or not any(ev):
            continue
        spawns = sorted(details.get(str(national), {}).get("spawns") or [], key=lambda spawn: RARITY_ORDER[spawn["rarity"]])
        entry = {"id": national, "name": base["name"], "types": base["types"], "ev": ev}
        if spawns:
            levels = [int(value) for spawn in spawns for value in spawn["level"].split("-")]
            best = spawns[0]["rarity"]
            places = []
            for spawn in spawns:
                for tag in spawn["biomes"]:
                    name = biome_tags.get(tag, {}).get("name", tag)
                    if name not in places:
                        places.append(name)
            entry["spawn"] = {
                "rarity": best,
                "bucket": spawns[0]["bucket"],
                "level": f"{min(levels)}-{max(levels)}",
                "positions": list(dict.fromkeys(spawn["position"] for spawn in spawns)),
                "places": places,
                # Condiciones del spawn más común (día, lluvia, estructuras…).
                "notes": list(dict.fromkeys(note for spawn in spawns if spawn["rarity"] == best for note in spawn["notes"])),
            }
        pokemon.append(entry)

    icons = download_icons({f"cobblemon:{item}" for item in ITEMS})
    values = {
        "EV_POKEMON": pokemon,
        "EV_ICONS": {item: icons.get(f"cobblemon:{item}") for item in ITEMS},
    }
    lines = ["// Generado por build_ev_data.py desde Cobblemon 1.7.3. No editar a mano."]
    lines += [f"window.{name} = {json.dumps(value, ensure_ascii=False, separators=(',', ':'))};" for name, value in values.items()]
    (ROOT / "data" / "entrenamiento-data.js").write_text("\n".join(lines) + "\n", encoding="utf-8")
    missing = [item for item, icon in values["EV_ICONS"].items() if not icon]
    print(f"{len(pokemon)} Pokémon con EVs; iconos sin textura: {missing}")


if __name__ == "__main__":
    main()
