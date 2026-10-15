"""Genera data/safari-pokemon.js desde tools/source/safari-pokemon.txt.

Cada Pokémon de la lista arrastra a toda su familia evolutiva (bebés, evoluciones y ramas),
porque en el Safari aparece la cadena completa. Usa data/crianza-data.js para nombres y evoluciones.
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools" / "source" / "safari-pokemon.txt"
BREEDING = ROOT / "data" / "crianza-data.js"
OUTPUT = ROOT / "data" / "safari-pokemon.js"

# Colores y notas de cada zona (los colores son los del mapa en data/safari-data.js).
ZONES = {
    "jardin": {"color": "#ea7dbd"},
    "rio": {"color": "#4bb6ff", "note": "Aparecen en el océano; los ríos conectan las islas."},
    "valle": {"color": "#ad85f5"},
    "cumbres": {"color": "#c9e86a"},
    "articos": {"color": "#b4ecff"},
    "selva": {"color": "#46d466"},
    "igneas": {"color": "#ff6d2e"},
}


def fold(text):
    return "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn").lower().strip()


def load_species():
    text = BREEDING.read_text(encoding="utf-8")
    match = re.search(r"window\.BREEDING_SPECIES = (\[.*?\]);\n", text, re.S)
    return json.loads(match.group(1))


def main():
    species = load_species()
    by_id = {entry["id"]: entry for entry in species}
    by_name = {fold(entry["name"]): entry for entry in species}
    children = {}
    for entry in species:
        if entry["from"]:
            children.setdefault(entry["from"], []).append(entry["id"])

    def family(national_id):
        root = national_id
        while by_id[root]["from"] in by_id:
            root = by_id[root]["from"]
        members, pending = [], [root]
        while pending:
            current = pending.pop()
            members.append(current)
            pending.extend(children.get(current, []))
        return members

    zones, current = [], None
    for raw in SOURCE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if header := re.match(r"\[(\w+)\]\s*(.+)", line):
            current = {"id": header.group(1), "name": header.group(2), **ZONES.get(header.group(1), {}), "listed": {}}
            zones.append(current)
            continue
        rare = bool(re.search(r"\(raro\)\s*$", line, re.I))
        name = re.sub(r"\(raro\)\s*$", "", line, flags=re.I).strip()
        entry = by_name.get(fold(name))
        if not entry:
            raise SystemExit(f"No reconozco el Pokémon «{name}» en la zona {current['name']}")
        # Si un Pokémon aparece como raro y también como normal en la misma zona, cuenta como normal.
        current["listed"][entry["id"]] = current["listed"].get(entry["id"], True) and rare

    output_zones = []
    for zone in zones:
        found = {}
        for listed_id, rare in zone["listed"].items():
            for member in family(listed_id):
                previous = found.get(member)
                found[member] = {
                    "id": member,
                    "rare": rare if previous is None else previous["rare"] and rare,
                    "listed": member in zone["listed"] or bool(previous and previous["listed"]),
                }
        pokemon = sorted(found.values(), key=lambda item: item["id"])
        output_zones.append({
            "id": zone["id"],
            "name": zone["name"],
            "color": zone.get("color", "#43db95"),
            **({"note": zone["note"]} if zone.get("note") else {}),
            "pokemon": [{"id": item["id"], **({"rare": True} if item["rare"] else {}), **({} if item["listed"] else {"family": True})} for item in pokemon],
        })

    dump = lambda value: json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    OUTPUT.write_text(
        "// Generado por tools/build_safari_pokemon.py desde tools/source/safari-pokemon.txt. No editar a mano.\n"
        "// zones[].pokemon: id de Pokédex; rare = aparece poco; family = añadido por su familia evolutiva.\n"
        f"window.SAFARI_POKEMON = {dump(output_zones)};\n",
        encoding="utf-8",
    )
    total = {item["id"] for zone in output_zones for item in zone["pokemon"]}
    for zone in output_zones:
        print(f"  {zone['name']}: {len(zone['pokemon'])} Pokémon")
    print(f"Generado {OUTPUT.name}: {len(output_zones)} zonas, {len(total)} especies distintas.")


if __name__ == "__main__":
    main()
