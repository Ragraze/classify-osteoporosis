from functools import lru_cache
from pathlib import Path
import warnings

from PIL import Image


LABELS = ("normal", "osteoporosis")
EXTENSIONS = {".png", ".jpg", ".jpeg"}


@lru_cache(maxsize=2048)
def image_metadata(path, size, modified):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(path) as image:
                if image.format not in ("PNG", "JPEG"):
                    return None
                metadata = {"width": image.width, "height": image.height, "format": image.format}
                image.verify()
                return metadata
    except (OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        return None


def find_image(root, label, filename):
    if label not in LABELS or Path(filename).name != filename or Path(filename).suffix.lower() not in EXTENSIONS:
        return None
    directory = Path(root) / label
    if directory.is_symlink():
        return None
    path = directory / filename
    if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(directory.resolve()):
        return None
    return path


def catalog(root, label):
    directory = Path(root) / label
    items = []
    unreadable = 0
    if directory.is_dir():
        for path in sorted(directory.iterdir(), key=lambda item: item.name.casefold()):
            if find_image(root, label, path.name) is None:
                continue
            stat = path.stat()
            metadata = image_metadata(str(path), stat.st_size, stat.st_mtime_ns)
            if metadata is None:
                unreadable += 1
            else:
                items.append({"filename": path.name, **metadata})
    return items, unreadable
