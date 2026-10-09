import csv
import io
import json
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "data" / "pokemon-data.js"
SOURCE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"
SPANISH_LANGUAGE_ID = "7"
MAX_NATIONAL_ID = 1025
AVAILABLE_THROUGH = 493


def read_csv(filename):
    request = urllib.request.Request(
        SOURCE + filename,
        headers={"User-Agent": "WikiDiosesmon-Pokedex-Builder/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return list(csv.DictReader(io.StringIO(response.read().decode("utf-8"))))


def spanish_lookup(filename, key):
    rows = read_csv(filename)
    return {
        row[key]: row["name"]
        for row in rows
        if row["local_language_id"] == SPANISH_LANGUAGE_ID
    }


def main():
    pokemon_rows = read_csv("pokemon.csv")
    species_rows = read_csv("pokemon_species.csv")
    spanish_species = {
        row["pokemon_species_id"]: row
        for row in read_csv("pokemon_species_names.csv")
        if row["local_language_id"] == SPANISH_LANGUAGE_ID
    }
    species_names = {key: row["name"] for key, row in spanish_species.items()}
    type_names = spanish_lookup("type_names.csv", "type_id")
    ability_names = spanish_lookup("ability_names.csv", "ability_id")
    pokemon_types = read_csv("pokemon_types.csv")
    pokemon_stats = read_csv("pokemon_stats.csv")
    pokemon_abilities = read_csv("pokemon_abilities.csv")
    move_identifiers = {
        row["id"]: row["identifier"]
        for row in read_csv("moves.csv")
    }
    move_names = {
        move_identifiers[row["move_id"]]: row["name"]
        for row in read_csv("move_names.csv")
        if row["local_language_id"] == SPANISH_LANGUAGE_ID
        and row["move_id"] in move_identifiers
    }

    species_by_id = {int(row["id"]): row for row in species_rows}
    default_pokemon = {
        int(row["id"]): row
        for row in pokemon_rows
        if row["is_default"] == "1" and int(row["id"]) <= MAX_NATIONAL_ID
    }
    types_by_pokemon = {}
    for row in pokemon_types:
        pokemon_id = int(row["pokemon_id"])
        if pokemon_id in default_pokemon:
            types_by_pokemon.setdefault(pokemon_id, []).append(row)

    stats_by_pokemon = {}
    for row in pokemon_stats:
        pokemon_id = int(row["pokemon_id"])
        if pokemon_id in default_pokemon:
            stats_by_pokemon.setdefault(pokemon_id, {})[int(row["stat_id"])] = int(row["base_stat"])

    abilities_by_pokemon = {}
    for row in pokemon_abilities:
        pokemon_id = int(row["pokemon_id"])
        if pokemon_id in default_pokemon:
            abilities_by_pokemon.setdefault(pokemon_id, []).append(row)

    stat_names = {
        1: "hp",
        2: "attack",
        3: "defense",
        4: "specialAttack",
        5: "specialDefense",
        6: "speed",
    }
    species = []

    for national_id in range(1, MAX_NATIONAL_ID + 1):
        pokemon = default_pokemon.get(national_id)
        if pokemon is None:
            raise ValueError(f"Falta el Pokémon nacional #{national_id}")

        species_id = int(pokemon["species_id"])
        species_info = species_by_id[species_id]
        raw_stats = stats_by_pokemon.get(national_id, {})
        stats = {
            stat_names[stat_id]: raw_stats.get(stat_id, 0)
            for stat_id in range(1, 7)
        }
        abilities = sorted(
            [
                {
                    "name": ability_names.get(row["ability_id"], row["ability_id"]),
                    "hidden": row["is_hidden"] == "1",
                    "slot": int(row["slot"]),
                }
                for row in abilities_by_pokemon.get(national_id, [])
            ],
            key=lambda ability: ability["slot"],
        )
        ordered_types = sorted(
            types_by_pokemon.get(national_id, []),
            key=lambda row: int(row["slot"]),
        )
        types = [type_names.get(row["type_id"], row["type_id"]) for row in ordered_types]
        species.append(
            {
                "id": national_id,
                "kind": "pokemon",
                "name": species_names.get(str(species_id), pokemon["identifier"]),
                "identifier": pokemon["identifier"],
                "genus": spanish_species.get(str(species_id), {}).get("genus") or "Pokémon",
                "generation": int(species_info["generation_id"]),
                "available": national_id <= AVAILABLE_THROUGH,
                "height": int(pokemon["height"]),
                "weight": int(pokemon["weight"]),
                "types": types,
                "stats": stats,
                "total": sum(stats.values()),
                "abilities": abilities,
                "sprite": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{national_id}.png",
                "evolvesFrom": int(species_info["evolves_from_species_id"])
                if species_info["evolves_from_species_id"]
                else None,
            }
        )

    OUTPUT.write_text(
        "window.POKEDEX_SPECIES = "
        + json.dumps(species, ensure_ascii=False, separators=(",", ":"))
        + ";\nwindow.POKEDEX_MOVE_NAMES = "
        + json.dumps(move_names, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(
        f"Generadas {len(species)} especies en {OUTPUT.name}; "
        f"{sum(item['available'] for item in species)} habilitadas y "
        f"{sum(not item['available'] for item in species)} bloqueadas."
    )


if __name__ == "__main__":
    main()