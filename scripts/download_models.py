"""Retrieve repository LFS weights without requiring the git-lfs executable."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
VARIANTS = ("nano", "small", "medium", "large", "xlarge")


def download(variant):
    pointer = ROOT / "research" / f"train-{variant}" / "weights" / "best.pt"
    if pointer.stat().st_size > 1024:
        print(f"{variant}: bobot Git LFS sudah tersedia.")
        return
    lines = dict(line.split(" ", 1) for line in pointer.read_text().splitlines())
    oid = lines["oid"].removeprefix("sha256:")
    size = int(lines["size"])
    target = ROOT / ".models" / f"{variant}.pt"
    target.parent.mkdir(exist_ok=True)
    if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == oid:
        print(f"{variant}: checksum bobot lokal valid.")
        return
    payload = json.dumps(
        {
            "operation": "download",
            "transfers": ["basic"],
            "objects": [{"oid": oid, "size": size}],
        }
    ).encode()
    request = Request(
        "https://github.com/Ragraze/classify-osteoporosis.git/info/lfs/objects/batch",
        data=payload,
        headers={
            "Content-Type": "application/vnd.git-lfs+json",
            "Accept": "application/vnd.git-lfs+json",
        },
    )
    with urlopen(request, timeout=60) as response:
        item = json.load(response)["objects"][0]
    if "error" in item:
        raise RuntimeError(item["error"].get("message", "Git LFS menolak unduhan."))
    action = item["actions"]["download"]
    partial = target.with_suffix(".partial")
    digest = hashlib.sha256()
    received = 0
    try:
        with urlopen(
            Request(action["href"], headers=action.get("header", {})), timeout=120
        ) as response, partial.open("wb") as stream:
            while chunk := response.read(1024 * 1024):
                received += len(chunk)
                if received > size:
                    raise RuntimeError(
                        "Ukuran unduhan melebihi ukuran pointer Git LFS."
                    )
                digest.update(chunk)
                stream.write(chunk)
        if received != size or digest.hexdigest() != oid:
            raise RuntimeError(
                "Ukuran atau checksum unduhan tidak cocok dengan pointer Git LFS."
            )
        os.replace(partial, target)
    finally:
        partial.unlink(missing_ok=True)
    print(f"{variant}: {received / 1024 / 1024:.1f} MB, SHA-256 terverifikasi.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", choices=(*VARIANTS, "all"), default="nano")
    args = parser.parse_args()
    try:
        for variant in VARIANTS if args.model == "all" else (args.model,):
            download(variant)
    except Exception as error:
        print(f"Unduhan gagal: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
