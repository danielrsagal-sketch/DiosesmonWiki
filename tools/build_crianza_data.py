"""Genera data/crianza-data.js para el planificador de cadenas de crianza.

Por especie (generaciones 1 a 4): grupos huevo, proporción de machos, de quién evoluciona,
stats de ataque/ataque especial/velocidad y su spawn resumido (de data/entrenamiento-data.js).
Uso: python tools/build_crianza_data.py  (después de build_ev_data.py)
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_NATIONAL_ID = 493


def js_value(path, name):
    source = (ROOT / path).read_text(encoding="utf-8")
    return json.loads(re.search(rf"window\.{name} = (.*?);\n", source, re.S).group(1))


def main():
    species_source = (ROOT / "data" / "pokemon-data.js").read_text(encoding="utf-8")
    species = json.loads(re.search(r"window\.POKEDEX_SPECIES = (\[.*?\]);", species_source, re.S).group(1))
    details = js_value("data/pokemon-details.js", "POKEDEX_DETAILS")
    egg_groups = js_value("data/pokemon-catalog-extra.js", "POKEDEX_EGG_GROUPS")
    spawns = {entry["id"]: entry.get("spawn") for entry in js_value("data/entrenamiento-data.js", "EV_POKEMON")}

    out = []
    for entry in species:
        national = entry["id"]
        if entry.get("kind") != "pokemon" or national > MAX_NATIONAL_ID or not entry.get("available", True):
            continue
        breeding = details.get(str(national), {}).get("breeding", {})
        stats = entry["stats"]
        record = {
            "id": national, "name": entry["name"], "types": entry["types"],
            "egg": egg_groups.get(str(national), breeding.get("eggGroups", [])),
            "male": breeding.get("maleRatio", -1),
            "from": entry.get("evolvesFrom"),
            "atk": stats["attack"], "spa": stats["specialAttack"], "spe": stats["speed"],
        }
        if spawns.get(national):
            spawn = spawns[national]
            record["spawn"] = {"rarity": spawn["rarity"], "level": spawn["level"], "places": spawn["places"][:6], "notes": spawn["notes"][:4]}
        out.append(record)

    lines = ["// Generado por build_crianza_data.py (Cobblemon 1.7.3 + datos de la wiki). No editar a mano."]
    lines.append(f"window.BREEDING_SPECIES = {json.dumps(out, ensure_ascii=False, separators=(',', ':'))};")
    (ROOT / "data" / "crianza-data.js").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(out)} especies")


if __name__ == "__main__":
    main()
