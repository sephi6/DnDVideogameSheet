# LEGACY, one-off script: its source paths are hard-coded to local files on one machine,
# and it quantizes to the old Persona palette. Do not run it on new art; use the Pillow
# snippet in docs/ASSET_PROMPTS.md instead.
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageFilter


SOURCES = {
    "barbarian": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-6cc16c9f-0ad1-40e0-b1f6-50b30d1393a1.png"),
    "bard": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-149ddf27-ed8d-4b84-84f4-e36ac8b19e25.png"),
    "cleric": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-1dc3429b-c64a-4846-a946-01065ee828ca.png"),
    "druid": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-56f490aa-28b4-4f45-a673-08b7fc18ae75.png"),
    "fighter": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-e95b950a-f76b-40d6-9c44-6d176eb46654.png"),
    "monk": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-49d1e5f9-5750-4f3a-b422-871d907c2b08.png"),
    "paladin": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-d0e2c444-8c4c-4bc1-86c9-42ad25f0cd9b.png"),
    "ranger": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-4ce9074e-0569-49e3-8447-1e7f6647cb79.png"),
    "rogue": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-e62a9cbb-8f75-4537-aa05-60b30ecee003.png"),
    "sorcerer": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-17521b94-3829-456d-ad51-075e4ddeb2e3.png"),
    "warlock": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-fcecb510-f417-44fe-b531-04ba35387ef1.png"),
    "wizard": Path(r"C:\Users\V2\.codex\generated_images\01a13bdc-16ea-7fe2-ab8d-b02914d57c6c\exec-f29e4250-ea93-447d-a9e4-1a0f4b0eae5c.png"),
}

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "public" / "assets" / "portraits"
OUTPUT_SIZE = (1000, 1400)
MAX_BYTES = 300_000

ACCENTS = {
    "barbarian": "#E03A2F",
    "bard": "#D8478F",
    "cleric": "#E8C15A",
    "druid": "#4FAE62",
    "fighter": "#B9411F",
    "monk": "#37B6C4",
    "paladin": "#DCAE3C",
    "ranger": "#3F8F6D",
    "rogue": "#6F7CD1",
    "sorcerer": "#E2593F",
    "warlock": "#8B46D6",
    "wizard": "#3F7BD6",
}


def crop_to_ratio(image: Image.Image, width: int, height: int) -> Image.Image:
    target_ratio = width / height
    source_ratio = image.width / image.height
    if abs(source_ratio - target_ratio) < 1e-9:
        return image
    if source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        return image.crop((left, 0, left + crop_width, image.height))
    crop_height = round(image.width / target_ratio)
    top = (image.height - crop_height) // 2
    return image.crop((0, top, image.width, top + crop_height))


def rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def exact_palette(accent: str) -> Image.Image:
    palette_colors = [rgb("#08070A"), rgb("#F6F1E6"), rgb("#E01133"), rgb(accent)]
    palette = Image.new("P", (1, 1))
    flat = [component for color in palette_colors for component in color]
    charcoal = list(rgb("#08070A"))
    palette.putpalette(flat + charcoal * ((768 - len(flat)) // 3))
    return palette


def save_under_limit(image: Image.Image, destination: Path, accent: str) -> tuple[int, int]:
    temp = destination.with_suffix(".tmp.png")
    palette = exact_palette(accent)
    for median_size in (1, 3, 5):
        reduced = image if median_size == 1 else image.filter(ImageFilter.MedianFilter(size=median_size))
        indexed = reduced.quantize(palette=palette, dither=Image.Dither.NONE)
        indexed.save(temp, format="PNG", optimize=True, compress_level=9)
        size = temp.stat().st_size
        if size < MAX_BYTES:
            os.replace(temp, destination)
            return median_size, size
    temp.unlink(missing_ok=True)
    raise RuntimeError(f"Could not compress {destination.name} below {MAX_BYTES} bytes")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for slug, source in SOURCES.items():
        if not source.is_file():
            raise FileNotFoundError(source)
        with Image.open(source) as original:
            image = crop_to_ratio(original.convert("RGB"), *OUTPUT_SIZE)
            image = image.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
        destination = OUTPUT_DIR / f"{slug}.png"
        median_size, size = save_under_limit(image, destination, ACCENTS[slug])
        print(
            f"{destination.name}: {image.width}x{image.height}, exact 4-color palette, "
            f"median {median_size}, {size} bytes"
        )


if __name__ == "__main__":
    main()
