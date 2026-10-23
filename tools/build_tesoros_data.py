"""Genera data/tesoros-data.js con los gachapones (Tesoros) de Diosesmon.

Fuente: capturas del menú de Tesoros (capturar_kits.py), en extra/PaginaDioses/Tesoros (o en Descargas).
- Objetos: se recorta su slot de la captura (como se ve en el juego).
- Skins: se recorta la vista previa 3D del modelo.
- Pokémon legendarios: sprites de PokéAPI (normal y shiny).
Los nombres y porcentajes se copiaron a mano de los tooltips.
Uso: python tools/build_tesoros_data.py
"""
import csv
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCES = [ROOT / "extra" / "PaginaDioses" / "Tesoros", Path.home() / "Downloads" / "PaginaDioses" / "DiosesmonKits" / "tesoros"]
SOURCE = next((path for path in SOURCES if path.exists()), SOURCES[0])
IMG = ROOT / "assets" / "img" / "tesoros"
HOVER = (182, 221, 248)
MODEL_BOX = (704, 340, 1232, 850)

# Gacha Diario (carpeta Kit_01), en el orden de las capturas.
DAILY = [
    ("Gracídea", .30), ("Gran Griseosfera", .30), ("Gran Diamansfera", .30), ("Gran Lustresfera", .30), ("Manuscrito Sombras", .30),
    ("Manuscrito Aguas", .30), ("Prisma Rojo", .30), ("Prisma Azul", .30), ("Vasija Castigo", .30), ("Cápsula Habilidad", .30),
    ("Punta ADN", .30), ("20 DiosesCoins", .30), ("4 Caramelos XL", 1.70), ("3.000$ PokéDólares", 1.70), ("Proteína x6", 1.70),
    ("Carburante x6", 1.70), ("Calcio x6", 1.70), ("Hierro x6", 1.70), ("Zinc x6", 1.70), ("8 DiosesCoins", 1.70),
    ("Ultra Ball x64", 1.70), ("Repartir EXP", 1.70), ("3 Caramelos Raros", 5.00), ("2.000$ PokéDólares", 5.00), ("Máquina de Curación", 5.00),
    ("PC", 5.00), ("Huevo Suerte", 5.00), ("Super Ball x32", 5.00), ("750$ PokéDólares", 5.49), ("Poké Ball x32", 5.49),
    ("Super Ball x16", 5.49), ("Ultra Ball x8", 5.49), ("DT Vacío", 5.49), ("Piedra Trueno", 5.49), ("Piedra Agua", 5.49),
    ("Piedra Fuego", 5.49), ("Cable Link", 5.49),
]
# Gachapon (carpeta Kit_06).
GACHAPON = [
    ("Botas Gruesas", .60), ("Chaleco Asalto", .60), ("Gafas Elección", .60), ("Pañuelo Elección", .60), ("Amuleto Puro", .60),
    ("Master Ball", .60), ("DT: Voltio Cruel", 5.95), ("DT: Roca Afilada", 5.95), ("DT: Carantoña", 5.95), ("Vidaesfera", .60),
    ("Globo Helio", 10.12), ("Llamaesfera", .60), ("Lodo Negro", 5.95), ("Botón Escape", 10.12), ("Lupa", .60), ("Repartir EXP", 5.95),
    ("Caramelo Raro", 19.05), ("Caramelo XL", 6.55), ("Pico de Diamante 3x3", 2.38), ("Pala de Diamante 3x3", 2.38),
    ("Casco EEVEE", 1.79), ("Pechera EEVEE", 1.79), ("Pantalones EEVEE", 1.79), ("Botas EEVEE", 1.79),
    ("Casco GRENINJA", 1.79), ("Pechera GRENINJA", 1.79), ("Pantalones GRENINJA", 1.79), ("Botas GRENINJA", 1.79),
]
LEGENDARIES = [
    "arceus", "articuno", "celebi", "chien-pao", "cobalion", "cosmoem", "cosmog", "cresselia", "entei", "genesect", "heatran", "ho-oh",
    "kubfu", "landorus-incarnate", "latias", "latios", "lugia", "magearna", "marshadow", "melmetal", "moltres", "mewtwo", "mew", "meltan",
    "meloetta-aria", "pecharunt", "raikou", "regice", "regidrago", "regieleki", "regigigas", "regirock", "registeel", "shaymin-land",
    "suicune", "tapu-bulu", "tapu-fini", "tapu-koko", "tapu-lele", "terrakion", "yveltal", "xerneas", "victini", "tornadus-incarnate",
    "thundurus-incarnate", "zapdos", "kyogre", "rayquaza", "groudon", "zarude", "jirachi", "deoxys-normal", "zygarde-50",
]
# Disfraz Rocket (Kit_04): las 11 primeras capturas son normales y las 11 siguientes, shiny.
ROCKET = ["Charizard", "Blastoise", "Gengar", "Garchomp", "Sceptile", "Gliscor", "Wobbuffet", "Persian", "Haxorus", "Scizor", "Lapras"]
# Safari (Kit_07, capturas 02–24): skins como objeto.
SAFARI = [
    ("Ho-Oh", 2.06), ("Charizard", 2.06), ("Gengar Morado", 2.06), ("Staraptor", 2.06), ("Metagross", 2.06), ("Arcanine", 2.06), ("Gardevoir", 2.06),
    ("Flygon", 3.70), ("Magmortar", 3.70), ("Meganium", 3.70), ("Snorlax", 3.70), ("Sceptile", 3.70), ("Umbreon", 3.70), ("Weavile", 3.70), ("Gengar Montaña", 3.70),
    ("Absol", 7.00), ("Scizor", 7.00), ("Rhyperior", 7.00), ("Steelix", 7.00), ("Vileplume", 7.00), ("Vespiquen", 7.00), ("Sandslash", 7.00), ("Walrein", 7.00),
]
FRIKI = ["Machamp", "Garchomp", "Kangaskhan", "Ditto Chico", "Ditto Chica", "Snorlax", "Weavile", "Tyranitar", "Gardevoir", "Empoleon", "Infernape", "Dusknoir", "Froslass"]


# Iconos mejores que el recorte: textura del juego (cobblemon:/minecraft:), sprite de PokéAPI (pokeapi:) o icono ya usado en Kits.
POKEAPI_ITEMS = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items"
ICONS = {
    "Gracídea": "pokeapi:gracidea", "Prisma Rojo": "pokeapi:red-orb", "Prisma Azul": "pokeapi:blue-orb", "Punta ADN": "pokeapi:dna-splicers",
    "Manuscrito Sombras": "cobblemon:scroll_of_darkness", "Manuscrito Aguas": "cobblemon:scroll_of_waters", "Cápsula Habilidad": "cobblemon:ability_capsule",
    "20 DiosesCoins": "pokeapi:nugget", "8 DiosesCoins": "pokeapi:nugget", "3.000$ PokéDólares": "pokeapi:coupon-1", "2.000$ PokéDólares": "pokeapi:coupon-1",
    "750$ PokéDólares": "pokeapi:coupon-1", "4 Caramelos XL": "cobblemon:exp_candy_xl", "3 Caramelos Raros": "cobblemon:rare_candy",
    "Proteína x6": "cobblemon:protein", "Carburante x6": "cobblemon:carbos", "Calcio x6": "cobblemon:calcium", "Hierro x6": "cobblemon:iron",
    "Zinc x6": "cobblemon:zinc", "Ultra Ball x64": "cobblemon:ultra_ball", "Ultra Ball x8": "cobblemon:ultra_ball", "Repartir EXP": "cobblemon:exp_share",
    "Huevo Suerte": "cobblemon:lucky_egg", "Super Ball x32": "cobblemon:great_ball", "Super Ball x16": "cobblemon:great_ball", "Poké Ball x32": "cobblemon:poke_ball",
    "Piedra Trueno": "cobblemon:thunder_stone", "Piedra Agua": "cobblemon:water_stone", "Piedra Fuego": "cobblemon:fire_stone", "Cable Link": "cobblemon:link_cable",
    "Botas Gruesas": "cobblemon:heavy_duty_boots", "Chaleco Asalto": "cobblemon:assault_vest", "Gafas Elección": "cobblemon:choice_specs",
    "Pañuelo Elección": "cobblemon:choice_scarf", "Amuleto Puro": "cobblemon:clear_amulet", "Master Ball": "cobblemon:master_ball",
    "Vidaesfera": "cobblemon:life_orb", "Globo Helio": "cobblemon:air_balloon", "Llamaesfera": "cobblemon:flame_orb", "Lodo Negro": "cobblemon:black_sludge",
    "Botón Escape": "cobblemon:eject_button", "Lupa": "cobblemon:wide_lens", "Caramelo Raro": "cobblemon:rare_candy", "Caramelo XL": "cobblemon:exp_candy_xl",
    "Pico de Diamante 3x3": "minecraft:diamond_pickaxe", "Pala de Diamante 3x3": "minecraft:diamond_shovel",
    "DT Vacío": "pokeapi:tm-normal", "DT: Voltio Cruel": "pokeapi:tm-electric", "DT: Roca Afilada": "pokeapi:tm-rock", "DT: Carantoña": "pokeapi:tm-fairy",
    "Casco EEVEE": "kits:diosesmon-client_eevee_helmet", "Pechera EEVEE": "kits:diosesmon-client_eevee_chestplate",
    "Pantalones EEVEE": "kits:diosesmon-client_eevee_leggings", "Botas EEVEE": "kits:diosesmon-client_eevee_boots",
}


def better_icon(name, textures):
    source = ICONS.get(name)
    if not source:
        return None
    kind, _, value = source.partition(":")
    if kind == "pokeapi":
        return {"icon": f"{POKEAPI_ITEMS}/{value}.png", "flat": True}
    if kind == "kits":
        return {"icon": f"assets/img/items/kits/{value}.png", "flat": False}
    path = textures.get(source)
    return {"icon": path, "flat": True} if path else None


def captures(folder):
    return sorted((SOURCE / folder).glob("*_item.png"))


def crop_slot(path, target):
    image = Image.open(path).convert("RGB")
    pixels = image.load()
    xs, ys = [], []
    for y in range(300, 800):
        for x in range(700, 1400):
            if pixels[x, y] == HOVER:
                xs.append(x)
                ys.append(y)
    if not xs:
        return False
    # El slot es cuadrado: se usa el alto del borde (el tooltip puede tener píxeles del mismo color a la derecha).
    left, top, bottom = min(xs), min(ys), max(ys)
    image.crop((left, top, left + bottom - top + 1, bottom + 1)).save(target)
    return True


def crop_model(path, target):
    image = Image.open(path).convert("RGB").crop(MODEL_BOX)
    image.thumbnail((360, 360))
    image.save(target, "WEBP", quality=85)


def slug(text):
    import re
    import unicodedata
    text = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def items_box(key, folder, entries):
    from build_fosiles_monturas import download_icons
    textures = download_icons({value for value in ICONS.values() if value.split(":")[0] in ("cobblemon", "minecraft")})
    out = []
    for path, (name, chance) in zip(captures(folder), entries):
        target = IMG / key / f"{slug(name)}.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            crop_slot(path, target)
        out.append({"name": name, "chance": chance, "icon": target.relative_to(ROOT).as_posix(), "flat": False, **(better_icon(name, textures) or {})})
    return out


def models_box(key, folder, names, start=0):
    out = []
    for path, name in zip(captures(folder)[start:], names):
        target = IMG / key / f"{slug(name)}.webp"
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            crop_model(path, target)
        out.append({"name": name, "image": target.relative_to(ROOT).as_posix()})
    return out


def main():
    with open(ROOT / "tools" / "build-cache" / "pokeapi-pokemon.csv", encoding="utf-8") as handle:
        pokeapi = {row["identifier"]: int(row["id"]) for row in csv.DictReader(handle)}
    species = {}
    for identifier in LEGENDARIES:
        pid = pokeapi[identifier]
        name = identifier.split("-")[0].capitalize() if identifier not in ("ho-oh", "chien-pao") and not identifier.startswith("tapu") else identifier.replace("-", " ").title().replace(" ", "-" if identifier in ("ho-oh", "chien-pao") else " ")
        species[identifier] = {"name": name, "id": pid}
    legend_list = [{"name": entry["name"], "id": entry["id"], "chance": 1.89} for entry in species.values()]

    rocket_models = models_box("rocket", "Kit_04", ROCKET) + models_box("rocket", "Kit_04", [f"{name} Shiny" for name in ROCKET], start=len(ROCKET))
    rocket = [dict(model, chance=0.57 if model["name"].endswith("Shiny") else 8.52, shiny=model["name"].endswith("Shiny")) for model in rocket_models]
    safari_models = models_box("safari", "Kit_07", [name for name, _ in SAFARI], start=1)
    safari = [dict(model, chance=chance) for model, (_, chance) in zip(safari_models, SAFARI)]
    friki = [dict(model, chance=7.69) for model in models_box("friki", "Kit_08", FRIKI)]

    boxes = [
        {"key": "gacha-diario", "name": "Gacha Diario", "color": "#ff6f8a", "kind": "items", "price": None,
         "keys": "1 llave gratis al día por jugar 1 hora en el servidor. Si no la usas en 24 horas se retira y vuelves a acumular tiempo.",
         "rewards": items_box("gacha-diario", "Kit_01", DAILY)},
        {"key": "legendario-shiny", "name": "Pokémon Legendario Shiny", "color": "#c9a6ff", "kind": "pokemon", "shiny": True, "price": 5175,
         "keys": "Llave a 5.175 DiosesCoins.", "note": "Te da el Pokémon legendario en su versión shiny.", "rewards": legend_list},
        {"key": "legendario", "name": "Pokémon Legendario", "color": "#ffd442", "kind": "pokemon", "price": 4289,
         "keys": "Llave a 4.289 DiosesCoins.", "note": "Los mismos legendarios que la caja Shiny, en su versión normal.", "rewards": legend_list},
        {"key": "rocket", "name": "Pokémon con Disfraz Rocket", "color": "#ff5a5a", "kind": "models", "price": None,
         "keys": "Sus llaves no se pueden comprar en el menú de Tesoros.",
         "note": "Te da el Pokémon con la skin del Team Rocket puesta. Cada uno tiene versión normal (8,52%) y shiny (0,57%).", "rewards": rocket},
        {"key": "habilidad-oculta", "name": "Pokémon con Habilidad Oculta", "color": "#7f6bff", "kind": "all", "price": 1949,
         "keys": "Llave a 1.949 DiosesCoins.", "note": "Puede tocar cualquier Pokémon de las generaciones 1 a 5, siempre con su habilidad oculta (unos 0,15% cada uno).", "rewards": []},
        {"key": "gachapon", "name": "Gachapon", "color": "#ff9fd6", "kind": "items", "price": 491,
         "keys": "Llave a 491 DiosesCoins.", "rewards": items_box("gachapon", "Kit_06", GACHAPON)},
        {"key": "safari", "name": "Safari", "color": "#9ce35a", "kind": "models", "price": None, "pricePoints": 1000,
         "keys": "Llave a 1.000 SP (puntos del Safari).",
         # Packs de llaves: [cantidad, precio en SP, % de descuento]
         "packs": [[1, 1000, 0], [3, 2700, 10], [5, 4200, 16]],
         "note": "Son skins como objeto: haz clic derecho al Pokémon correspondiente para ponérsela. No incluye el Pokémon.", "rewards": safari},
        {"key": "friki", "name": "Friki", "color": "#5ee1ff", "kind": "models", "price": 1800,
         "keys": "Llave a 1.800 DiosesCoins.", "note": "Skins divertidas para tus Pokémon.", "rewards": friki},
    ]
    for box in boxes:
        title = SOURCE / f"Kit_{boxes.index(box) + 1:02d}" / "00_titulo.png"
        target = IMG / f"{box['key']}.png"
        if title.exists() and not target.exists():
            image = Image.open(title).convert("RGB")
            image.crop((636, 434, 728, 526)).save(target)
        box["icon"] = target.relative_to(ROOT).as_posix()
    lines = ["// Generado por tools/build_tesoros_data.py desde las capturas del menú de Tesoros. No editar a mano."]
    lines.append(f"window.DIOSESMON_TREASURES = {json.dumps(boxes, ensure_ascii=False, separators=(',', ':'))};")
    (ROOT / "data" / "tesoros-data.js").write_text("\n".join(lines) + "\n", encoding="utf-8")
    for box in boxes:
        total = sum(reward["chance"] for reward in box["rewards"])
        print(f"{box['name']}: {len(box['rewards'])} recompensas, suma {total:.2f}%")


if __name__ == "__main__":
    main()
