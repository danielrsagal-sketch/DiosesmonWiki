"""Genera data/kits-data.js con los kits de rango y exclusivos de Diosesmon.

Fuente: extra/PaginaDioses/DiosesmonKits (JSON y capturas sacadas del juego con capturar_kits.py).
- Iconos de Minecraft y Cobblemon: texturas del juego (download_icons).
- Objetos propios del servidor (armaduras, herramientas…): se recorta su slot de la captura (con el fondo del menú).
- Skin de cada kit: la figura de la pantalla del kit.
Uso: python tools/build_kits_data.py
"""
import json
import urllib.request
from pathlib import Path

from PIL import Image

from build_fosiles_monturas import ROOT, download_icons

SOURCE = ROOT / "extra" / "PaginaDioses" / "DiosesmonKits"
KITS_IMG = ROOT / "assets" / "img" / "kits"
ITEMS_IMG = ROOT / "assets" / "img" / "items" / "kits"

# Kits de rango: carpeta de capturas y ventajas del rango (copiadas del tooltip del juego).
RANKS = [
    {"key": "usuario", "name": "Usuario", "folder": "Kit_01", "color": "#e8ecf4",
     "perks": ["Kit gratis para todos los jugadores", "Se reclama desde el menú de Kits (/kits)"]},
    {"key": "entrenador", "name": "Entrenador", "folder": "Kit_02", "color": "#ff5a5a", "coins": 100, "store": "https://tienda.diosesmon.net/package/7366162",
     "perks": ["Kit Entrenador cada 9 días", "Acceso sin cola al servidor", "Nuevo cosmético", "Apariencia VIP al escribir en el chat",
               "Prefijo del rango en Tab, Scoreboard y Chat", "Rango VIP en Discord con categoría privada"]},
    {"key": "as", "name": "AS", "folder": "Kit_04", "color": "#6f9bff", "coins": 150, "store": "https://tienda.diosesmon.net/package/7390770",
     "perks": ["Kit AS cada 9 días", "Acceso sin cola al servidor", "Puedes estar AFK sin que te expulsen", "Nuevo cosmético",
               "Prefijo del rango en Tab, Scoreboard y Chat", "Rango VIP en Discord con categoría privada"]},
    {"key": "lider", "name": "Líder", "folder": "Kit_05", "color": "#ffa64d", "coins": 200, "store": "https://tienda.diosesmon.net/package/7390785",
     "perks": ["Kit Líder cada 9 días", "/recompensa única del rango", "Acceso sin cola al servidor", "Nuevo cosmético",
               "Prefijo del rango en Tab, Scoreboard y Chat", "Rango VIP en Discord con categoría privada"]},
    {"key": "maestro", "name": "Maestro", "folder": "Kit_06", "color": "#b67bff", "coins": 300, "store": "https://tienda.diosesmon.net/package/7390795",
     "perks": ["Kit Maestro cada 9 días", "/recompensa única del rango", "No pierdes la experiencia al morir", "Acceso sin cola al servidor",
               "Nuevo cosmético", "Prefijo del rango en Tab, Scoreboard y Chat", "Rango VIP en Discord con categoría privada"]},
]
# Límites y comandos por rango (tienda.diosesmon.net). Columnas: sin rango, Entrenador, AS, Líder, Maestro.
RANK_COLUMNS = ["Sin rango", "Entrenador", "AS", "Líder", "Maestro"]
RANK_LIMITS = [
    ["Espera de crianza", ["25 min", "25 min", "20 min", "15 min", "10 min"]],
    ["Slots de crianza", ["2", "2", "2", "2", "4"]],
    ["Espera entre curas", ["Sin acceso", "8 min", "5 min", "2 min", "Sin espera"]],
    ["Espera de Wondertrade", ["30 min", "25 min", "25 min", "25 min", "20 min"]],
    ["Homes", ["1", "3", "4", "5", "7"]],
    ["Mochila virtual", ["9 espacios", "27 espacios", "36 espacios", "45 espacios", "54 espacios"]],
    ["Trabajos a la vez", ["1", "1", "1", "2", "3"]],
    ["Tasa de la GTS", ["10%", "10%", "8%", "6%", "4%"]],
]
# Primer rango (índice de RANK_COLUMNS) que desbloquea cada comando.
RANK_COMMANDS = [
    ["/pokeheal", 1], ["/pc", 1], ["/back", 2], ["/hat", 2], ["/afk", 2], ["/hatch", 3], ["/enderchest", 3], ["/near", 3],
    ["/feed", 3], ["/tpahere", 3], ["/repair", 4], ["/sit", 4], ["/tptoggle", 4], ["/nv", 4], ["/heal", 4],
]
EXCLUSIVES = [
    {"key": "eevee", "name": "Eevee", "folder": "Kit_01", "color": "#d39a5c", "specialty": "Minería (10/10)"},
    {"key": "sandslash", "name": "Sandslash", "folder": "Kit_02", "color": "#e8c45a", "specialty": "PvP (9/10)"},
    {"key": "sceptile", "name": "Sceptile", "folder": "Kit_03", "color": "#4fc06a", "specialty": "PvP y Minería (7/10)"},
    {"key": "metagross", "name": "Metagross", "folder": "Kit_04", "color": "#5aa8e0", "specialty": "PvP y Minería (8/10)"},
    {"key": "hooh", "name": "Ho-Oh", "folder": "Kit_05", "color": "#ff6a3d", "specialty": "PvP y Minería (10/10)"},
]
# Objetos de Minecraft cuyo icono es la textura de un bloque.
MINECRAFT_BLOCK_ICONS = {
    "minecraft:torch": "block/torch", "minecraft:glowstone": "block/glowstone", "minecraft:oak_log": "block/oak_log",
    "minecraft:grass_block": "block/grass_block_side", "minecraft:enchanted_golden_apple": "item/golden_apple",
}
MINECRAFT_TEXTURES = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.1/assets/minecraft/textures"
# Iconos de respaldo para objetos de otros mods cuyo slot no se ve en ninguna captura.
EXTERNAL_ICONS = {"simpletms:tr_blank": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png"}
FALLBACK_PARTS = ("helmet", "chestplate", "leggings", "boots", "sword", "pickaxe", "axe", "shovel", "hoe")
# Orden de las categorías en la página.
CATEGORIES = ["Armas", "Herramientas", "Armadura", "Pokéballs", "Curación", "Vitaminas", "Objetos de mejora",
              "Objetos equipables", "Objetos de evolución", "Bayas", "Especial", "Comida", "Recursos"]
CATEGORY_ALIASES = {"Poké Balls": "Pokéballs"}

# Rejilla del menú de kits en las capturas (1936×1048): bordes y fondos de los slots.
HOVER_BORDER = (181, 218, 244)
GRID_COLUMNS = [942 + 72 * column for column in range(5)]
GRID_BOX = (900, 400, 1330, 700)
SLOT = 65
SKIN_BOX = (782, 432, 910, 662)


_GRIDS = {}


def grid(path):
    """Zona de la rejilla de una captura (en caché: se reutiliza al comparar fondos)."""
    if path not in _GRIDS:
        _GRIDS[path] = Image.open(path).convert("RGB").crop(GRID_BOX)
    return _GRIDS[path]


def to_local(column, top):
    return column - GRID_BOX[0], top - GRID_BOX[1]


def hovered_slot(image):
    """Slot bajo el cursor (borde claro) en coordenadas de la rejilla, ajustado a sus columnas."""
    pixels = image.load()
    xs, ys = [], []
    for y in range(image.size[1]):
        for x in range(image.size[0]):
            if pixels[x, y] == HOVER_BORDER:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    left, top, right, bottom = min(xs), min(ys), max(xs), max(ys)
    # El tooltip puede tapar parte del borde: se ajusta a la columna y al alto del slot.
    columns = [column - GRID_BOX[0] for column in GRID_COLUMNS]
    column = min(columns, key=lambda start: min(abs(start - left), abs(start + SLOT - right)))
    if bottom - top < SLOT - 4 and not any(pixels[x, top] == HOVER_BORDER for x in range(column, column + SLOT)):
        top = bottom - SLOT
    return column, top


def slot_state(image, column, top):
    """None si el slot está tapado o no hay un slot en esa posición; si no, «hover» o «normal»."""
    pixels = image.load()
    dark = 0
    for y in range(top + 4, top + SLOT - 4, 2):
        for x in range(column + 4, column + SLOT - 4, 2):
            red, green, blue = pixels[x, y]
            if red < 40 and green < 30 and blue < 50:
                dark += 1
    edge = pixels[column + 8, top]
    above = pixels[column + 8, top - 2]
    if dark >= 12 or not (edge[2] > 200 and edge[2] - edge[0] > 25 and sum(above) < sum(edge) - 40):
        return None
    return "hover" if edge == HOVER_BORDER else "normal"


def same_scroll(first, second, slot):
    """True si dos capturas tienen la rejilla en el mismo scroll: las demás casillas visibles son iguales.
    (Un scroll de una fila entera deja los bordes en el mismo sitio, así que se compara el contenido.)"""
    column, top = slot
    columns = [start - GRID_BOX[0] for start in GRID_COLUMNS]
    tops = [top + 72 * step for step in range(-4, 5) if 2 <= top + 72 * step and top + 72 * step + SLOT < first.size[1]]
    compared = 0
    for cell_top in tops:
        for cell_column in columns:
            if (cell_column, cell_top) == (column, top):
                continue
            if slot_state(first, cell_column, cell_top) != "normal" or slot_state(second, cell_column, cell_top) != "normal":
                continue
            a = first.crop((cell_column + 4, cell_top + 4, cell_column + SLOT - 4, cell_top + SLOT - 4)).load()
            b = second.crop((cell_column + 4, cell_top + 4, cell_column + SLOT - 4, cell_top + SLOT - 4)).load()
            diff = sum(abs(p - q) for y in range(0, SLOT - 8, 3) for x in range(0, SLOT - 8, 3) for p, q in zip(a[x, y], b[x, y]))
            samples = ((SLOT - 8 + 2) // 3) ** 2
            if diff / samples > 18:
                return False
            compared += 1
    return compared >= 2


def icon_from_captures(captures, index, target):
    """Guarda el slot del objeto «index» tal como se ve en el juego (sin resaltar si es posible).
    Si el tooltip lo tapa en su captura, usa una vecina con el mismo scroll."""
    hovered = grid(captures[index])
    slot = hovered_slot(hovered)
    if slot is None:
        return False
    best = None
    for other in [index + offset for offset in (-1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8)]:
        if 0 <= other < len(captures) and slot_state(grid(captures[other]), *slot) == "normal" and same_scroll(hovered, grid(captures[other]), slot):
            best = other
            break
    if best is None and slot_state(hovered, *slot) == "hover":
        best = index
    if best is None:
        return False
    column, top = slot
    target.parent.mkdir(parents=True, exist_ok=True)
    grid(captures[best]).crop((column, top, column + SLOT + 1, top + SLOT + 1)).save(target)
    return True


def load_kit(group, folder, catalog):
    data_dir = SOURCE / ("datos" if group == "rango" else "datos_exclusivos")
    capture_dir = SOURCE / ("capturas" if group == "rango" else "exclusivos") / folder
    details = json.loads((data_dir / f"{folder.lower()}.json").read_text(encoding="utf-8"))
    # La categoría está en kits_diosesmon.json: se busca cada objeto por nombre e id, en orden.
    pending = list(catalog["items"])
    items = []
    for entry in details["items"]:
        match = next((item for item in pending if item["id"] == entry["id"] and item["nombre"] == entry["nombre"]), None)
        match = match or next((item for item in pending if item["id"] == entry["id"]), None)
        match = match or next((item for item in catalog["items"] if item["id"] == entry["id"]), None)
        if match in pending:
            pending.remove(match)
        category = CATEGORY_ALIASES.get((match or {}).get("categoria", "Especial"), (match or {}).get("categoria", "Especial"))
        items.append({
            "name": entry["nombre"], "id": entry["id"], "qty": entry.get("cantidad") or 1, "category": category,
            "enchantments": entry.get("encantamientos") or [],
            "attributes": entry.get("atributos") or [],
            "lore": [line for line in entry.get("lore") or [] if line.strip()],
            "capture": capture_dir / entry["archivo"],
        })
    # El juego reparte algunos objetos en varios stacks (2× 16 Perlas de ender): se juntan en uno.
    merged = []
    for item in items:
        twin = next((other for other in merged if other["id"] == item["id"] and other["name"] == item["name"]
                     and other["enchantments"] == item["enchantments"] and other["lore"] == item["lore"]), None)
        if twin:
            twin["qty"] += item["qty"]
        else:
            merged.append(item)
    for item in merged:
        if item["name"].startswith("Arco") or item["id"].endswith("_bow"):
            item["category"] = "Armas"
    return details, merged, capture_dir


def main():
    catalog = json.loads((SOURCE / "kits_diosesmon.json").read_text(encoding="utf-8"))
    groups = []
    for group, kits, entries in (("rango", RANKS, catalog["kits_rango"]), ("exclusivo", EXCLUSIVES, catalog["kits_exclusivos"])):
        for meta, entry in zip(kits, entries):
            details, items, capture_dir = load_kit(group, meta["folder"], entry)
            groups.append((group, meta, entry, details, items, capture_dir))

    # Iconos: primero texturas del juego; lo que no tenga, recorte de la captura.
    icons = download_icons({item["id"] for *_, items, _ in groups for item in items if item["id"].split(":")[0] in ("minecraft", "cobblemon")}
                           | {f"minecraft:diamond_{part}" for part in FALLBACK_PARTS})
    for item_id, texture in MINECRAFT_BLOCK_ICONS.items():
        target = ROOT / "assets" / "img" / "items" / "minecraft" / f"{item_id.split(':')[1]}.png"
        if not target.exists():
            target.write_bytes(urllib.request.urlopen(f"{MINECRAFT_TEXTURES}/{texture}.png", timeout=30).read())
        icons[item_id] = target.relative_to(ROOT).as_posix()
    for item_id, url in EXTERNAL_ICONS.items():
        target = ITEMS_IMG / f"{item_id.replace(':', '_')}_fallback.png"
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(urllib.request.urlopen(url, timeout=30).read())
    missing = []
    kits_out = []
    for group, meta, entry, details, items, capture_dir in groups:
        captures = sorted(capture_dir.glob("*_item.png"))
        by_file = {path.name: position for position, path in enumerate(captures)}
        for item in items:
            icon = icons.get(item["id"])
            if not icon:
                target = ITEMS_IMG / f"{item['id'].replace(':', '_')}.png"
                if not target.exists():
                    position = by_file.get(item["capture"].name)
                    if position is None or not icon_from_captures(captures, position, target):
                        # Si ninguna captura deja ver el slot, icono de Minecraft equivalente.
                        fallback = next((icons.get(f"minecraft:diamond_{part}") for part in FALLBACK_PARTS if item["id"].endswith(part)), None)
                        if item["id"] in EXTERNAL_ICONS:
                            fallback = (ITEMS_IMG / f"{item['id'].replace(':', '_')}_fallback.png").relative_to(ROOT).as_posix()
                        missing.append(f"{meta['name']}: {item['name']}")
                        item["icon"] = fallback
                        target = None
                icon = target.relative_to(ROOT).as_posix() if target else item.get("icon")
                item["slotIcon"] = bool(target)
            item["icon"] = icon
            del item["capture"]
        # Skin del kit: figura de la pantalla del kit (primera captura).
        KITS_IMG.mkdir(parents=True, exist_ok=True)
        skin = KITS_IMG / f"{meta['key']}.png"
        if captures:
            Image.open(captures[0]).convert("RGB").crop(SKIN_BOX).save(skin)
        items.sort(key=lambda item: CATEGORIES.index(item["category"]) if item["category"] in CATEGORIES else len(CATEGORIES))
        kit = {
            "key": meta["key"], "group": group, "name": meta["name"], "color": meta["color"],
            "skin": skin.relative_to(ROOT).as_posix(), "items": items,
        }
        if group == "rango":
            kit["perks"] = meta["perks"]
            if meta.get("coins"):
                kit["coins"] = meta["coins"]
            if meta.get("store"):
                kit["store"] = meta["store"]
        else:
            kit["price"] = entry.get("precio")
            kit["specialty"] = meta["specialty"]
            kit["perks"] = entry.get("ventajas") or []
            kit["setBonus"] = True
        kits_out.append(kit)

    lines = ["// Generado por build_kits_data.py desde las capturas del servidor (extra/). No editar a mano."]
    lines.append(f"window.DIOSESMON_KITS = {json.dumps(kits_out, ensure_ascii=False, separators=(',', ':'))};")
    ranks = {"columns": RANK_COLUMNS, "limits": RANK_LIMITS, "commands": RANK_COMMANDS}
    lines.append(f"window.DIOSESMON_RANKS = {json.dumps(ranks, ensure_ascii=False, separators=(',', ':'))};")
    (ROOT / "data" / "kits-data.js").write_text("\n".join(lines) + "\n", encoding="utf-8")
    total = sum(len(kit["items"]) for kit in kits_out)
    print(f"{len(kits_out)} kits, {total} objetos; sin icono: {missing}")


if __name__ == "__main__":
    main()
