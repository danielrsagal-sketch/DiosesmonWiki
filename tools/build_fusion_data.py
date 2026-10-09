import csv
import io
import json
import posixpath
import re
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parent.parent
WORKBOOK = ROOT / "tools" / "source" / "FUSIONES DIOSESMON.xlsx"
IMAGES = ROOT / "assets" / "img" / "fusiones"
OUTPUT = ROOT / "data" / "fusion-data.js"

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": MAIN_NS, "r": REL_NS, "p": PKG_REL_NS}

STAT_COLUMNS = {
    "G": "hp",
    "H": "attack",
    "I": "defense",
    "J": "specialAttack",
    "K": "specialDefense",
    "L": "speed",
}

# The workbook spells this sheet "Genstoise"; the supplied artwork is "Gentoise".
ALIASES = {"genstoise": "gentoise"}
SHINY_AVAILABLE = {
    "feralimuk",
    "aerotales",
    "steelizard",
    "gentoise",
    "laprasian",
    "golenium",
    "arcarados",
}
POKEDEX_CSV = "https://raw.githubusercontent.com/veekun/pokedex/master/pokedex/data/csv/"


def normalized_name(value):
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def read_cell(cell, shared_strings):
    inline = cell.find("m:is", NS)
    if inline is not None:
        return "".join(text.text or "" for text in inline.findall(".//m:t", NS))

    value = cell.find("m:v", NS)
    if value is None or value.text is None:
        return ""

    raw = value.text
    if cell.attrib.get("t") == "s":
        return shared_strings[int(raw)]
    if cell.attrib.get("t") == "str":
        return raw
    try:
        number = float(raw)
        return int(number) if number.is_integer() else number
    except ValueError:
        return raw


def read_rows(archive, path, shared_strings):
    root = ElementTree.fromstring(archive.read(path))
    rows = []
    for row in root.findall(".//m:sheetData/m:row", NS):
        values = {}
        for cell in row.findall("m:c", NS):
            column = re.match(r"[A-Z]+", cell.attrib["r"]).group()
            values[column] = read_cell(cell, shared_strings)
        rows.append(values)
    return rows


def sheet_path(target):
    target = target.lstrip("/")
    if target.startswith("xl/"):
        return target
    return posixpath.normpath(posixpath.join("xl", target))


def fetch_csv(filename):
    request = urllib.request.Request(
        POKEDEX_CSV + filename,
        headers={"User-Agent": "Fusiondex-data-builder/1.0"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return list(csv.DictReader(io.StringIO(response.read().decode("utf-8"))))


def spanish_names(kind, source_names):
    try:
        collection = "abilities" if kind == "ability" else f"{kind}s"
        identifiers = fetch_csv(f"{collection}.csv")
        names = fetch_csv(f"{kind}_names.csv")
    except (OSError, urllib.error.URLError, TimeoutError) as error:
        print(f"Aviso: no se pudieron descargar traducciones; se conserva el Excel ({error}).")
        return {}

    wanted = {normalized_name(name) for name in source_names}
    identifier_by_id = {
        row["id"]: row["identifier"]
        for row in identifiers
        if normalized_name(row["identifier"]) in wanted
    }
    return {
        normalized_name(identifier_by_id[row["{0}_id".format(kind)] ]): row["name"]
        for row in names
        if row["local_language_id"] == "7"
        and row["{0}_id".format(kind)] in identifier_by_id
    }


def main():
    with zipfile.ZipFile(WORKBOOK) as archive:
        workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
        relationships = ElementTree.fromstring(
            archive.read("xl/_rels/workbook.xml.rels")
        )
        targets = {
            relation.attrib["Id"]: relation.attrib["Target"]
            for relation in relationships.findall("p:Relationship", NS)
        }
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(text.text or "" for text in item.findall(".//m:t", NS))
                for item in strings.findall("m:si", NS)
            ]

        sheets = workbook.find("m:sheets", NS)
        sheet_rows = {
            sheet.attrib["name"]: read_rows(
                archive,
                sheet_path(targets[sheet.attrib[f"{{{REL_NS}}}id"]]),
                shared_strings,
            )
            for sheet in sheets
        }

    image_names = {
        normalized_name(path.stem): path.name
        for path in IMAGES.glob("*.png")
    }
    summary = sheet_rows["Resumen"]
    fusions = []

    for row in summary[1:]:
        name = row.get("A", "")
        if not name:
            continue

        key = normalized_name(name)
        canonical_key = ALIASES.get(key, key)
        image_name = image_names.get(canonical_key)
        if image_name is None:
            raise ValueError(f"No se encontró un PNG para {name!r}")
        canonical_name = Path(image_name).stem.title()

        stats = {
            field: row.get(column, 0)
            for column, field in STAT_COLUMNS.items()
        }
        fusion = {
            "name": canonical_name,
            "number": row.get("B", 0),
            "types": [part.strip() for part in row.get("C", "").split("/")],
            "abilities": [part.strip() for part in row.get("D", "").split(",")],
            "height": row.get("E", 0),
            "weight": row.get("F", 0),
            "stats": stats,
            "total": sum(stats.values()),
            "image": f"assets/img/fusiones/{image_name}",
            "shinyAvailable": canonical_key in SHINY_AVAILABLE,
            "movesByLevel": [],
            "movesByTm": [],
        }

        matching_sheet = next(
            (
                rows
                for sheet_name, rows in sheet_rows.items()
                if sheet_name != "Resumen"
                and ALIASES.get(normalized_name(sheet_name), normalized_name(sheet_name))
                == canonical_key
            ),
            [],
        )
        section = None
        for move_row in matching_sheet:
            first = move_row.get("A", "")
            second = move_row.get("B", "")
            if first == "Nivel" and second == "Movimiento":
                section = "level"
            elif first == "MT" and second == "Movimiento":
                section = "tm"
            elif not first and not second:
                section = None
            elif section == "level" and isinstance(first, (int, float)) and second:
                fusion["movesByLevel"].append({"level": first, "name": second})
            elif section == "tm" and first == "MT" and second:
                fusion["movesByTm"].append(second)

        fusions.append(fusion)

    fusions.sort(key=lambda fusion: fusion["number"])
    move_names = {
        move["name"]
        for fusion in fusions
        for move in fusion["movesByLevel"]
    } | {
        move
        for fusion in fusions
        for move in fusion["movesByTm"]
    }
    ability_names = {
        ability
        for fusion in fusions
        for ability in fusion["abilities"]
    }
    localized_moves = spanish_names("move", move_names)
    localized_abilities = spanish_names("ability", ability_names)
    for fusion in fusions:
        fusion["abilities"] = [
            localized_abilities.get(normalized_name(ability), ability)
            for ability in fusion["abilities"]
        ]
        fusion["movesByLevel"] = [
            {
                **move,
                "name": localized_moves.get(normalized_name(move["name"]), move["name"]),
            }
            for move in fusion["movesByLevel"]
        ]
        fusion["movesByTm"] = [
            localized_moves.get(normalized_name(move), move)
            for move in fusion["movesByTm"]
        ]

    OUTPUT.write_text(
        "window.FUSIONDEX_DATA = "
        + json.dumps(fusions, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"Generadas {len(fusions)} fusiones en {OUTPUT.name}")
    for fusion in fusions:
        print(
            f"{fusion['name']}: {len(fusion['movesByLevel'])} movimientos por nivel, "
            f"{len(fusion['movesByTm'])} por MT"
        )


if __name__ == "__main__":
    main()