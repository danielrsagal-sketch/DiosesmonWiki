"""Genera data/bayas-data.js (bayas y abonos de Cobblemon 1.7.3) y descarga los sprites.

Uso (desde la carpeta de la wiki):
    python -I tools/build_bayas_data.py

Fuentes (solo lectura):
  - tools/build-cache/cobblemon-1.7.3-data.tar.gz  (data/cobblemon/berries, recipes, species, mechanics)
  - tools/build-cache/cobblemon-1.7.3-es_es.json   (nombres oficiales en español)
  - tools/build_cobblemon_data.py                  (TAG_NAMES: nombres de etiquetas de bioma)
  - data/pokemon-details.js / pokemon-biomes.js    (biomas de cada etiqueta y sus nombres)
  - data/pesca-data.js                             (efecto de cada baya como cebo en la Poké Caña)
  - Sprites: GitLab cable-mc/cobblemon, tag 1.7.3, assets/cobblemon/textures/item/{berries,mulches}

Mecánica comprobada en el código de Cobblemon 1.7.3 (BerryBlockEntity, BerryBlock, Berry, MulchVariant):
  - growthTime/refreshRate están en MINUTOS (ticksPerMinute = 1200); al iniciar cada ciclo el juego
    multiplica el rango por 1,4 (x14/10) y lo reparte entre las etapas.
  - Abono Rápido: tiempo x0,5 (5 ciclos). Abono Fértil: +1-2 bayas (5 cosechas).
    Abono Sorpresa: probabilidad de mutación 12,5 % -> 50 % (3 intentos). Los otros cinco no caducan.
  - Abono favorito: da la bonificación de bioma preferido (+0-1 baya) aunque el árbol esté fuera de su bioma.
  - Mutación: al florecer (etapa 3) mira los 4 vecinos (N, S, E, O); 125/1000 de probabilidad.
"""
import ast
import json
import re
import sys
import tarfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
import sys as _sys
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from diosesmon_config import AVAILABLE_THROUGH  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FUSION = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT
CACHE = FUSION / "tools" / "build-cache"
TARBALL = CACHE / "cobblemon-1.7.3-data.tar.gz"
OUT = ROOT / "data" / "bayas-data.js"
IMG = ROOT / "assets" / "img" / "bayas"
GITLAB = "https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository"
TEXTURE_ROOT = "common/src/main/resources/assets/cobblemon/textures/item"

FLAVOURS = {"SPICY": "Picante", "DRY": "Seco", "SWEET": "Dulce", "BITTER": "Amargo", "SOUR": "Ácido"}
# Color del tinte de Minecraft de cada «colour» (se usa solo como acento).
COLOURS = {
    "RED": ("Rojo", "#c8312b"), "YELLOW": ("Amarillo", "#f3cf3a"), "PINK": ("Rosa", "#f38bb0"),
    "LIME": ("Lima", "#80c71f"), "PURPLE": ("Morado", "#8932b8"), "ORANGE": ("Naranja", "#f9801d"),
    "GREEN": ("Verde", "#5e7c16"), "BLUE": ("Azul", "#3c44aa"), "LIGHT_BLUE": ("Azul claro", "#3ab3da"),
    "CYAN": ("Cian", "#169c9c"), "BROWN": ("Marrón", "#835432"), "MAGENTA": ("Magenta", "#c74ebd"),
    "WHITE": ("Blanco", "#e9ecec"),
}
TYPES = {
    "normal": ("Normal", "#9fa19f"), "fire": ("Fuego", "#e62829"), "water": ("Agua", "#2980ef"),
    "electric": ("Eléctrico", "#d8b400"), "grass": ("Planta", "#3fa129"), "ice": ("Hielo", "#3dcef3"),
    "fighting": ("Lucha", "#ff8000"), "poison": ("Veneno", "#9141cb"), "ground": ("Tierra", "#915121"),
    "flying": ("Volador", "#81b9ef"), "psychic": ("Psíquico", "#ef4179"), "bug": ("Bicho", "#91a119"),
    "rock": ("Roca", "#afa981"), "ghost": ("Fantasma", "#704170"), "dragon": ("Dragón", "#5060e1"),
    "dark": ("Siniestro", "#624d4e"), "steel": ("Acero", "#60a1b8"), "fairy": ("Hada", "#ef70ef"),
}
STATS = {"hp": "PS", "atk": "Ataque", "def": "Defensa", "spa": "At. Esp.", "spd": "Def. Esp.", "spe": "Velocidad"}

CATEGORIES = {
    "heal": "Curar PS", "status": "Curar estado", "pp": "Restaurar PP", "ev": "Bajar EVs",
    "resist": "Reducir daño de un tipo", "boost": "Potenciar en combate", "counter": "Contraataque",
    "none": "Sin efecto en combate",
}

RESIST = {
    "occa": "fire", "passho": "water", "wacan": "electric", "rindo": "grass", "yache": "ice", "chople": "fighting",
    "kebia": "poison", "shuca": "ground", "coba": "flying", "payapa": "psychic", "tanga": "bug", "charti": "rock",
    "kasib": "ghost", "haban": "dragon", "colbur": "dark", "babiri": "steel", "roseli": "fairy", "chilan": "normal",
}
EV_BERRIES = {"pomeg": "hp", "kelpsy": "atk", "qualot": "def", "hondew": "spa", "grepa": "spd", "tamato": "spe"}
PINCH = {"liechi": "atk", "ganlon": "def", "salac": "spe", "petaya": "spa", "apicot": "spd"}
NATURE_HEAL = {"figy": "atk", "wiki": "spa", "mago": "spe", "aguav": "spd", "iapapa": "def"}
STATUS = {
    "cheri": "Cura la parálisis.", "chesto": "Despierta al portador si se duerme.", "pecha": "Cura el envenenamiento.",
    "rawst": "Cura las quemaduras.", "aspear": "Descongela al portador.", "persim": "Cura la confusión.",
    "touga": "Cura la confusión.", "lum": "Cura cualquier problema de estado y la confusión.",
    "eggant": "Cura el enamoramiento.",
}
OTHER = {
    "oran": ("heal", "Recupera 10 PS cuando le queda la mitad de los PS o menos."),
    "sitrus": ("heal", "Recupera 1/4 de los PS máximos cuando le queda la mitad o menos."),
    "enigma": ("heal", "Recupera 1/4 de los PS máximos al recibir un ataque supereficaz."),
    "leppa": ("pp", "Restaura 10 PP al primer movimiento que se quede sin PP."),
    "hopo": ("pp", "Restaura 10 PP al movimiento que elijas al dársela al Pokémon."),
    "starf": ("boost", "Sube mucho (2 niveles) una estadística al azar cuando le queda 1/4 de PS o menos."),
    "lansat": ("boost", "Aumenta el índice de golpe crítico (efecto Foco Energía) con 1/4 de PS o menos."),
    "micle": ("boost", "Su siguiente movimiento tiene ×1,2 de precisión con 1/4 de PS o menos."),
    "custap": ("boost", "Actúa primero dentro de su prioridad cuando le queda 1/4 de PS o menos."),
    "kee": ("boost", "Sube 1 nivel la Defensa al recibir un ataque físico."),
    "maranga": ("boost", "Sube 1 nivel la Def. Esp. al recibir un ataque especial."),
    "jaboca": ("counter", "Si recibe un ataque físico, el atacante pierde 1/8 de sus PS máximos."),
    "rowap": ("counter", "Si recibe un ataque especial, el atacante pierde 1/8 de sus PS máximos."),
}
NO_BATTLE = "No se puede comer en combate: sirve de cebo y de condimento."

MULCHES = {
    # id: (duración, efecto, detalle)
    "growth": (5, "Reduce a la mitad el tiempo de crecimiento y de reposición.",
               "Al ponerlo divide entre dos lo que le falta al árbol. Se gasta tras 5 ciclos de crecimiento (cada ciclo empieza al plantar o al recolectar)."),
    "rich": (5, "Suma +1 o +2 bayas a la cosecha del árbol.",
             "La cantidad de bayas se decide cuando el árbol florece por primera vez (etapa 3): ponlo antes. "
             "Gasta un uso en cada cálculo de cosecha (5 usos)."),
    "surprise": (3, "Multiplica por 4 la probabilidad de mutar: del 12,5 % al 50 %.",
                 "La mutación se decide cuando el árbol florece por primera vez (etapa 3): ponlo antes. "
                 "Gasta un uso cada vez que lo intenta junto a una vecina compatible (3 usos)."),
    "coarse": (-1, "Abono favorito de algunas bayas.", None),
    "humid": (-1, "Abono favorito de algunas bayas.", None),
    "loamy": (-1, "Abono favorito de algunas bayas.", None),
    "peat": (-1, "Abono favorito de algunas bayas.", None),
    "sandy": (-1, "Abono favorito de algunas bayas.", None),
}
FAVOURITE_DETAIL = ("Si es el abono favorito de la baya, el árbol recibe la bonificación de su bioma preferido "
                    "(+0 a +1 baya) aunque esté plantado fuera de él. En su bioma preferido no se suma otra vez. "
                    "Con una baya que no lo tenga de favorito no hace nada. No caduca.")


def es(lang, key, fallback=""):
    return lang.get(key, fallback)


def read_js_object(path, var):
    source = path.read_text(encoding="utf-8")
    start = source.index(f"window.{var} = ") + len(f"window.{var} = ")
    value, _ = json.JSONDecoder().raw_decode(source[start:])
    return value


def tag_names():
    tree = ast.parse((FUSION / "tools" / "build_cobblemon_data.py").read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "TAG_NAMES" for t in node.targets):
            return ast.literal_eval(node.value)
    return {}


def build_effect(bid):
    if bid in RESIST:
        t = RESIST[bid]
        if bid == "chilan":
            return "resist", f"Reduce a la mitad el daño de un ataque de tipo {TYPES[t][0]}.", t
        return "resist", f"Reduce a la mitad el daño de un ataque supereficaz de tipo {TYPES[t][0]}.", t
    if bid in EV_BERRIES:
        return "ev", f"Baja 10 EVs de {STATS[EV_BERRIES[bid]]} y sube la amistad. No se come en combate.", None
    if bid in PINCH:
        stat = PINCH[bid]
        article = "el" if stat in ("atk", "spa") else "la"
        return "boost", f"Sube 1 nivel {article} {STATS[stat]} cuando le queda 1/4 de PS o menos.", None
    if bid in NATURE_HEAL:
        return "heal", f"Recupera 1/3 de los PS máximos con 1/4 de PS o menos; confunde si su naturaleza baja {STATS[NATURE_HEAL[bid]]}.", None
    if bid in STATUS:
        return "status", STATUS[bid], None
    if bid in OTHER:
        cat, text = OTHER[bid]
        return cat, text, None
    return "none", NO_BATTLE, None


def field_use(bid, mech):
    """Uso desde el inventario fuera de combate (clases de CobblemonItems)."""
    if bid == "oran":
        return f"Dásela a un Pokémon para curarle {mech['oranRestoreAmount']} PS."
    if bid == "sitrus":
        return "Dásela a un Pokémon para curarle un 33 % de sus PS máximos."
    if bid in NATURE_HEAL:
        return "Dásela a un Pokémon para curarle un 33 % de sus PS máximos."
    if bid in ("leppa", "hopo"):
        return f"Dásela a un Pokémon para restaurar {mech['ppRestoreAmount']} PP a un movimiento."
    if bid in ("cheri", "chesto", "pecha", "rawst", "aspear", "persim", "lum", "eggant"):
        return "Dásela a un Pokémon para curarle el estado."
    if bid in EV_BERRIES:
        return (f"Dásela a un Pokémon: baja {mech['evLowerAmount']} EVs de {STATS[EV_BERRIES[bid]]} y sube la amistad "
                "(+10 si tiene menos de 100, +5 si menos de 200, +1 si más).")
    return None


def gitlab_texture_index():
    paths, page = {}, 1
    while True:
        query = urllib.parse.urlencode({"path": TEXTURE_ROOT, "ref": "1.7.3", "recursive": "true", "per_page": 100, "page": page})
        batch = json.load(urllib.request.urlopen(f"{GITLAB}/tree?{query}", timeout=30))
        if not batch:
            return paths
        for entry in batch:
            if entry["type"] == "blob" and entry["path"].endswith(".png") and ("/berries/" in entry["path"] or "/mulches/" in entry["path"]):
                paths[Path(entry["path"]).stem] = entry["path"]
        page += 1


def download_icons(names):
    """Descarga las texturas que falten en assets/img/bayas y devuelve {nombre: ruta relativa}."""
    IMG.mkdir(parents=True, exist_ok=True)
    icons, index = {}, None
    for name in sorted(names):
        target = IMG / f"{name}.png"
        if not target.exists():
            index = index if index is not None else gitlab_texture_index()
            if name not in index:
                print("  sin textura:", name)
                continue
            url = f"{GITLAB}/files/{urllib.parse.quote(index[name], safe='')}/raw?ref=1.7.3"
            try:
                target.write_bytes(urllib.request.urlopen(url, timeout=30).read())
            except urllib.error.HTTPError as error:
                print("  error", error.code, name)
                continue
        icons[name] = target.relative_to(ROOT).as_posix()
    return icons


def main():
    lang = json.loads((CACHE / "cobblemon-1.7.3-es_es.json").read_text(encoding="utf-8-sig"))
    mc_lang = json.loads((CACHE / "minecraft-1.21.1-es_es.json").read_text(encoding="utf-8-sig"))
    tags = tag_names()
    biome_tags = read_js_object(FUSION / "data" / "pokemon-details.js", "POKEDEX_BIOME_TAGS")
    biome_names = {row[0]: row[1] for row in read_js_object(FUSION / "data" / "pokemon-biomes.js", "POKEDEX_BIOME_INDEX")["biomes"]}
    baits = {b["item"]: b["effects"] for b in read_js_object(FUSION / "data" / "pesca-data.js", "FISHING_BAITS")}

    raw, recipes, drops, mech = {}, {}, {}, {}
    with tarfile.open(TARBALL) as tar:
        for member in tar.getmembers():
            if not member.isfile() or not member.name.endswith(".json"):
                continue
            name = member.name.split("/data/cobblemon/", 1)[-1]
            if name.startswith("berries/"):
                raw[Path(name).stem.removesuffix("_berry")] = json.loads(tar.extractfile(member).read())
            elif name.startswith("recipe/") and "mulch" in name:
                recipes[Path(name).stem] = json.loads(tar.extractfile(member).read())
            elif name == "mechanics/berries.json":
                mech = json.loads(tar.extractfile(member).read())
            elif name.startswith("species/"):
                species = json.loads(tar.extractfile(member).read())
                dex = species.get("nationalPokedexNumber", 9999)
                if dex > AVAILABLE_THROUGH:
                    continue  # Diosesmon: solo las generaciones activas.
                for entry in (species.get("drops") or {}).get("entries", []):
                    item = entry.get("item", "")
                    if item.endswith("_berry"):
                        drops.setdefault(item, []).append({"name": species["name"], "dex": dex, "chance": entry.get("percentage", 100)})

    # Mutaciones: el JSON de cada baya dice {pareja: resultado}. Se unen ambos sentidos.
    pairs = {}
    for bid, data in raw.items():
        for partner, result in data.get("mutations", {}).items():
            p = partner.split(":")[1].removesuffix("_berry")
            r = result.split(":")[1].removesuffix("_berry")
            key = tuple(sorted((bid, p)))
            if key in pairs and pairs[key] != r:
                print("  mutación incoherente", key, pairs[key], r)
            pairs[key] = r
    mutations = [{"a": a, "b": b, "result": r} for (a, b), r in sorted(pairs.items(), key=lambda kv: (kv[1], kv[0]))]

    icons = download_icons([f"{bid}_berry" for bid in raw] + [f"{m}_mulch" for m in MULCHES] + ["mulch_base"])

    def tag_info(tag):
        info = biome_tags.get(tag, {})
        return {"tag": tag, "name": tags.get(tag) or info.get("name") or tag.split(":")[-1],
                "biomes": sorted({biome_names.get(b, b) for b in info.get("biomes", [])})}

    used_tags = {}
    berries = []
    for bid in sorted(raw, key=lambda b: es(lang, f"item.cobblemon.{b}_berry")):
        data = raw[bid]
        cat, effect, rtype = build_effect(bid)
        for tag in data.get("preferredBiomeTags", []):
            used_tags.setdefault(tag, tag_info(tag))
        wild = []
        for cond in data.get("spawnConditions", []):
            variant = cond["variant"].split(":")[1]
            entry = {"type": variant, "grove": [cond.get("minGroveSize"), cond.get("maxGroveSize")]}
            if variant == "specific_biome":
                entry["tag"] = cond["biome"]
                used_tags.setdefault(cond["biome"], tag_info(cond["biome"]))
            wild.append(entry)
        bonus = [g.get("bonusYield", {}) for g in data.get("growthFactors", []) if g.get("variant") == "cobblemon:preferred_biome"]
        flav = data.get("flavours", {})
        top = max(flav.values()) if flav else 0
        item = f"cobblemon:{bid}_berry"
        berries.append({
            "id": bid,
            "item": item,
            "name": es(lang, f"item.cobblemon.{bid}_berry", bid),
            "sprite": icons.get(f"{bid}_berry"),
            "category": cat,
            "type": rtype,
            "effect": effect,
            "tooltip": es(lang, f"item.cobblemon.{bid}_berry.tooltip_1") or es(lang, f"item.cobblemon.{bid}_berry.tooltip"),
            "fieldUse": field_use(bid, mech),
            "yield": [data["baseYield"]["min"], data["baseYield"]["max"]],
            "maxFruits": len(data.get("growthPoints", [])),
            "growth": [data["growthTime"]["min"], data["growthTime"]["max"]],
            "refresh": [data["refreshRate"]["min"], data["refreshRate"]["max"]],
            "mulches": data.get("favoriteMulches", []),
            "biomes": data.get("preferredBiomeTags", []),
            "biomeBonus": [bonus[0].get("min", 0), bonus[0].get("max", 0)] if bonus else None,
            "wild": wild,
            "flavours": {k: flav[k] for k in FLAVOURS if k in flav},
            "flavourTotal": sum(flav.values()),
            "dominant": [k for k in FLAVOURS if flav.get(k) == top and top > 0],
            "colour": data.get("colour"),
            "boneMeal": data.get("boneMealChance"),
            "weight": data.get("weight"),
            "bait": baits.get(item, []),
            "drops": sorted(drops.get(item, []), key=lambda d: (-d["chance"], d["dex"])),
        })

    def item_label(ingredient):
        if "tag" in ingredient:
            return {"c:fertilizers": "Fertilizante (harina de huesos)"}.get(ingredient["tag"], ingredient["tag"])
        ns, path = ingredient["item"].split(":")
        if ns == "cobblemon":
            return es(lang, f"item.cobblemon.{path}", path)
        return mc_lang.get(f"item.minecraft.{path}") or mc_lang.get(f"block.minecraft.{path}") or path

    def recipe(rid):
        r = recipes.get(rid)
        if not r:
            return None
        return {"ingredients": [item_label(i) for i in r.get("ingredients", [])], "count": r.get("result", {}).get("count", 1)}

    mulches = [{
        "id": "base", "item": "cobblemon:mulch_base", "name": es(lang, "item.cobblemon.mulch_base"), "sprite": icons.get("mulch_base"),
        "duration": None, "effect": "Ingrediente base: no se pone en los árboles, se combina para crear los demás abonos.",
        "detail": None, "recipe": recipe("mulch_base"), "favoriteOf": [],
    }]
    for mid, (duration, effect, detail) in MULCHES.items():
        mulches.append({
            "id": mid, "item": f"cobblemon:{mid}_mulch", "name": es(lang, f"item.cobblemon.{mid}_mulch"),
            "sprite": icons.get(f"{mid}_mulch"), "duration": duration, "effect": effect,
            "detail": detail or FAVOURITE_DETAIL, "favourite": detail is None,
            "recipe": recipe(f"{mid}_mulch"),
            "favoriteOf": [b["id"] for b in berries if mid in b["mulches"]],
        })

    payload = {
        "source": "Cobblemon 1.7.3 (datos del mod y código de BerryBlockEntity/BerryBlock/MulchVariant)",
        "units": {"time": "minutos", "ticksPerMinute": 1200, "cycleMultiplier": 1.4},
        "mechanics": {
            "mutationChance": 0.125, "surpriseMultiplier": 4, "growthMulchMultiplier": 0.5,
            "richBonus": [1, 2], "evLower": int(mech.get("evLowerAmount", 10)), "ppRestore": int(mech.get("ppRestoreAmount", 10)),
            "flavourThresholds": {"15": 1, "35": 2, "45": 3, "55": 4, "75": 5, "105": 6},
        },
        "flavours": FLAVOURS,
        "colours": {k: {"name": v[0], "hex": v[1]} for k, v in COLOURS.items()},
        "types": {k: {"name": v[0], "hex": v[1]} for k, v in TYPES.items()},
        "categories": CATEGORIES,
        "tags": used_tags,
        "berries": berries,
        "mulches": mulches,
        "mutations": mutations,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "// Generado por tools/build_bayas_data.py desde Cobblemon 1.7.3. No editar a mano.\n"
        "// Tiempos (growth/refresh) en minutos tal como vienen en el mod; el juego los multiplica por 1,4 en cada ciclo.\n"
        f"window.BAYAS_DATA = {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    print(f"{len(berries)} bayas, {len(mulches)} abonos, {len(mutations)} mutaciones, {len(icons)} sprites -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
