"""Decoraciones de Halloween en 3D para la página del evento.

Lee el .jar del mod de Diosesmon (diosesmon-client) y saca de cada bloque halloween_*:
- su modelo (JSON de bloque de Minecraft / Blockbench) ya resuelto → assets/models3d/halloween/<id>.json
- sus texturas → assets/img/halloween3d/tex/<nombre>.png
- su nombre en español → data/halloween-decor.js (índice ligero; los modelos se cargan al abrir la vista 3D)
Las miniaturas (assets/img/halloween3d/<id>.png) las genera tools/render_halloween3d.js con el mismo visor de la web.

Uso: python -I tools/build_halloween3d.py [ruta/al/diosesmon-x.y.z.jar]
"""
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODS = Path.home() / "curseforge/minecraft/Instances/Diosesmon Oficial - Lite/mods"
NS = "diosesmon-client"
OUT_MODELS = ROOT / "assets" / "models3d" / "halloween"
OUT_TEX = ROOT / "assets" / "img" / "halloween3d" / "tex"
OUT_INDEX = ROOT / "data" / "halloween-decor.js"


def find_jar():
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    jars = sorted(MODS.glob("diosesmon-*.jar"), key=lambda p: [int(n) for n in re.findall(r"\d+", p.stem)])
    jars = [jar for jar in jars if re.fullmatch(r"diosesmon-\d+(\.\d+)*", jar.stem)]
    if not jars:
        sys.exit(f"No encuentro diosesmon-*.jar en {MODS}")
    return jars[-1]


def resource(ref, kind):
    """«diosesmon-client:block/x» → ruta dentro del .jar."""
    namespace, _, path = ref.partition(":") if ":" in ref else ("minecraft", "", ref)
    return f"assets/{namespace}/{kind}/{path}"


def round_all(value):
    if isinstance(value, float):
        return round(value, 3) if value != int(value) else int(value)
    if isinstance(value, list):
        return [round_all(item) for item in value]
    if isinstance(value, dict):
        return {key: round_all(item) for key, item in value.items()}
    return value


def main():
    jar_path = find_jar()
    jar = zipfile.ZipFile(jar_path)
    names = set(jar.namelist())
    read = lambda path: json.loads(jar.read(path).decode("utf-8"))
    lang = read(f"assets/{NS}/lang/es_es.json")

    def load_model(ref):
        model = read(resource(ref, "models") + ".json")
        if "parent" in model and model["parent"].startswith(NS):
            base = load_model(model["parent"])
            textures = {**base.get("textures", {}), **model.get("textures", {})}
            model = {**base, **model, "textures": textures}
            if "elements" not in model and "elements" in base:
                model["elements"] = base["elements"]
        return model

    OUT_MODELS.mkdir(parents=True, exist_ok=True)
    OUT_TEX.mkdir(parents=True, exist_ok=True)
    index = []
    states = sorted(name for name in names if re.fullmatch(rf"assets/{NS}/blockstates/halloween_[a-z0-9_]+\.json", name))
    for state_path in states:
        block_id = Path(state_path).stem
        state = read(state_path)
        # El modelo de verdad es el de la orientación norte; las demás piezas usan un modelo vacío.
        entries = state.get("multipart") or [{"apply": value} for value in (state.get("variants") or {}).values()]
        refs = []
        for entry in entries:
            applies = entry["apply"] if isinstance(entry["apply"], list) else [entry["apply"]]
            for apply in applies:
                when = entry.get("when", {})
                if apply.get("y", 0) == 0 and not apply["model"].endswith("_empty") and when.get("facing", "north") == "north":
                    refs.append(apply["model"])
        if not refs:
            continue
        model = load_model(refs[0])
        if not model.get("elements"):
            continue
        # Texturas: se resuelven las referencias «#clave» y se copian los PNG.
        textures = dict(model.get("textures", {}))
        for _ in range(5):
            textures = {key: textures.get(value[1:], value) if isinstance(value, str) and value.startswith("#") else value for key, value in textures.items()}
        tex_out = {}
        for key, ref in textures.items():
            if key == "particle" or not isinstance(ref, str) or ref.startswith("#"):
                continue
            png = resource(ref, "textures") + ".png"
            if png not in names:
                continue
            target = OUT_TEX / f"{Path(ref).name}.png"
            target.write_bytes(jar.read(png))
            tex_out[key] = target.relative_to(ROOT).as_posix()
        size = model.get("texture_size", [16, 16])
        elements = []
        for element in model["elements"]:
            faces = {}
            for side, face in (element.get("faces") or {}).items():
                key = (face.get("texture") or "").lstrip("#")
                if key not in tex_out:
                    continue
                item = {"t": key}
                if "uv" in face:
                    # Los UV de Blockbench van en unidades de texture_size: se pasan a 0-16.
                    u1, v1, u2, v2 = face["uv"]
                    item["uv"] = [u1 * 16 / size[0], v1 * 16 / size[1], u2 * 16 / size[0], v2 * 16 / size[1]]
                if face.get("rotation"):
                    item["r"] = face["rotation"]
                faces[side] = item
            if not faces:
                continue
            row = {"f": element["from"], "to": element["to"], "faces": faces}
            if element.get("rotation") and element["rotation"].get("angle"):
                rotation = element["rotation"]
                row["rot"] = {"o": rotation.get("origin", [8, 8, 8]), "a": rotation["axis"], "d": rotation["angle"]}
            elements.append(row)
        if not elements:
            continue
        (OUT_MODELS / f"{block_id}.json").write_text(
            json.dumps(round_all({"textures": tex_out, "elements": elements}), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        name = lang.get(f"block.{NS}.{block_id}") or block_id.replace("halloween_", "").replace("_", " ").capitalize()
        index.append({"id": block_id, "name": name})
    index.sort(key=lambda item: item["name"])
    OUT_INDEX.write_text(
        f"// Generado por tools/build_halloween3d.py desde {jar_path.name}. No editar a mano.\n"
        "// Decoraciones de Halloween: id del bloque y nombre en español. Modelo: assets/models3d/halloween/<id>.json;\n"
        "// miniatura: assets/img/halloween3d/<id>.png.\n"
        f"window.HALLOWEEN_DECOR = {json.dumps(index, ensure_ascii=False)};\n", encoding="utf-8")
    total = sum(path.stat().st_size for path in OUT_MODELS.glob("*.json"))
    print(f"{len(index)} decoraciones desde {jar_path.name}; modelos {total // 1024} KB")


if __name__ == "__main__":
    main()
