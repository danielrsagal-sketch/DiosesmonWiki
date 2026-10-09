"""Genera las teselas del mapa de la Zona Safari para el visor con zoom (safari.html).

Entrada: tools/source/ZonaSafari/<i>_<j>_x<X>_z<Z>.png, 16 imágenes de 1024×1024 (1 píxel = 1 bloque)
que cubren X y Z de -2048 a 2048.
Salida: assets/img/safari/<zoom>/<columna>_<fila>.webp en teselas de 256 px. El zoom 4 es la
resolución original (1 bloque por píxel); los zooms 0-3 son reducciones.
"""
from pathlib import Path
import re
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools" / "source" / "ZonaSafari"
OUTPUT = ROOT / "assets" / "img" / "safari"
SIZE = 4096
TILE = 256
MAX_ZOOM = 4  # 4096 / 256 = 16 = 2^4


def stitch():
    full = Image.new("RGB", (SIZE, SIZE))
    for path in SOURCE.glob("*.png"):
        match = re.match(r"(\d+)_(\d+)_", path.name)
        if not match:
            continue
        column, row = map(int, match.groups())
        full.paste(Image.open(path).convert("RGB"), (column * 1024, row * 1024))
    return full


def main():
    full = stitch()
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    total = 0
    for zoom in range(MAX_ZOOM + 1):
        side = TILE * 2 ** zoom
        level = full if side == SIZE else full.resize((side, side), Image.LANCZOS)
        folder = OUTPUT / str(zoom)
        folder.mkdir(parents=True)
        for column in range(2 ** zoom):
            for row in range(2 ** zoom):
                tile = level.crop((column * TILE, row * TILE, (column + 1) * TILE, (row + 1) * TILE))
                tile.save(folder / f"{column}_{row}.webp", "WEBP", quality=90, method=6)
                total += 1
    level_preview = full.resize((512, 512), Image.LANCZOS)
    level_preview.save(OUTPUT / "preview.webp", "WEBP", quality=85)
    size = sum(path.stat().st_size for path in OUTPUT.rglob("*.webp"))
    print(f"{total} teselas en {OUTPUT.relative_to(ROOT)} ({size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
