"""Processes generated codex art into app-ready WebP files.

Reads every tmp/imagegen_raw/codex/<kind>-<slug>.png, centre-crops it to the
kind's ratio (5:7 portrait, or 16:9 for places), resizes it, compresses it to
WebP under 300 KB in public/assets/codex/, and prints the lines to paste into
src/data/codexGallery.ts.

    python scripts/process-codex-assets.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "tmp" / "imagegen_raw" / "codex"
OUT = ROOT / "public" / "assets" / "codex"
KINDS = {"npc", "place", "faction", "creature", "lore"}
MAX_BYTES = 300_000


def center_crop(im: Image.Image, target_ratio: float) -> Image.Image:
    width, height = im.size
    if width / height > target_ratio:
        target_width = round(height * target_ratio)
        left = (width - target_width) // 2
        return im.crop((left, 0, left + target_width, height))
    target_height = round(width / target_ratio)
    top = (height - target_height) // 2
    return im.crop((0, top, width, top + target_height))


def process(source: Path) -> tuple[str, str, int, int]:
    kind = source.stem.split("-", 1)[0]
    if kind not in KINDS or "-" not in source.stem:
        raise SystemExit(f"{source.name}: name it <kind>-<slug>.png with kind in {sorted(KINDS)}")
    size = (1600, 900) if kind == "place" else (1000, 1400)
    image = center_crop(Image.open(source).convert("RGB"), size[0] / size[1])
    image = image.resize(size, Image.Resampling.LANCZOS)
    destination = OUT / f"{source.stem}.webp"
    for quality in range(92, 49, -2):
        image.save(destination, "WEBP", quality=quality, method=6)
        if destination.stat().st_size < MAX_BYTES:
            return kind, source.stem, quality, destination.stat().st_size
    raise SystemExit(f"Could not compress {source.name} below {MAX_BYTES} bytes")


def label(stem: str) -> str:
    return stem.split("-", 1)[1].replace("-", " ").title()


OUT.mkdir(parents=True, exist_ok=True)
sources = sorted(RAW.glob("*.png"))
if not sources:
    raise SystemExit(f"No PNG files in {RAW}")
lines = []
for path in sources:
    kind, stem, quality, size = process(path)
    print(f"{stem}.webp: q={quality}, {size} bytes")
    lines.append(f"  {{ path: 'assets/codex/{stem}.webp', kind: '{kind}', label: '{label(stem)}' }},")
print("\nPaste into CODEX_GALLERY in src/data/codexGallery.ts:\n")
print("\n".join(lines))
