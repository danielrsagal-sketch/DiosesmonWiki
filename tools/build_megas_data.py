"""Genera data/megas-data.js: las Megaevoluciones (y Regresiones Primigenias) del servidor.

Fuentes:
  - Cobblemon 1.7.3 (tools/build-cache/cobblemon-1.7.3-data.tar.gz): formas «Mega» de cada especie.
  - Mod Cobblemon: Mega Showdown (megapiedras clásicas, Megapulsera) y mod Navas ZA Megas
    (megas de Leyendas Z-A). Se leen de sus .jar en la carpeta mods de la instancia de CurseForge
    (o la ruta que se pase como argumento).
  - data/pokemon-data.js (nombres en español, tipos y estadísticas de la forma base).
Uso: python -I tools/build_megas_data.py [carpeta-de-mods]
"""
import csv
import io
import json
import re
import sys
import tarfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / "build-cache"
MODS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "curseforge/minecraft/Instances/Diosesmon Oficial - Lite/mods"
OUT = ROOT / "data" / "megas-data.js"
IMG = ROOT / "assets" / "img" / "megas"
sys.path.insert(0, str(ROOT / "tools"))
from diosesmon_config import is_available  # noqa: E402

TYPES = {"normal": "Normal", "fire": "Fuego", "water": "Agua", "grass": "Planta", "electric": "Eléctrico", "ice": "Hielo",
         "fighting": "Lucha", "poison": "Veneno", "ground": "Tierra", "flying": "Volador", "psychic": "Psíquico", "bug": "Bicho",
         "rock": "Roca", "ghost": "Fantasma", "dragon": "Dragón", "dark": "Siniestro", "steel": "Acero", "fairy": "Hada"}
STAT_KEYS = [("hp", "hp"), ("attack", "atk"), ("defence", "def"), ("special_attack", "spa"), ("special_defence", "spd"), ("speed", "spe")]


def find_jar(prefix):
    jars = sorted(MODS.glob(prefix + "*.jar"))
    if not jars:
        raise SystemExit(f"No encuentro {prefix}*.jar en {MODS}")
    return zipfile.ZipFile(jars[-1])


def species_data():
    text = (ROOT / "data" / "pokemon-data.js").read_text(encoding="utf-8")
    start = text.index("window.POKEDEX_SPECIES = ") + len("window.POKEDEX_SPECIES = ")
    end = text.index(";\n", start)
    return {entry["id"]: entry for entry in json.loads(text[start:end])}


def main():
    dex = species_data()
    by_identifier = {entry["identifier"].replace("-", ""): entry for entry in dex.values()}
    lang = json.loads((CACHE / "cobblemon-1.7.3-es_es.json").read_text(encoding="utf-8"))
    ms = find_jar("mega_showdown-fabric")
    za = find_jar("zamega-fabric")
    for jar in (ms, za):
        for name in jar.namelist():
            if name.endswith("lang/es_es.json"):
                lang.update(json.loads(jar.read(name).decode("utf-8")))

    # Formas de cada especie: Cobblemon, especies completas que sobrescribe Mega Showdown y formas añadidas por los mods.
    forms = {}  # nombre de especie (sin guiones) -> {"dex": n, "forms": [...]}
    with tarfile.open(CACHE / "cobblemon-1.7.3-data.tar.gz") as tar:
        for member in tar.getmembers():
            if re.search(r"/data/cobblemon/species/generation\d+/[^/]+\.json$", member.name):
                data = json.load(tar.extractfile(member))
                key = Path(member.name).stem
                forms[key] = {"dex": data.get("nationalPokedexNumber"), "forms": data.get("forms", [])}
    for jar in (ms, za):
        for name in jar.namelist():
            match = re.match(r"data/cobblemon/species/generation\d+/([^/]+)\.json$", name)
            if match:
                data = json.loads(jar.read(name))
                forms[match.group(1)] = {"dex": data.get("nationalPokedexNumber"), "forms": data.get("forms", [])}
        for name in jar.namelist():
            if name.startswith("data/cobblemon/species_additions/") and name.endswith(".json"):
                data = json.loads(jar.read(name))
                key = data.get("target", "").split(":")[-1]
                if not data.get("forms") or key not in forms:
                    continue
                existing = {form["name"]: index for index, form in enumerate(forms[key]["forms"])}
                for form in data["forms"]:
                    if form["name"] in existing:
                        forms[key]["forms"][existing[form["name"]]] = {**forms[key]["forms"][existing[form["name"]]], **form}
                    else:
                        forms[key]["forms"].append(form)

    # Megapiedras: qué especie y qué aspecto activan.
    stones = []
    for jar, namespace, source in ((ms, "mega_showdown", "clasica"), (za, "zamega", "za")):
        for name in jar.namelist():
            if re.match(rf"data/{namespace}/mega_showdown/mega/[^/]+\.json$", name):
                data = json.loads(jar.read(name))
                item_id = Path(name).stem
                aspect = next((item.split("=")[1] for item in data["aspect_conditions"]["apply"]["aspects"] if item.startswith("mega_evolution=")), "mega")
                apply = data["aspect_conditions"]["apply"]
                required = apply.get("required_aspects") or apply.get("aspect", {}).get("required_aspects") or []
                stones.append({"id": item_id, "namespace": namespace, "source": source,
                               "species": [re.sub(r"[^a-z]", "", poke.lower()) for poke in data["pokemons"]], "aspect": aspect,
                               "required": [item for group in required for item in group]})

    # Sprites y artwork: id de la forma en PokéAPI.
    pokeapi = {}
    with open(CACHE / "pokeapi-pokemon.csv", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            pokeapi[row["identifier"]] = int(row["id"])

    NEW_ABILITIES = {
        "megasol": ("Mega Sol", "Sus movimientos se usan como si hiciera un día soleado."),
        "dragonize": ("Dragonización", "Los movimientos de tipo Normal pasan a ser de tipo Dragón y su potencia aumenta un 20 %."),
        "piercingdrill": ("Taladro Perforante", "Sus movimientos de contacto atraviesan las protecciones del rival y le hacen 1/4 del daño normal."),
        "spicyspray": ("Rocío Picante", "Al recibir daño de un movimiento, quema al atacante."),
    }

    def ability(key):
        if key in NEW_ABILITIES:
            name, desc = NEW_ABILITIES[key]
            return {"id": key, "name": name, "desc": desc}
        return {"id": key, "name": lang.get(f"cobblemon.ability.{key}", key), "desc": lang.get(f"cobblemon.ability.{key}.desc", "")}

    IMG.mkdir(parents=True, exist_ok=True)
    megas = []
    for species_key, info in forms.items():
        for form in info["forms"]:
            aspects = form.get("aspects", [])
            labels = form.get("labels", [])
            is_mega = any(a.startswith("mega") for a in aspects) or "mega" in labels
            is_primal = "primal" in aspects or "primal" in labels or form["name"].lower() == "primal"
            if not (is_mega or is_primal) or "baseStats" not in form:
                continue
            national = info["dex"]
            base = dex.get(national)
            if not base:
                continue
            aspect = next((a for a in aspects if a.startswith("mega")), "primal" if is_primal else "mega")
            stone = next((s for s in stones if species_key in s["species"] and s["aspect"] == aspect), None)
            suffix = {"mega_x": " X", "mega_y": " Y", "mega_z": " Z"}.get(aspect, "")
            name = (f"{base['name']} Primigenio" if is_primal else f"Mega {base['name']}{suffix}")
            ident = f"{base['identifier']}-{'primal' if is_primal else 'mega'}{suffix.strip().lower() and '-' + suffix.strip().lower()}"
            api = pokeapi.get(ident) or pokeapi.get(ident.replace(f"{base['identifier']}-", f"{base['identifier']}-male-"))
            stats = {short: form["baseStats"][long] for long, short in STAT_KEYS}
            types = [TYPES[t] for t in (form.get("primaryType"), form.get("secondaryType")) if t]
            entry = {
                "key": ident,
                "dex": national,
                "name": name,
                "base": base["name"],
                "kind": "primal" if is_primal else "mega",
                "source": stone["source"] if stone else ("za" if species_key in {s for st in stones if st["source"] == "za" for s in st["species"]} and aspect == "mega_z" else "clasica"),
                "available": is_available(national),
                "types": types or base["types"],
                "baseTypes": base["types"],
                "stats": stats,
                "baseStats": {"hp": base["stats"]["hp"], "atk": base["stats"]["attack"], "def": base["stats"]["defense"], "spa": base["stats"]["specialAttack"], "spd": base["stats"]["specialDefense"], "spe": base["stats"]["speed"]},
                "abilities": [ability(a) for a in dict.fromkeys(raw.split(":")[-1] for raw in form.get("abilities", []))],
                "height": form.get("height"),
                "weight": form.get("weight"),
                "pokeapi": api,
            }
            if stone:
                texture = f"assets/{stone['namespace']}/textures/item/{stone['id']}.png"
                jar = ms if stone["namespace"] == "mega_showdown" else za
                target = IMG / f"{stone['id']}.png"
                if texture in jar.namelist():
                    target.write_bytes(jar.read(texture))
                entry["stone"] = {"id": stone["id"], "name": lang.get(f"item.{stone['namespace']}.{stone['id']}") or stone["id"].replace("_", " ").title(),
                                  "icon": f"assets/img/megas/{stone['id']}.png" if target.exists() else None}
                if "complete-percent" in stone["required"]:
                    entry["note"] = "Solo Zygarde en su Forma Completa puede Megaevolucionar."
                if "flower-eternal" in stone["required"]:
                    entry["note"] = "Solo Floette de la Flor Eterna puede Megaevolucionar."
            megas.append(entry)

    # Quita duplicados (la misma forma en dos fuentes) y ordena por Pokédex.
    unique = {}
    for entry in megas:
        unique[entry["key"]] = entry
    megas = sorted(unique.values(), key=lambda e: (e["dex"], e["name"]))
    for entry in megas:
        if entry["key"] in {"rayquaza-mega"}:
            entry["note"] = "No necesita megapiedra: Rayquaza tiene que conocer el movimiento Ascenso Draco."
        elif entry["kind"] == "primal":
            entry["note"] = "Regresión Primigenia: se activa sola al entrar en combate llevando su orbe."

    bracelet = {"name": lang.get("item.mega_showdown.mega_bracelet", "Megapulsera").replace("§d", ""),
                "keystone": lang.get("item.mega_showdown.keystone", "Piedra activadora")}
    for texture, name in (("assets/mega_showdown/textures/item/keystone.png", "keystone.png"),):
        if texture in ms.namelist():
            (IMG / name).write_bytes(ms.read(texture))
    dump = lambda value: json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(
        "// Generado por tools/build_megas_data.py (Cobblemon 1.7.3 + Mega Showdown + Navas ZA Megas). No editar a mano.\n"
        f"window.DIOSESMON_MEGAS = {dump({'megas': megas, 'bracelet': bracelet})};\n",
        encoding="utf-8",
    )
    counts = {}
    for entry in megas:
        counts[(entry["source"], entry["available"])] = counts.get((entry["source"], entry["available"]), 0) + 1
    print(f"{len(megas)} formas ->", counts, "| sin piedra:", [e["name"] for e in megas if "stone" not in e], "| sin sprite:", [e["name"] for e in megas if not e["pokeapi"]])


if __name__ == "__main__":
    main()
