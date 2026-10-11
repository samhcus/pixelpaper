"""Refresh image-collection READMEs without touching the product README.

The root README documents the Pixelpaper app and is maintained by hand. This
script only updates the small collection indexes beside their source images.
"""

from pathlib import Path

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
EXCLUDE_DIRS = {".git", ".github", "scripts", "desktop", "node_modules", "dist", "artifacts"}


def images(directory: Path) -> list[Path]:
    return sorted(path for path in directory.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)


def render(category: Path, files: list[Path]) -> str:
    rows = [f"# {category.name}", "", "[Image collection]", "", "<table>"]
    for index in range(0, len(files), 2):
        rows.append("  <tr>")
        for file in files[index:index + 2]:
            rows.append(f'    <td align="center"><img src="{file.name}" width="400"><br><sub>{file.name}</sub></td>')
        if len(files[index:index + 2]) == 1:
            rows.append("    <td></td>")
        rows.append("  </tr>")
    rows.extend(["</table>", ""])
    return "\n".join(rows)


def main() -> None:
    root = Path.cwd()
    for category in sorted(root.iterdir()):
        if not category.is_dir() or category.name in EXCLUDE_DIRS or category.name.startswith("."):
            continue
        files = images(category)
        if files:
            (category / "README.md").write_text(render(category, files), encoding="utf-8")


if __name__ == "__main__":
    main()
